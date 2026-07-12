import { db } from '../db';
import { BillStatus, LedgerType } from '@prisma/client';
import { minioClient } from '../minio';
import { emailService } from './email.service';

export interface ComputeBillInput {
  unitId: string;
  month: number;
  year: number;
  currWater: number;
  currElec: number;
}

const BUCKET_NAME = 'documents';

async function ensureBucket() {
  try {
    const exists = await minioClient.bucketExists(BUCKET_NAME);
    if (!exists) {
      await minioClient.makeBucket(BUCKET_NAME, 'us-east-1');
    }
  } catch (err) {
    console.error('[BillingService] MinIO Bucket check failed:', err);
  }
}

export const billingService = {
  async getOrCreateBillingConfig() {
    let config = await db.billingConfig.findUnique({
      where: { id: 'global' },
    });
    if (!config) {
      config = await db.billingConfig.create({
        data: {
          id: 'global',
          waterRate: 50.0,
          elecRate: 12.0,
          billingCycle: 'MONTHSARY',
          lateFeeImposed: false,
          lateFeeAmount: 0.0,
        },
      });
    }
    return config;
  },

  async updateBillingConfig(data: {
    waterRate: number;
    elecRate: number;
    billingCycle: string;
    lateFeeImposed: boolean;
    lateFeeAmount: number;
  }) {
    return db.billingConfig.upsert({
      where: { id: 'global' },
      create: {
        id: 'global',
        ...data,
      },
      update: data,
    });
  },

  // Retrieve or create policy for a specific month, inheriting from previous policies if not set
  async getOrCreateMonthlyPolicy(month: number, year: number, tx?: any) {
    const client = tx || db;
    let policy = await client.monthlyPolicy.findUnique({
      where: { month_year: { month, year } },
    });

    if (!policy) {
      // Find latest prior policy chronologically
      const prevPolicies = await client.monthlyPolicy.findMany({
        where: {
          OR: [
            { year: { lt: year } },
            { year: year, month: { lt: month } },
          ],
        },
        orderBy: [{ year: 'desc' }, { month: 'desc' }],
        take: 1,
      });

      if (prevPolicies.length > 0) {
        const prev = prevPolicies[0];
        policy = await client.monthlyPolicy.create({
          data: {
            month,
            year,
            waterRate: prev.waterRate,
            elecRate: prev.elecRate,
            billingCycle: prev.billingCycle,
            lateFeeImposed: prev.lateFeeImposed,
            lateFeeAmount: prev.lateFeeAmount,
          },
        });
      } else {
        // Fall back to global configuration
        const globalConfig = await this.getOrCreateBillingConfig();
        policy = await client.monthlyPolicy.create({
          data: {
            month,
            year,
            waterRate: globalConfig.waterRate,
            elecRate: globalConfig.elecRate,
            billingCycle: globalConfig.billingCycle,
            lateFeeImposed: globalConfig.lateFeeImposed,
            lateFeeAmount: globalConfig.lateFeeAmount,
          },
        });
      }
    }

    return policy;
  },

  async saveMonthlyPolicy(data: {
    month: number;
    year: number;
    waterRate: number;
    elecRate: number;
    billingCycle: string;
    lateFeeImposed: boolean;
    lateFeeAmount: number;
  }) {
    return db.monthlyPolicy.upsert({
      where: { month_year: { month: data.month, year: data.year } },
      create: data,
      update: {
        waterRate: data.waterRate,
        elecRate: data.elecRate,
        billingCycle: data.billingCycle,
        lateFeeImposed: data.lateFeeImposed,
        lateFeeAmount: data.lateFeeAmount,
      },
    });
  },

  async getMonthlyPolicies() {
    return db.monthlyPolicy.findMany({
      orderBy: [{ year: 'desc' }, { month: 'desc' }],
    });
  },

  async getBillPeriods() {
    return db.billPeriod.findMany({
      orderBy: [{ year: 'desc' }, { month: 'desc' }],
      include: {
        monthlyPolicy: true,
        unit: {
          include: {
            tenants: {
              where: { status: 'ACTIVE' },
            },
          },
        },
      },
    });
  },

  async computeBill(data: ComputeBillInput) {
    await ensureBucket();

    return db.$transaction(async (tx) => {
      // Resolve/Create policy for this target month
      const policy = await this.getOrCreateMonthlyPolicy(data.month, data.year, tx);

      // 1. Get Unit and current active Tenant
      const unit = await tx.unit.findUnique({
        where: { id: data.unitId },
        include: {
          tenants: {
            where: { status: 'ACTIVE' },
            take: 1,
          },
        },
      });

      if (!unit) throw new Error('Unit not found');
      const activeTenant = unit.tenants[0];
      if (!activeTenant) throw new Error('No active tenant associated with this unit');

      // 1b. Look up active Lease for agreed rate, billing cycle, advance status, and addons
      const activeLease = await tx.lease.findFirst({
        where: { unitId: data.unitId, status: 'ACTIVE' },
        include: {
          addons: { where: { isActive: true } },
        },
      });

      // Fetch the last billing period *prior* to the target period to resolve initial baseline
      const lastBillPeriod = await tx.billPeriod.findFirst({
        where: {
          unitId: data.unitId,
          OR: [
            { year: { lt: data.year } },
            { year: data.year, month: { lt: data.month } }
          ]
        },
        orderBy: [{ year: 'desc' }, { month: 'desc' }],
      });

      const prevWater = lastBillPeriod 
        ? lastBillPeriod.currWater 
        : (activeLease?.waterMeterBaseline ?? unit.waterMeter);

      const prevElec = lastBillPeriod 
        ? lastBillPeriod.currElec 
        : (activeLease?.elecMeterBaseline ?? unit.electroMeter);

      const waterDiff = data.currWater - prevWater;
      const elecDiff = data.currElec - prevElec;

      if (waterDiff < 0 || elecDiff < 0) {
        throw new Error('Current meter readings cannot be less than previous readings');
      }

      // Check Monthly Policy rates & Waivers
      const WATER_RATE = unit.waterWaived ? 0 : policy.waterRate;
      const ELEC_RATE = unit.elecWaived ? 0 : policy.elecRate;

      // Use lease-agreed rate if available, otherwise fall back to unit rate
      const agreedMonthlyRate = activeLease?.monthlyRate ?? unit.monthlyRate;
      const leaseBillingCycle = activeLease?.billingCycle ?? policy.billingCycle;

      // Proration Logic (END_OF_MONTH cycle triggers proration on first month)
      let rentCharge = agreedMonthlyRate;
      let isProrated = false;
      let prorationDescription = '';

      if (leaseBillingCycle === 'END_OF_MONTH') {
        const leaseStart = new Date(activeTenant.leaseStartDate);
        const leaseYear = leaseStart.getFullYear();
        const leaseMonth = leaseStart.getMonth() + 1;

        if (leaseYear === data.year && leaseMonth === data.month) {
          const totalDaysInMonth = new Date(data.year, data.month, 0).getDate();
          const startDay = leaseStart.getDate();
          const activeDays = totalDaysInMonth - startDay + 1;

          if (activeDays < totalDaysInMonth) {
            isProrated = true;
            rentCharge = parseFloat(((agreedMonthlyRate * activeDays) / totalDaysInMonth).toFixed(2));
            prorationDescription = ` (Prorated for ${activeDays}/${totalDaysInMonth} days starting ${leaseStart.toLocaleDateString()})`;
          }
        }
      }

      // 1c. Handle advance consumption: if advance is set to be consumed,
      //     deduct from the advancePaid credit pool on the first billing period.
      const isFirstBillOfLease = !lastBillPeriod;
      let advanceAppliedThisBill = false;
      let advanceDeductionAmount = 0;

      if (activeLease && activeLease.advanceConsumed && (isFirstBillOfLease || !activeLease.advanceApplied)) {
        advanceAppliedThisBill = true;
        // Rent is charged (could be prorated), but offset by consuming the advancePaid credit pool.
        // We calculate how much of the advance matches this first billing rent charge:
        advanceDeductionAmount = rentCharge; 
        
        // Mark advance as applied on the lease
        await tx.lease.update({
          where: { id: activeLease.id },
          data: { advanceApplied: true },
        });
      }

      const waterCharge = parseFloat((waterDiff * WATER_RATE).toFixed(2));
      const elecCharge = parseFloat((elecDiff * ELEC_RATE).toFixed(2));
      
      let lateFeeCharge = 0;
      if (policy.lateFeeImposed && policy.lateFeeAmount > 0) {
        lateFeeCharge = policy.lateFeeAmount;
      }

      // Sum addon charges
      const addonCharges = (activeLease?.addons ?? []).map((a) => ({
        description: a.description,
        amount: a.amount,
      }));
      const totalAddons = addonCharges.reduce((sum, a) => sum + a.amount, 0);

      const totalDue = rentCharge + waterCharge + elecCharge + lateFeeCharge + totalAddons;

      // 2. Upsert BillPeriod record linked to MonthlyPolicy
      const existingPeriod = await tx.billPeriod.findFirst({
        where: { unitId: data.unitId, month: data.month, year: data.year },
      });

      const billPeriodData = {
        prevWater,
        currWater: data.currWater,
        prevElec,
        currElec: data.currElec,
        waterRateUsed: WATER_RATE,
        elecRateUsed: ELEC_RATE,
        lateFeeApplied: lateFeeCharge,
        isProrated,
        billingCycleType: leaseBillingCycle,
        status: BillStatus.DRAFT,
      };

      const billPeriod = existingPeriod 
        ? await tx.billPeriod.update({
            where: { id: existingPeriod.id },
            data: billPeriodData,
          })
        : await tx.billPeriod.create({
            data: {
              ...billPeriodData,
              month: data.month,
              year: data.year,
              unitId: data.unitId,
              monthlyPolicyId: policy.id,
            },
          });

      // 3. Update Unit meters
      await tx.unit.update({
        where: { id: data.unitId },
        data: {
          waterMeter: data.currWater,
          electroMeter: data.currElec,
        },
      });

      // 4. Post charges to Ledger
      if (rentCharge > 0) {
        await tx.ledger.create({
          data: {
            type: LedgerType.CHARGE,
            amount: rentCharge,
            description: `Rent - Room ${unit.roomNumber} - ${data.month}/${data.year}${prorationDescription}`,
            unitId: data.unitId,
            tenantId: activeTenant.id,
          },
        });
      }

      // If advance is consumed on this bill, post an offsetting PAYMENT/CREDIT consumption entry in the ledger
      if (advanceAppliedThisBill && advanceDeductionAmount > 0) {
        await tx.ledger.create({
          data: {
            type: LedgerType.PAYMENT,
            amount: advanceDeductionAmount,
            description: `Advance Consumed - Offset Rent for Room ${unit.roomNumber} - ${data.month}/${data.year}`,
            unitId: data.unitId,
            tenantId: activeTenant.id,
            isVerified: true,
          },
        });
      }

      if (waterCharge > 0) {
        await tx.ledger.create({
          data: {
            type: LedgerType.CHARGE,
            amount: waterCharge,
            description: `Water Utility (${waterDiff.toFixed(1)}m3 @ PHP ${WATER_RATE}/m3) - ${data.month}/${data.year}`,
            unitId: data.unitId,
            tenantId: activeTenant.id,
          },
        });
      }

      if (elecCharge > 0) {
        await tx.ledger.create({
          data: {
            type: LedgerType.CHARGE,
            amount: elecCharge,
            description: `Electricity Utility (${elecDiff.toFixed(1)}kWh @ PHP ${ELEC_RATE}/kWh) - ${data.month}/${data.year}`,
            unitId: data.unitId,
            tenantId: activeTenant.id,
          },
        });
      }

      if (lateFeeCharge > 0) {
        await tx.ledger.create({
          data: {
            type: LedgerType.CHARGE,
            amount: lateFeeCharge,
            description: `Late Fee - ${data.month}/${data.year}`,
            unitId: data.unitId,
            tenantId: activeTenant.id,
          },
        });
      }

      // 4b. Post each active LeaseAddon as a recurring charge
      for (const addon of addonCharges) {
        if (addon.amount > 0) {
          await tx.ledger.create({
            data: {
              type: LedgerType.CHARGE,
              amount: addon.amount,
              description: `${addon.description} (Add-on) - ${data.month}/${data.year}`,
              unitId: data.unitId,
              tenantId: activeTenant.id,
            },
          });
        }
      }

      // 5. Generate Statement Document
      const addonLines = addonCharges.map((a) =>
        `   ${a.description}: PHP ${a.amount.toLocaleString()}`
      ).join('\n') || '   None';

      const objectPath = `tenant-${activeTenant.id}/payments/bill-${unit.roomNumber}-${data.month}-${data.year}-${Date.now()}.txt`;
      const statementContent = `=========================================
          SUSI BILLING STATEMENT
=========================================
Unit / Room: ${unit.roomNumber}
Tenant: ${activeTenant.firstName} ${activeTenant.lastName}
Email: ${activeTenant.email}
Billing Period: ${new Date(data.year, data.month - 1).toLocaleString('en-US', { month: 'long' })} ${data.year}
Billing Cycle: ${leaseBillingCycle === 'MONTHSARY' ? 'Monthsary' : 'End of Month'}
-----------------------------------------
1. Rent: PHP ${rentCharge.toLocaleString()}${advanceAppliedThisBill ? ' (Advance applied)' : isProrated ? ' (Prorated)' : ''}
2. Water: PHP ${waterCharge.toLocaleString()} (${waterDiff.toFixed(1)}m3 @ PHP ${WATER_RATE}/m3)
3. Electricity: PHP ${elecCharge.toLocaleString()} (${elecDiff.toFixed(1)}kWh @ PHP ${ELEC_RATE}/kWh)
${lateFeeCharge > 0 ? `4. Late Fee: PHP ${lateFeeCharge.toLocaleString()}\n` : ''}
Add-on Services:
${addonLines}
-----------------------------------------
TOTAL AMOUNT DUE: PHP ${totalDue.toLocaleString()}
=========================================
Generated on: ${new Date().toLocaleString()}
System for Unit & Space Inventory (SUSI)`;

      const mockBuffer = Buffer.from(statementContent);
      let presignedUrl = '';

      try {
        await minioClient.putObject(BUCKET_NAME, objectPath, mockBuffer, mockBuffer.length, {
          'Content-Type': 'text/plain',
        });
        presignedUrl = await minioClient.presignedGetObject(BUCKET_NAME, objectPath, 24 * 60 * 60);
      } catch (err) {
        console.error('[BillingService] Failed to upload statement to MinIO:', err);
      }

      if (presignedUrl) {
        await tx.billPeriod.update({
          where: { id: billPeriod.id },
          data: { billPdfUrl: presignedUrl },
        });

        await tx.document.create({
          data: {
            type: 'BILL',
            fileUrl: presignedUrl,
            tenantId: activeTenant.id,
          },
        });

        await tx.tenantNote.create({
          data: {
            tenantId: activeTenant.id,
            type: 'SYSTEM',
            content: `Billing statement for ${data.month}/${data.year} generated. Total due: ₱${totalDue.toLocaleString()}. Addons included: ${addonCharges.length}.`,
          },
        });
      }

      // 7. Notify tenant per their channel preferences
      try {
        if (activeTenant.notifyEmail) {
          await emailService.sendBillEmail(
            activeTenant.email,
            `${activeTenant.firstName} ${activeTenant.lastName}`,
            data.month,
            data.year,
            presignedUrl,
            statementContent
          );
        }

        if (activeTenant.notifySms && activeTenant.phone) {
          console.log(
            `[BillingService][SMS-STUB] Bill notification for ${activeTenant.phone}: Total due ₱${totalDue.toLocaleString()}`
          );
        }

        if (activeTenant.notifyApp) {
          await tx.tenantNote.create({
            data: {
              tenantId: activeTenant.id,
              type: 'APP_NOTIFICATION',
              content: `Your bill for ${data.month}/${data.year} is ready. Total due: ₱${totalDue.toLocaleString()}.`,
            },
          });
        }
      } catch (err) {
        console.error('[BillingService] Notification delivery failed:', err);
      }

      return { billPeriod: { ...billPeriod, billPdfUrl: presignedUrl }, totalDue };
    });
  },
};

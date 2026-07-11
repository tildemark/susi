import { db } from '../db';
import { ledgerService } from './ledger.service';
import { BillStatus, LedgerType } from '@prisma/client';

export interface ComputeBillInput {
  unitId: string;
  month: number;
  year: number;
  currWater: number;
  currElec: number;
}

export const billingService = {
  async getBillPeriods() {
    return db.billPeriod.findMany({
      orderBy: [{ year: 'desc' }, { month: 'desc' }],
      include: {
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
    return db.$transaction(async (tx) => {
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

      const prevWater = unit.waterMeter;
      const prevElec = unit.electroMeter;

      const waterDiff = data.currWater - prevWater;
      const elecDiff = data.currElec - prevElec;

      if (waterDiff < 0 || elecDiff < 0) {
        throw new Error('Current meter readings cannot be less than previous readings');
      }

      // Hardcoded rates: Water at ₱50 per m³, Electricity at ₱12 per kWh
      const WATER_RATE = 50;
      const ELEC_RATE = 12;

      const rentCharge = unit.monthlyRate;
      const waterCharge = waterDiff * WATER_RATE;
      const elecCharge = elecDiff * ELEC_RATE;
      const totalDue = rentCharge + waterCharge + elecCharge;

      // 2. Create BillPeriod record
      const billPeriod = await tx.billPeriod.create({
        data: {
          month: data.month,
          year: data.year,
          prevWater,
          currWater: data.currWater,
          prevElec,
          currElec: data.currElec,
          status: BillStatus.DRAFT,
          unitId: data.unitId,
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
      await tx.ledger.create({
        data: {
          type: LedgerType.CHARGE,
          amount: rentCharge,
          description: `Rent Charge for room ${unit.roomNumber} - Period ${data.month}/${data.year}`,
          unitId: data.unitId,
          tenantId: activeTenant.id,
        },
      });

      await tx.ledger.create({
        data: {
          type: LedgerType.CHARGE,
          amount: waterCharge,
          description: `Water Utility Charge (${waterDiff}m³ @ ₱${WATER_RATE}/m³) - Period ${data.month}/${data.year}`,
          unitId: data.unitId,
          tenantId: activeTenant.id,
        },
      });

      await tx.ledger.create({
        data: {
          type: LedgerType.CHARGE,
          amount: elecCharge,
          description: `Electricity Utility Charge (${elecDiff}kWh @ ₱${ELEC_RATE}/kWh) - Period ${data.month}/${data.year}`,
          unitId: data.unitId,
          tenantId: activeTenant.id,
        },
      });

      return { billPeriod, totalDue };
    });
  },
};

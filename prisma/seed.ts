import { UnitStatus, LedgerType } from '@prisma/client';
import { db } from '../src/lib/db';

export async function seedDatabase() {
  // 1. Clean existing records in sequence (to satisfy FK constraints)
  await db.tenantNote.deleteMany({});
  await db.tenantViolation.deleteMany({});
  await db.ledger.deleteMany({});
  await db.leaseDocument.deleteMany({});
  await db.paymentSubmission.deleteMany({});
  await db.billPeriod.deleteMany({});
  await db.monthlyPolicy.deleteMany({});
  await db.maintenanceRequest.deleteMany({});
  await db.document.deleteMany({});
  await db.lease.deleteMany({});
  await db.tenant.deleteMany({});
  await db.unit.deleteMany({});
  await db.billingConfig.deleteMany({});

  // 2. Set up global config
  await db.billingConfig.create({
    data: {
      id: 'global',
      waterRate: 50.0,
      elecRate: 12.0,
      billingCycle: 'MONTHSARY',
      lateFeeImposed: true,
      lateFeeAmount: 250.0,
      landlordEmail: 'landlord@susi.com',
      landlordName: 'SUSI Landlord',
    },
  });

  // 3. Seed inventory space (Units)
  const room101 = await db.unit.create({
    data: {
      roomNumber: '101',
      monthlyRate: 5000,
      status: UnitStatus.OCCUPIED,
      waterMeter: 0,
      electroMeter: 0,
    },
  });

  const room102 = await db.unit.create({
    data: {
      roomNumber: '102',
      monthlyRate: 5500,
      status: UnitStatus.OCCUPIED,
      waterMeter: 120,
      electroMeter: 1450,
    },
  });

  const room201 = await db.unit.create({
    data: {
      roomNumber: '201',
      monthlyRate: 6000,
      status: UnitStatus.VACANT,
      waterMeter: 0,
      electroMeter: 0,
    },
  });

  const room202 = await db.unit.create({
    data: {
      roomNumber: '202',
      monthlyRate: 6500,
      status: UnitStatus.MAINTENANCE,
      waterMeter: 55,
      electroMeter: 940,
    },
  });

  // 4. Seed active tenants
  const tenant1 = await db.tenant.create({
    data: {
      firstName: 'Alfredo',
      lastName: 'Sanchez Jr',
      email: 'tildemark@gmail.com',
      phone: '09171234567',
      status: 'ACTIVE',
      leaseStartDate: new Date('2026-07-01'),
      unitId: room101.id,
    },
  });

  const tenant2 = await db.tenant.create({
    data: {
      firstName: 'Beatriz',
      lastName: 'Del Prado',
      email: 'beatriz@example.com',
      phone: '09187654321',
      status: 'ACTIVE',
      leaseStartDate: new Date('2026-06-15'),
      unitId: room102.id,
    },
  });

  // 5. Seed active Leases matching move-in baselines
  const lease1 = await db.lease.create({
    data: {
      tenantId: tenant1.id,
      unitId: room101.id,
      monthlyRate: 5000,
      securityDeposit: 10000,
      advancePaid: 5000,
      advanceConsumed: true,
      advanceApplied: false,
      billingCycle: 'MONTHSARY',
      leaseStartDate: new Date('2026-07-01'),
      status: 'ACTIVE',
      waterMeterBaseline: 0,
      elecMeterBaseline: 0,
    },
  });

  const lease2 = await db.lease.create({
    data: {
      tenantId: tenant2.id,
      unitId: room102.id,
      monthlyRate: 5500,
      securityDeposit: 11000,
      advancePaid: 5500,
      advanceConsumed: false,
      advanceApplied: false,
      billingCycle: 'END_OF_MONTH',
      leaseStartDate: new Date('2026-06-15'),
      status: 'ACTIVE',
      waterMeterBaseline: 120,
      elecMeterBaseline: 1450,
    },
  });

  // 6. Seed recurring addons for Room 101
  await db.leaseAddon.create({
    data: {
      leaseId: lease1.id,
      description: 'bed',
      amount: 100,
      isActive: true,
    },
  });

  // 7. Post initial Security Deposits & Advance Payments in ledger
  await db.ledger.createMany({
    data: [
      {
        type: LedgerType.CREDIT,
        amount: 10000,
        description: `Security Deposit - Lease for Room 101`,
        unitId: room101.id,
        tenantId: tenant1.id,
        isVerified: true,
      },
      {
        type: LedgerType.CREDIT,
        amount: 5000,
        description: `1-Month Advance - Applied to first billing cycle (Room 101)`,
        unitId: room101.id,
        tenantId: tenant1.id,
        isVerified: true,
      },
      {
        type: LedgerType.CREDIT,
        amount: 11000,
        description: `Security Deposit - Lease for Room 102`,
        unitId: room102.id,
        tenantId: tenant2.id,
        isVerified: true,
      },
      {
        type: LedgerType.CREDIT,
        amount: 5500,
        description: `1-Month Advance - Kept as prepayment (Room 102)`,
        unitId: room102.id,
        tenantId: tenant2.id,
        isVerified: true,
      },
    ],
  });

  // 8. Seed some system logs/notes
  await db.tenantNote.createMany({
    data: [
      {
        tenantId: tenant1.id,
        type: 'SYSTEM',
        content: 'Lease activated and Room 101 marked as occupied.',
      },
      {
        tenantId: tenant2.id,
        type: 'SYSTEM',
        content: 'Lease activated and Room 102 marked as occupied.',
      },
    ],
  });

  console.log('[Seed] Database successfully reset and populated with demo settings.');
}

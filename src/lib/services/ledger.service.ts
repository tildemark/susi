import { db } from '../db';
import { LedgerType } from '@prisma/client';

export interface CreateLedgerEntryInput {
  unitId: string;
  tenantId: string;
  type: LedgerType;
  amount: number;
  description: string;
  receiptUrl?: string | null;
  isVerified?: boolean;
}

export const ledgerService = {
  async getLedgers() {
    return db.ledger.findMany({
      orderBy: { date: 'desc' },
      include: {
        unit: true,
        tenant: true,
      },
    });
  },

  async addEntry(data: CreateLedgerEntryInput) {
    return db.ledger.create({
      data: {
        type: data.type,
        amount: data.amount,
        description: data.description,
        receiptUrl: data.receiptUrl || null,
        isVerified: data.isVerified ?? false,
        unitId: data.unitId,
        tenantId: data.tenantId,
      },
    });
  },

  async getBalance(tenantId: string) {
    const transactions = await db.ledger.findMany({
      where: { tenantId },
      select: { type: true, amount: true },
    });

    return transactions.reduce((acc, curr) => {
      if (curr.type === LedgerType.CHARGE) {
        return acc + curr.amount; // charges increase what is owed
      } else {
        return acc - curr.amount; // payments and credits reduce what is owed
      }
    }, 0);
  },

  async verifyEntry(id: string) {
    return db.ledger.update({
      where: { id },
      data: { isVerified: true },
    });
  },

  async runArrearsCheck(options?: { lateFeeAmount?: number; disableLateFees?: boolean }) {
    // 1. Fetch active tenants who are currently assigned to a unit
    const activeTenants = await db.tenant.findMany({
      where: { status: 'ACTIVE', unitId: { not: null } },
      include: { unit: true },
    });

    const now = new Date();

    for (const tenant of activeTenants) {
      if (!tenant.unitId) continue;

      // 2. Fetch all unpaid/unverified ledger charges
      const balance = await this.getBalance(tenant.id);

      if (balance <= 0) continue; // account in good standing

      // Find the oldest outstanding unpaid charge to determine arrears age
      const oldestCharge = await db.ledger.findFirst({
        where: { tenantId: tenant.id, type: LedgerType.CHARGE, isVerified: true },
        orderBy: { date: 'asc' },
      });

      if (!oldestCharge) continue;

      const timeDiff = now.getTime() - new Date(oldestCharge.date).getTime();
      const daysOutstanding = Math.floor(timeDiff / (1000 * 60 * 60 * 24));

      // Tiered Arrears Logic:
      // * 15 Days: apply late fee (customizable amount, defaults to ₱500, optional if disabled)
      if (daysOutstanding >= 15 && daysOutstanding < 30 && !options?.disableLateFees) {
        const alreadyHasLateFee = await db.ledger.findFirst({
          where: {
            tenantId: tenant.id,
            type: LedgerType.CHARGE,
            description: { startsWith: 'Late Fee' },
            date: {
              gte: new Date(now.getFullYear(), now.getMonth(), 1), // Only apply once per month
            },
          },
        });

        if (!alreadyHasLateFee) {
          const fee = options?.lateFeeAmount !== undefined ? options.lateFeeAmount : 500.0;
          await this.addEntry({
            unitId: tenant.unitId,
            tenantId: tenant.id,
            type: LedgerType.CHARGE,
            amount: fee,
            description: `Late Fee applied - Arrears threshold exceeded (15+ days)`,
            isVerified: true,
          });
        }
      }

      // * 30 Days: Highlight unit status
      if (daysOutstanding >= 30 && daysOutstanding < 90) {
        await db.unit.update({
          where: { id: tenant.unitId },
          data: { status: 'MAINTENANCE' }, // Highlights unit status internally as warning
        });
      }

      // * 90 Days: Triggers Eviction eligibility (unlocks eviction doc generation)
    }
  },
};

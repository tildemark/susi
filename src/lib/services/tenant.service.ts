import { db } from '../db';
import { BillingPreference, UnitStatus } from '@prisma/client';

export interface CreateTenantInput {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  billingPreference?: BillingPreference;
  notifyApp?: boolean;
  notifyEmail?: boolean;
  notifySms?: boolean;
  appAccess?: boolean;
  unitId?: string | null;
}

export interface UpdateTenantInput {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  status?: string;
  billingPreference?: BillingPreference;
  notifyApp?: boolean;
  notifyEmail?: boolean;
  notifySms?: boolean;
  appAccess?: boolean;
  unitId?: string | null;
}

export const tenantService = {
  async getTenants() {
    return db.tenant.findMany({
      orderBy: { lastName: 'asc' },
      include: {
        unit: true,
      },
    });
  },

  async getTenant(id: string) {
    return db.tenant.findUnique({
      where: { id },
      include: {
        unit: true,
        ledgers: {
          orderBy: { date: 'desc' },
        },
        documents: {
          orderBy: { createdAt: 'desc' },
        },
        maintenanceRequests: {
          orderBy: { createdAt: 'desc' },
        },
        notes: {
          orderBy: { date: 'desc' },
        },
        violations: {
          orderBy: { date: 'desc' },
        },
        leases: {
          include: {
            leaseDocuments: {
              orderBy: { createdAt: 'desc' },
            },
          },
        },
      },
    });
  },

  async createTenant(data: CreateTenantInput) {
    return db.$transaction(async (tx) => {
      const tenant = await tx.tenant.create({
        data: {
          firstName: data.firstName,
          lastName: data.lastName,
          email: data.email,
          phone: data.phone,
          billingPreference: data.billingPreference ?? BillingPreference.EMAIL,
          notifyApp: data.notifyApp ?? false,
          notifyEmail: data.notifyEmail ?? true,
          notifySms: data.notifySms ?? false,
          appAccess: data.appAccess ?? false,
          unitId: data.unitId || null,
        },
      });

      if (data.unitId) {
        await tx.unit.update({
          where: { id: data.unitId },
          data: { status: UnitStatus.OCCUPIED },
        });
      }

      return tenant;
    });
  },

  async updateTenant(id: string, data: UpdateTenantInput) {
    return db.$transaction(async (tx) => {
      const oldTenant = await tx.tenant.findUnique({
        where: { id },
        select: { unitId: true },
      });

      const updatedTenant = await tx.tenant.update({
        where: { id },
        data: {
          firstName: data.firstName,
          lastName: data.lastName,
          email: data.email,
          phone: data.phone,
          status: data.status,
          billingPreference: data.billingPreference,
          notifyApp: data.notifyApp,
          notifyEmail: data.notifyEmail,
          notifySms: data.notifySms,
          appAccess: data.appAccess,
          unitId: data.unitId === undefined ? undefined : data.unitId,
        },
      });

      // If unit changed
      if (data.unitId !== undefined && oldTenant?.unitId !== data.unitId) {
        // If unlinked from old unit
        if (oldTenant?.unitId) {
          const siblingCount = await tx.tenant.count({
            where: { unitId: oldTenant.unitId, status: 'ACTIVE' },
          });
          if (siblingCount === 0) {
            await tx.unit.update({
              where: { id: oldTenant.unitId },
              data: { status: UnitStatus.VACANT },
            });
          }
        }

        // If linked to new unit
        if (data.unitId) {
          await tx.unit.update({
            where: { id: data.unitId },
            data: { status: UnitStatus.OCCUPIED },
          });
        }
      }

      return updatedTenant;
    });
  },

  async unlinkTenant(id: string) {
    return db.$transaction(async (tx) => {
      const tenant = await tx.tenant.findUnique({
        where: { id },
        select: { unitId: true },
      });

      const updatedTenant = await tx.tenant.update({
        where: { id },
        data: { unitId: null },
      });

      if (tenant?.unitId) {
        const siblingCount = await tx.tenant.count({
          where: { unitId: tenant.unitId, id: { not: id }, status: 'ACTIVE' },
        });
        if (siblingCount === 0) {
          await tx.unit.update({
            where: { id: tenant.unitId },
            data: { status: UnitStatus.VACANT },
          });
        }
      }

      return updatedTenant;
    });
  },
};

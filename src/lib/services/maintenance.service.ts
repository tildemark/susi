import { db } from '../db';
import { MaintenanceStatus } from '@prisma/client';

export interface CreateMaintenanceInput {
  title: string;
  description: string;
  imageUrl?: string | null;
  unitId: string;
  tenantId: string;
}

export const maintenanceService = {
  async getRequests() {
    return db.maintenanceRequest.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        unit: true,
        tenant: true,
      },
    });
  },

  async createRequest(data: CreateMaintenanceInput) {
    return db.maintenanceRequest.create({
      data: {
        title: data.title,
        description: data.description,
        imageUrl: data.imageUrl || null,
        status: MaintenanceStatus.OPEN,
        unitId: data.unitId,
        tenantId: data.tenantId,
      },
    });
  },

  async updateStatus(id: string, status: MaintenanceStatus) {
    return db.maintenanceRequest.update({
      where: { id },
      data: { status },
    });
  },
};

import { db } from '../db';
import { UnitStatus } from '@prisma/client';

export interface CreateUnitInput {
  roomNumber: string;
  monthlyRate: number;
  status?: UnitStatus;
  waterMeter: number;
  electroMeter: number;
}

export interface UpdateUnitInput {
  roomNumber?: string;
  monthlyRate?: number;
  status?: UnitStatus;
  waterMeter?: number;
  electroMeter?: number;
}

export const unitService = {
  async getUnits(filters?: { status?: UnitStatus }) {
    return db.unit.findMany({
      where: filters,
      orderBy: { roomNumber: 'asc' },
      include: {
        tenants: {
          where: { status: 'ACTIVE' },
        },
      },
    });
  },

  async getUnit(id: string) {
    return db.unit.findUnique({
      where: { id },
      include: {
        tenants: true,
        billPeriods: {
          orderBy: { createdAt: 'desc' },
          take: 12,
        },
        ledgers: {
          orderBy: { date: 'desc' },
          take: 20,
        },
      },
    });
  },

  async createUnit(data: CreateUnitInput) {
    return db.unit.create({
      data: {
        roomNumber: data.roomNumber,
        monthlyRate: data.monthlyRate,
        status: data.status ?? UnitStatus.VACANT,
        waterMeter: data.waterMeter,
        electroMeter: data.electroMeter,
      },
    });
  },

  async updateUnit(id: string, data: UpdateUnitInput) {
    return db.unit.update({
      where: { id },
      data,
    });
  },

  async getVacantUnits() {
    return db.unit.findMany({
      where: { status: UnitStatus.VACANT },
      orderBy: { roomNumber: 'asc' },
    });
  },
};

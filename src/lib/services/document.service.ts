import { db } from '../db';
import { minioClient } from '../minio';

export const documentService = {
  async getDocumentsByTenant(tenantId: string) {
    return db.document.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
    });
  },

  async createDocument(data: { tenantId: string; type: string; fileUrl: string }) {
    return db.document.create({
      data: {
        type: data.type,
        fileUrl: data.fileUrl,
        tenantId: data.tenantId,
      },
    });
  },

  async generateLeasePdf(tenantId: string) {
    // Return mock PDF document link stored in MinIO bucket
    const tenant = await db.tenant.findUnique({
      where: { id: tenantId },
      include: { unit: true },
    });

    if (!tenant) throw new Error('Tenant not found');

    const fileName = `lease-${tenant.id}-${Date.now()}.pdf`;
    const mockFileUrl = `http://localhost:9000/documents/${fileName}`;

    // Record document link in database
    await this.createDocument({
      tenantId,
      type: 'LEASE',
      fileUrl: mockFileUrl,
    });

    return mockFileUrl;
  },

  async generateNoticePdf(tenantId: string, type: 'NOTICE_ARREARS' | 'NOTICE_EVICTION') {
    const tenant = await db.tenant.findUnique({
      where: { id: tenantId },
      include: { unit: true },
    });

    if (!tenant) throw new Error('Tenant not found');

    const fileName = `notice-${type.toLowerCase()}-${tenant.id}-${Date.now()}.pdf`;
    const mockFileUrl = `http://localhost:9000/documents/${fileName}`;

    await this.createDocument({
      tenantId,
      type,
      fileUrl: mockFileUrl,
    });

    return mockFileUrl;
  },
};

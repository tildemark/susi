import { db } from '../db';
import { minioClient } from '../minio';

const BUCKET_NAME = 'documents';

async function ensureBucketAndPublicPolicy() {
  const exists = await minioClient.bucketExists(BUCKET_NAME);
  if (!exists) {
    await minioClient.makeBucket(BUCKET_NAME, 'us-east-1');
  }
}

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
    await ensureBucketAndPublicPolicy();

    const tenant = await db.tenant.findUnique({
      where: { id: tenantId },
      include: { unit: true },
    });

    if (!tenant) throw new Error('Tenant not found');

    const fileName = `lease-${tenant.id}-${Date.now()}.txt`;

    const content = `=========================================
          LEASE AGREEMENT
=========================================
Tenant Name: ${tenant.firstName} ${tenant.lastName}
Tenant Email: ${tenant.email}
Tenant Phone: ${tenant.phone}
Assigned Unit: ${tenant.unit ? tenant.unit.roomNumber : 'N/A'}
Monthly Rental Rate: ₱${tenant.unit ? tenant.unit.monthlyRate.toLocaleString() : '0'}
Security Deposit: ₱${tenant.depositPaid.toLocaleString()}
Advance Payment: ₱${tenant.advancePaid.toLocaleString()}

Generated on: ${new Date().toLocaleString()}
System for Unit & Space Inventory (SUSI)
=========================================`;

    const mockBuffer = Buffer.from(content);

    await minioClient.putObject(BUCKET_NAME, fileName, mockBuffer, mockBuffer.length, {
      'Content-Type': 'text/plain',
    });

    const presignedUrl = await minioClient.presignedGetObject(BUCKET_NAME, fileName, 24 * 60 * 60);

    await this.createDocument({
      tenantId,
      type: 'LEASE',
      fileUrl: presignedUrl,
    });

    return presignedUrl;
  },

  async generateNoticePdf(tenantId: string, type: 'NOTICE_ARREARS' | 'NOTICE_EVICTION') {
    await ensureBucketAndPublicPolicy();

    const tenant = await db.tenant.findUnique({
      where: { id: tenantId },
      include: { unit: true },
    });

    if (!tenant) throw new Error('Tenant not found');

    const fileName = `notice-${type.toLowerCase()}-${tenant.id}-${Date.now()}.txt`;

    const content = `=========================================
          OFFICIAL NOTICE: ${type}
=========================================
Recipient: ${tenant.firstName} ${tenant.lastName}
Unit Address: ${tenant.unit ? tenant.unit.roomNumber : 'N/A'}
Billing Email: ${tenant.email}

This document serves as formal notification regarding your unit's status.
Please contact management immediately to resolve any outstanding matters.

Generated on: ${new Date().toLocaleString()}
System for Unit & Space Inventory (SUSI)
=========================================`;

    const mockBuffer = Buffer.from(content);

    await minioClient.putObject(BUCKET_NAME, fileName, mockBuffer, mockBuffer.length, {
      'Content-Type': 'text/plain',
    });

    const presignedUrl = await minioClient.presignedGetObject(BUCKET_NAME, fileName, 24 * 60 * 60);

    await this.createDocument({
      tenantId,
      type,
      fileUrl: presignedUrl,
    });

    return presignedUrl;
  },
};

import { db } from '../db';
import { minioClient } from '../minio';

const BUCKET_NAME = 'documents';

async function ensureBucketAndPublicPolicy() {
  const exists = await minioClient.bucketExists(BUCKET_NAME);
  if (!exists) {
    await minioClient.makeBucket(BUCKET_NAME, 'us-east-1');

    // Set read-only policy for anonymous access so tenant downloads don't fail with AccessDenied
    const policy = {
      Version: '2012-10-17',
      Statement: [
        {
          Sid: 'PublicRead',
          Effect: 'Allow',
          Principal: '*',
          Action: ['s3:GetObject'],
          Resource: [`arn:aws:s3:::${BUCKET_NAME}/*`],
        },
      ],
    };
    await minioClient.setBucketPolicy(BUCKET_NAME, JSON.stringify(policy));
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

    const fileName = `lease-${tenant.id}-${Date.now()}.pdf`;
    const mockFileUrl = `http://localhost:9000/documents/${fileName}`;

    // Upload mock PDF buffer to S3 MinIO
    const mockPdfBuffer = Buffer.from(
      `%PDF-1.4\n1 0 obj\n<< /Title (Lease Agreement) /Author (SUSI App) >>\nendobj\nxref\n0 1\n0000000000 65535 f\ntrailer\n<< /Size 2 >>\nstartxref\n116\n%%EOF`
    );

    await minioClient.putObject(BUCKET_NAME, fileName, mockPdfBuffer, mockPdfBuffer.length, {
      'Content-Type': 'application/pdf',
    });

    // Record document link in database
    await this.createDocument({
      tenantId,
      type: 'LEASE',
      fileUrl: mockFileUrl,
    });

    return mockFileUrl;
  },

  async generateNoticePdf(tenantId: string, type: 'NOTICE_ARREARS' | 'NOTICE_EVICTION') {
    await ensureBucketAndPublicPolicy();

    const tenant = await db.tenant.findUnique({
      where: { id: tenantId },
      include: { unit: true },
    });

    if (!tenant) throw new Error('Tenant not found');

    const fileName = `notice-${type.toLowerCase()}-${tenant.id}-${Date.now()}.pdf`;
    const mockFileUrl = `http://localhost:9000/documents/${fileName}`;

    // Upload mock PDF buffer to S3 MinIO
    const mockPdfBuffer = Buffer.from(
      `%PDF-1.4\n1 0 obj\n<< /Title (Notice: ${type}) /Author (SUSI App) >>\nendobj\nxref\n0 1\n0000000000 65535 f\ntrailer\n<< /Size 2 >>\nstartxref\n116\n%%EOF`
    );

    await minioClient.putObject(BUCKET_NAME, fileName, mockPdfBuffer, mockPdfBuffer.length, {
      'Content-Type': 'application/pdf',
    });

    await this.createDocument({
      tenantId,
      type,
      fileUrl: mockFileUrl,
    });

    return mockFileUrl;
  },
};

import { db } from '../db';
import { minioClient } from '../minio';
import { LedgerType } from '@prisma/client';

const BUCKET_NAME = 'documents';

async function ensureBucket() {
  const exists = await minioClient.bucketExists(BUCKET_NAME);
  if (!exists) {
    await minioClient.makeBucket(BUCKET_NAME, 'us-east-1');
  }
}

export const paymentService = {
  /**
   * Tenant submits proof of payment (bank deposit / GCash).
   * Creates a PENDING PaymentSubmission for landlord review.
   */
  async submitPaymentProof(
    leaseId: string,
    tenantId: string,
    amount: number,
    file: File,
    notes?: string
  ) {
    await ensureBucket();

    const buffer = Buffer.from(await file.arrayBuffer());
    const ext = file.name.split('.').pop();
    const objectPath = `tenant-${tenantId}/payments/payment-proof-${Date.now()}.${ext}`;

    await minioClient.putObject(BUCKET_NAME, objectPath, buffer, buffer.length, {
      'Content-Type': file.type || 'application/octet-stream',
    });

    const proofUrl = await minioClient.presignedGetObject(BUCKET_NAME, objectPath, 7 * 24 * 60 * 60);

    const submission = await db.paymentSubmission.create({
      data: {
        leaseId,
        tenantId,
        amount,
        proofUrl,
        notes,
        status: 'PENDING',
      },
    });

    await db.tenantNote.create({
      data: {
        tenantId,
        type: 'SYSTEM',
        content: `Payment proof submitted for ₱${amount.toLocaleString()}. Awaiting landlord verification.`,
      },
    });

    return submission;
  },

  /**
   * Landlord verifies a payment submission → posts a CREDIT to the Ledger.
   */
  async verifyPayment(submissionId: string) {
    return db.$transaction(async (tx) => {
      const submission = await tx.paymentSubmission.findUnique({
        where: { id: submissionId },
        include: { lease: { include: { unit: true } }, tenant: true },
      });

      if (!submission) throw new Error('Payment submission not found');
      if (submission.status !== 'PENDING') throw new Error('Submission is not pending');

      // Post CREDIT to Ledger
      const ledger = await tx.ledger.create({
        data: {
          type: LedgerType.CREDIT,
          amount: submission.amount,
          description: `Payment verified — ₱${submission.amount.toLocaleString()} for Room ${submission.lease.unit.roomNumber}`,
          receiptUrl: submission.proofUrl,
          unitId: submission.lease.unitId,
          tenantId: submission.tenantId,
          isVerified: true,
        },
      });

      // Update submission status
      const updated = await tx.paymentSubmission.update({
        where: { id: submissionId },
        data: {
          status: 'VERIFIED',
          reviewedAt: new Date(),
          ledgerId: ledger.id,
        },
      });

      await tx.tenantNote.create({
        data: {
          tenantId: submission.tenantId,
          type: 'SYSTEM',
          content: `Payment of ₱${submission.amount.toLocaleString()} verified by landlord. Credit posted to ledger.`,
        },
      });

      return updated;
    });
  },

  /**
   * Landlord rejects a payment submission.
   */
  async rejectPayment(submissionId: string, reason?: string) {
    const submission = await db.paymentSubmission.findUnique({
      where: { id: submissionId },
    });
    if (!submission) throw new Error('Payment submission not found');

    const updated = await db.paymentSubmission.update({
      where: { id: submissionId },
      data: {
        status: 'REJECTED',
        reviewedAt: new Date(),
        notes: reason ? `Rejected: ${reason}` : 'Rejected by landlord',
      },
    });

    await db.tenantNote.create({
      data: {
        tenantId: submission.tenantId,
        type: 'SYSTEM',
        content: `Payment submission of ₱${submission.amount.toLocaleString()} was rejected. ${reason ? `Reason: ${reason}` : 'Please re-submit with correct proof.'}`,
      },
    });

    return updated;
  },

  /**
   * Landlord records a direct cash payment — immediately posts a CREDIT.
   * Optionally uploads a receipt file.
   */
  async recordManualPayment(
    leaseId: string,
    tenantId: string,
    amount: number,
    description?: string,
    receiptFile?: File
  ) {
    await ensureBucket();

    let receiptUrl: string | undefined;

    if (receiptFile && receiptFile.size > 0) {
      const buffer = Buffer.from(await receiptFile.arrayBuffer());
      const ext = receiptFile.name.split('.').pop();
      const fileName = `receipt-${leaseId}-${Date.now()}.${ext}`;
      await minioClient.putObject(BUCKET_NAME, fileName, buffer, buffer.length, {
        'Content-Type': receiptFile.type || 'application/octet-stream',
      });
      receiptUrl = await minioClient.presignedGetObject(BUCKET_NAME, fileName, 7 * 24 * 60 * 60);
    }

    return db.$transaction(async (tx) => {
      const lease = await tx.lease.findUnique({
        where: { id: leaseId },
        include: { unit: true },
      });
      if (!lease) throw new Error('Lease not found');

      const ledger = await tx.ledger.create({
        data: {
          type: LedgerType.CREDIT,
          amount,
          description: description || `Cash payment received — Room ${lease.unit.roomNumber}`,
          receiptUrl,
          unitId: lease.unitId,
          tenantId,
          isVerified: true,
        },
      });

      // Also create a verified PaymentSubmission record for audit trail
      await tx.paymentSubmission.create({
        data: {
          leaseId,
          tenantId,
          amount,
          proofUrl: receiptUrl,
          notes: 'Direct cash payment recorded by landlord',
          status: 'VERIFIED',
          reviewedAt: new Date(),
          ledgerId: ledger.id,
        },
      });

      await tx.tenantNote.create({
        data: {
          tenantId,
          type: 'SYSTEM',
          content: `Cash payment of ₱${amount.toLocaleString()} recorded by landlord. Credit posted immediately.`,
        },
      });

      return ledger;
    });
  },

  /**
   * Get all pending payment submissions (for landlord review queue).
   */
  async getPendingSubmissions() {
    return db.paymentSubmission.findMany({
      where: { status: 'PENDING' },
      orderBy: { createdAt: 'asc' },
      include: {
        tenant: true,
        lease: { include: { unit: true } },
      },
    });
  },
};

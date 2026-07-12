'use server';

import { paymentService } from '@/lib/services/payment.service';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

export async function submitPaymentProofAction(leaseId: string, tenantId: string, formData: FormData) {
  const file = formData.get('file') as File;
  const amount = parseFloat(formData.get('amount') as string);
  const notes = formData.get('notes') as string | null;

  if (!file || file.size === 0) {
    throw new Error('Please upload a valid proof of payment file');
  }
  if (isNaN(amount) || amount <= 0) {
    throw new Error('Please enter a valid payment amount');
  }

  await paymentService.submitPaymentProof(leaseId, tenantId, amount, file, notes ?? undefined);

  revalidatePath(`/leases/${leaseId}`);
  revalidatePath('/settings');
  redirect(`/leases/${leaseId}?success=Payment proof submitted. Awaiting landlord verification.&tab=payments`);
}

export async function verifyPaymentAction(submissionId: string, leaseId: string) {
  await paymentService.verifyPayment(submissionId);

  revalidatePath(`/leases/${leaseId}`);
  revalidatePath('/settings');
  redirect(`/leases/${leaseId}?success=Payment verified. Credit posted to ledger.&tab=payments`);
}

export async function rejectPaymentAction(submissionId: string, leaseId: string, formData: FormData) {
  const reason = formData.get('reason') as string | null;

  await paymentService.rejectPayment(submissionId, reason ?? undefined);

  revalidatePath(`/leases/${leaseId}`);
  revalidatePath('/settings');
  redirect(`/leases/${leaseId}?success=Payment submission rejected.&tab=payments`);
}

export async function recordManualPaymentAction(leaseId: string, tenantId: string, formData: FormData) {
  const amount = parseFloat(formData.get('amount') as string);
  const description = formData.get('description') as string | null;
  const receiptFile = formData.get('receipt') as File | null;

  if (isNaN(amount) || amount <= 0) {
    throw new Error('Please enter a valid payment amount');
  }

  await paymentService.recordManualPayment(
    leaseId,
    tenantId,
    amount,
    description ?? undefined,
    receiptFile && receiptFile.size > 0 ? receiptFile : undefined
  );

  revalidatePath(`/leases/${leaseId}`);
  revalidatePath('/settings');
  redirect(`/leases/${leaseId}?success=Cash payment recorded. Credit posted to ledger.&tab=payments`);
}

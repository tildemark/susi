'use server';

import { db } from '@/lib/db';
import { minioClient } from '@/lib/minio';
import { documentService } from '@/lib/services/document.service';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';

const BUCKET_NAME = 'documents';

export async function generateLeaseAction(tenantId: string) {
  'use server';

  await documentService.generateLeasePdf(tenantId);
  revalidatePath(`/tenants/${tenantId}`);
  revalidatePath('/settings');
  const referer = (await headers()).get('referer');
  if (referer && referer.includes('/settings')) {
    redirect('/settings?success=Standard Lease Agreement contract generated successfully&tab=documents');
  } else {
    redirect(`/tenants/${tenantId}?success=Standard Lease Agreement contract generated&tab=lease-docs`);
  }
}

export async function generateNoticeAction(tenantId: string, type: 'NOTICE_ARREARS' | 'NOTICE_EVICTION') {
  'use server';

  await documentService.generateNoticePdf(tenantId, type);
  revalidatePath(`/tenants/${tenantId}`);
  revalidatePath('/settings');
  const referer = (await headers()).get('referer');
  if (referer && referer.includes('/settings')) {
    redirect('/settings?success=Official notice generated successfully&tab=documents');
  } else {
    redirect(`/tenants/${tenantId}?success=Official notice generated&tab=lease-docs`);
  }
}

export async function generateCustomLeaseAction(tenantId: string, formData: FormData) {
  'use server';

  const leaseStartDate = new Date(formData.get('leaseStartDate') as string);
  const monthlyRate = parseFloat(formData.get('monthlyRate') as string);
  const depositPaid = parseFloat(formData.get('depositPaid') as string);
  const advancePaid = parseFloat(formData.get('advancePaid') as string);
  const waterWaived = formData.get('waterWaived') === 'true';
  const elecWaived = formData.get('elecWaived') === 'true';
  const customRules = formData.get('customRules') as string;
  const landlordSignatory = formData.get('landlordSignatory') as string;
  const tenantSignatory = formData.get('tenantSignatory') as string;

  if (isNaN(monthlyRate) || isNaN(depositPaid) || isNaN(advancePaid) || !customRules || !landlordSignatory || !tenantSignatory) {
    throw new Error('All form fields must be completed correctly to generate custom lease agreement');
  }

  await documentService.generateCustomLeasePdf(tenantId, {
    leaseStartDate,
    monthlyRate,
    depositPaid,
    advancePaid,
    waterWaived,
    elecWaived,
    customRules,
    landlordSignatory,
    tenantSignatory,
  });

  revalidatePath(`/tenants/${tenantId}`);
  revalidatePath('/settings');
  const referer = (await headers()).get('referer');
  if (referer && referer.includes('/settings')) {
    redirect('/settings?success=Custom lease agreement contract generated successfully&tab=documents');
  } else {
    redirect(`/tenants/${tenantId}?success=Custom lease agreement contract generated successfully&tab=lease-docs`);
  }
}

export async function uploadTenantDocumentAction(tenantId: string, formData: FormData) {
  'use server';

  const file = formData.get('file') as File;
  const type = formData.get('type') as string;

  if (!file || file.size === 0) {
    throw new Error('Please select a valid file to upload');
  }

  if (!type) {
    throw new Error('Please select a document type');
  }

  // 1. Read file to buffer
  const buffer = Buffer.from(await file.arrayBuffer());
  const fileExtension = file.name.split('.').pop();
  const objectPath = `tenant-${tenantId}/uploads/${Date.now()}.${fileExtension}`;

  // 2. Ensure bucket exists and upload to MinIO
  const bucketExists = await minioClient.bucketExists(BUCKET_NAME);
  if (!bucketExists) {
    await minioClient.makeBucket(BUCKET_NAME, 'us-east-1');
  }

  await minioClient.putObject(BUCKET_NAME, objectPath, buffer, buffer.length, {
    'Content-Type': file.type || 'application/octet-stream',
  });

  // 3. Generate presigned URL
  const presignedUrl = await minioClient.presignedGetObject(BUCKET_NAME, objectPath, 24 * 60 * 60);

  // 4. Create Document record in DB
  const doc = await db.document.create({
    data: {
      tenantId,
      type,
      fileUrl: presignedUrl,
    },
  });

  // 5. Create automatic SYSTEM TenantNote log entry
  await db.tenantNote.create({
    data: {
      tenantId,
      type: 'SYSTEM',
      content: `Uploaded document [${type}]: ${file.name}.`,
    },
  });

  revalidatePath(`/tenants/${tenantId}`);
  revalidatePath('/settings');
  const referer = (await headers()).get('referer');
  if (referer && referer.includes('/settings')) {
    redirect('/settings?success=Document uploaded successfully&tab=documents');
  } else {
    redirect(`/tenants/${tenantId}?success=Document uploaded successfully&tab=lease-docs`);
  }
}

export async function deleteTenantDocumentAction(tenantId: string, documentId: string) {
  'use server';

  const doc = await db.document.findUnique({
    where: { id: documentId },
  });

  if (doc) {
    // 1. Delete from database
    await db.document.delete({
      where: { id: documentId },
    });

    // 2. Create automatic SYSTEM TenantNote log entry
    await db.tenantNote.create({
      data: {
        tenantId,
        type: 'SYSTEM',
        content: `Deleted document [${doc.type}] with ID #${documentId.slice(0, 8)}.`,
      },
    });
  }

  revalidatePath(`/tenants/${tenantId}`);
  redirect(`/tenants/${tenantId}?success=Document deleted successfully&tab=lease-docs`);
}

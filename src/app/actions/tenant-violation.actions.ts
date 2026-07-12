'use server';

import { db } from '@/lib/db';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

export async function createTenantViolationAction(tenantId: string, formData: FormData) {
  const type = formData.get('type') as string;
  const dateStr = formData.get('date') as string;
  const description = formData.get('description') as string;
  const actionDone = formData.get('actionDone') as string;
  const status = formData.get('status') as string || 'ACTIVE';

  if (!type || !dateStr || !description || !actionDone) {
    throw new Error('All fields are required to log a tenant violation');
  }

  const date = new Date(dateStr);

  await db.$transaction(async (tx) => {
    // 1. Create violation entry
    await tx.tenantViolation.create({
      data: {
        tenantId,
        type,
        date,
        description,
        actionDone,
        status,
      },
    });

    // 2. Create automatic SYSTEM TenantNote log entry
    await tx.tenantNote.create({
      data: {
        tenantId,
        type: 'SYSTEM',
        content: `Rules violation [${type}] logged. Date: ${date.toLocaleString()}. Description: "${description}". Action taken: "${actionDone}".`,
      },
    });
  });

  revalidatePath(`/tenants/${tenantId}`);
  redirect(`/tenants/${tenantId}?success=Tenant violation logged and registered successfully&tab=violations`);
}

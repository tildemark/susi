'use server';

import { db } from '@/lib/db';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

export async function createTenantNoteAction(tenantId: string, formData: FormData) {
  const content = formData.get('content') as string;
  const type = formData.get('type') as string || 'MANUAL';

  if (!content) {
    throw new Error('Note content cannot be empty');
  }

  await db.tenantNote.create({
    data: {
      tenantId,
      content,
      type,
      date: new Date(),
    },
  });

  revalidatePath(`/tenants/${tenantId}`);
  redirect(`/tenants/${tenantId}?success=Note saved successfully&tab=notes`);
}

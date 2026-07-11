'use strict';

import { maintenanceService } from '@/lib/services/maintenance.service';
import { MaintenanceStatus } from '@prisma/client';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

export async function createMaintenanceAction(formData: FormData) {
  'use server';

  const title = formData.get('title') as string;
  const description = formData.get('description') as string;
  const unitId = formData.get('unitId') as string;
  const tenantId = formData.get('tenantId') as string;

  if (!title || !description || !unitId || !tenantId) {
    throw new Error('Title and description are required fields');
  }

  await maintenanceService.createRequest({
    title,
    description,
    unitId,
    tenantId,
  });

  revalidatePath('/portal');
  revalidatePath('/maintenance');
  redirect('/portal');
}

export async function updateMaintenanceStatusAction(id: string, status: MaintenanceStatus) {
  'use server';

  await maintenanceService.updateStatus(id, status);
  
  revalidatePath('/maintenance');
  revalidatePath('/portal');
}

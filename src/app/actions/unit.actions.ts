'use strict';

import { unitService } from '@/lib/services/unit.service';
import { UnitStatus } from '@prisma/client';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

export async function createUnitAction(formData: FormData) {
  'use server';

  const roomNumber = formData.get('roomNumber') as string;
  const monthlyRate = parseFloat(formData.get('monthlyRate') as string);
  const status = formData.get('status') as UnitStatus;
  const waterMeter = parseFloat(formData.get('waterMeter') as string);
  const electroMeter = parseFloat(formData.get('electroMeter') as string);

  if (!roomNumber || isNaN(monthlyRate)) {
    throw new Error('Room Number and Monthly Rate are required fields');
  }

  await unitService.createUnit({
    roomNumber,
    monthlyRate,
    status,
    waterMeter: isNaN(waterMeter) ? 0 : waterMeter,
    electroMeter: isNaN(electroMeter) ? 0 : electroMeter,
  });

  revalidatePath('/units');
  redirect('/units');
}

export async function updateUnitMetersAction(id: string, formData: FormData) {
  'use server';

  const waterMeter = parseFloat(formData.get('waterMeter') as string);
  const electroMeter = parseFloat(formData.get('electroMeter') as string);

  await unitService.updateUnit(id, {
    waterMeter: isNaN(waterMeter) ? undefined : waterMeter,
    electroMeter: isNaN(electroMeter) ? undefined : electroMeter,
  });

  revalidatePath(`/units/${id}`);
}

export async function updateUnitStatusAction(id: string, status: UnitStatus) {
  'use server';

  await unitService.updateUnit(id, { status });
  revalidatePath(`/units/${id}`);
  revalidatePath('/units');
}

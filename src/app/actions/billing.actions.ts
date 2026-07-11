'use strict';

import { billingService } from '@/lib/services/billing.service';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

export async function computeBillAction(formData: FormData) {
  'use server';

  const unitId = formData.get('unitId') as string;
  const month = parseInt(formData.get('month') as string, 10);
  const year = parseInt(formData.get('year') as string, 10);
  const currWater = parseFloat(formData.get('currWater') as string);
  const currElec = parseFloat(formData.get('currElec') as string);

  if (!unitId || isNaN(month) || isNaN(year) || isNaN(currWater) || isNaN(currElec)) {
    throw new Error('All fields are required to calculate utility bills');
  }

  await billingService.computeBill({
    unitId,
    month,
    year,
    currWater,
    currElec,
  });

  revalidatePath('/billing');
  revalidatePath('/units');
  revalidatePath('/ledger');
  redirect('/billing');
}

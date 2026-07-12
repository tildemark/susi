'use server';

import { billingService } from '@/lib/services/billing.service';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

export async function computeBillAction(formData: FormData) {
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

  const redirectPath = formData.get('redirectPath') as string | null;

  revalidatePath('/billing');
  revalidatePath('/units');
  revalidatePath(`/units/${unitId}`);
  revalidatePath('/ledger');

  if (redirectPath) {
    redirect(`${redirectPath}?success=Period bill computed and statement uploaded successfully`);
  } else {
    redirect('/billing?success=Period bill computed and statement uploaded successfully');
  }
}

export async function updateMonthlyPolicyAction(formData: FormData) {
  const month = parseInt(formData.get('month') as string, 10);
  const year = parseInt(formData.get('year') as string, 10);
  const waterRate = parseFloat(formData.get('waterRate') as string);
  const elecRate = parseFloat(formData.get('elecRate') as string);
  const billingCycle = formData.get('billingCycle') as string;
  const lateFeeImposed = formData.get('lateFeeImposed') === 'true';
  const lateFeeAmount = parseFloat(formData.get('lateFeeAmount') as string || '0');

  if (isNaN(month) || isNaN(year) || isNaN(waterRate) || isNaN(elecRate) || !billingCycle) {
    throw new Error('All fields are required to save monthly policy overrides');
  }

  await billingService.saveMonthlyPolicy({
    month,
    year,
    waterRate,
    elecRate,
    billingCycle,
    lateFeeImposed,
    lateFeeAmount,
  });

  revalidatePath('/billing');
  redirect('/billing?success=Landlord billing policies saved successfully');
}

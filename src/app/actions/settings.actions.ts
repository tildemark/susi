'use strict';

import { billingService } from '@/lib/services/billing.service';
import { db } from '@/lib/db';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

export async function updateBillingConfigAction(formData: FormData) {
  'use server';

  const waterRate = parseFloat(formData.get('waterRate') as string);
  const elecRate = parseFloat(formData.get('elecRate') as string);
  const billingCycle = formData.get('billingCycle') as string;
  const lateFeeImposed = formData.get('lateFeeImposed') === 'true';
  const lateFeeAmount = parseFloat(formData.get('lateFeeAmount') as string || '0');

  if (isNaN(waterRate) || isNaN(elecRate) || !billingCycle) {
    throw new Error('Water rate, Electricity rate, and Billing Cycle are required');
  }

  await billingService.updateBillingConfig({
    waterRate,
    elecRate,
    billingCycle,
    lateFeeImposed,
    lateFeeAmount: isNaN(lateFeeAmount) ? 0 : lateFeeAmount,
  });

  revalidatePath('/settings');
  revalidatePath('/billing');
  redirect('/settings?success=Global billing configuration updated successfully');
}

export async function submitMassReadingsAction(formData: FormData) {
  'use server';

  const month = parseInt(formData.get('month') as string, 10);
  const year = parseInt(formData.get('year') as string, 10);

  if (isNaN(month) || isNaN(year)) {
    throw new Error('Billing Month and Year are required');
  }

  // Get all occupied units
  const units = await db.unit.findMany({
    where: {
      tenants: {
        some: { status: 'ACTIVE' }
      }
    },
    include: {
      tenants: {
        where: { status: 'ACTIVE' }
      }
    }
  });

  let successCount = 0;
  const errors: string[] = [];

  for (const unit of units) {
    const waterStr = formData.get(`water_${unit.id}`) as string;
    const elecStr = formData.get(`elec_${unit.id}`) as string;

    // If both are empty, user chose not to input for this unit this time
    if (!waterStr && !elecStr) {
      continue;
    }

    const currWater = parseFloat(waterStr);
    const currElec = parseFloat(elecStr);

    if (isNaN(currWater) || isNaN(currElec)) {
      errors.push(`Room ${unit.roomNumber}: Readings must be valid numbers.`);
      continue;
    }

    if (currWater < unit.waterMeter || currElec < unit.electroMeter) {
      errors.push(`Room ${unit.roomNumber}: Readings (${currWater} m³, ${currElec} kWh) cannot be less than previous readings (${unit.waterMeter} m³, ${unit.electroMeter} kWh).`);
      continue;
    }

    try {
      await billingService.computeBill({
        unitId: unit.id,
        month,
        year,
        currWater,
        currElec,
      });
      successCount++;
    } catch (e: any) {
      errors.push(`Room ${unit.roomNumber}: ${e.message}`);
    }
  }

  revalidatePath('/settings');
  revalidatePath('/billing');
  revalidatePath('/units');
  revalidatePath('/ledger');

  const errMsg = errors.length > 0 ? `&error=${encodeURIComponent(errors.join('; '))}` : '';
  redirect(`/settings?success=Processed utility billing: ${successCount} generated successfully.${errMsg}`);
}

export async function resetAndSeedDatabaseAction() {
  'use server';

  const { seedDatabase } = await import('../../../prisma/seed');
  await seedDatabase();

  revalidatePath('/settings');
  revalidatePath('/billing');
  revalidatePath('/units');
  revalidatePath('/tenants');
  revalidatePath('/ledger');
  revalidatePath('/documents');
  redirect('/settings?success=Database successfully reset and populated with demo seed data&tab=billing');
}

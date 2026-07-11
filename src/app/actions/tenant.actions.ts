'use strict';

import { tenantService } from '@/lib/services/tenant.service';
import { BillingPreference } from '@prisma/client';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

export async function createTenantAction(formData: FormData) {
  'use server';

  const firstName = formData.get('firstName') as string;
  const lastName = formData.get('lastName') as string;
  const email = formData.get('email') as string;
  const phone = formData.get('phone') as string;
  const billingPreference = formData.get('billingPreference') as BillingPreference;
  const depositPaid = parseFloat(formData.get('depositPaid') as string);
  const advancePaid = parseFloat(formData.get('advancePaid') as string);
  const unitId = formData.get('unitId') as string;
  const appAccess = formData.get('appAccess') === 'true';

  if (!firstName || !lastName || !email || !phone) {
    throw new Error('First Name, Last Name, Email, and Phone are required fields');
  }

  await tenantService.createTenant({
    firstName,
    lastName,
    email,
    phone,
    billingPreference,
    depositPaid: isNaN(depositPaid) ? 0 : depositPaid,
    advancePaid: isNaN(advancePaid) ? 0 : advancePaid,
    unitId: unitId || null,
    appAccess,
  });

  revalidatePath('/tenants');
  revalidatePath('/units');
  redirect('/tenants');
}

export async function unlinkTenantAction(id: string, unitId: string | null) {
  'use server';

  await tenantService.unlinkTenant(id);
  
  revalidatePath('/tenants');
  revalidatePath(`/tenants/${id}`);
  if (unitId) {
    revalidatePath(`/units/${unitId}`);
    revalidatePath('/units');
  }
}

export async function linkTenantAction(id: string, unitId: string) {
  'use server';

  await tenantService.updateTenant(id, { unitId });

  revalidatePath('/tenants');
  revalidatePath(`/units/${unitId}`);
  revalidatePath('/units');
}

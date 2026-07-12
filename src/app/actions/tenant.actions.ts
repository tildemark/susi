'use strict';

import { tenantService } from '@/lib/services/tenant.service';
import { BillingPreference } from '@prisma/client';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db';

export async function createTenantAction(formData: FormData) {
  'use server';

  const firstName = formData.get('firstName') as string;
  const lastName = formData.get('lastName') as string;
  const email = formData.get('email') as string;
  const phone = formData.get('phone') as string;
  const billingPreference = formData.get('billingPreference') as BillingPreference;
  const notifyApp = formData.get('notifyApp') === 'true';
  const notifyEmail = formData.get('notifyEmail') !== 'false'; // default true
  const notifySms = formData.get('notifySms') === 'true';
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
    notifyApp,
    notifyEmail,
    notifySms,
    appAccess,
  });

  revalidatePath('/tenants');
  redirect('/tenants?success=Tenant registered successfully. You can now create a lease for them.');
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

export async function addTenantAddonAction(tenantId: string, unitId: string | null, formData: FormData) {
  'use server';

  const description = formData.get('description') as string;
  const amount = parseFloat(formData.get('amount') as string);

  if (!description || isNaN(amount)) {
    throw new Error('Description and amount are required to add an add-on');
  }

  if (!unitId) {
    throw new Error('Tenant must be assigned to a unit to add an add-on item');
  }

  // Create ledger entry
  await db.ledger.create({
    data: {
      tenantId,
      unitId,
      amount,
      type: 'CHARGE',
      description,
      date: new Date(),
    },
  });

  const redirectPath = formData.get('redirectPath') as string | null;

  revalidatePath(`/tenants/${tenantId}`);
  if (unitId) {
    revalidatePath(`/units/${unitId}`);
    revalidatePath('/units');
  }

  if (redirectPath) {
    redirect(`${redirectPath}?success=Add-on item added successfully`);
  } else {
    redirect(`/tenants/${tenantId}?success=Add-on item added successfully&tab=lease-docs`);
  }
}

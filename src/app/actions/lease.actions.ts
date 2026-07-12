'use server';

import { leaseService } from '@/lib/services/lease.service';
import { notificationService } from '@/lib/services/notification.service';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

export async function createLeaseAction(formData: FormData) {
  const tenantId = formData.get('tenantId') as string;
  const unitId = formData.get('unitId') as string;
  const monthlyRate = parseFloat(formData.get('monthlyRate') as string);
  const securityDeposit = parseFloat(formData.get('securityDeposit') as string);
  const advancePaid = parseFloat(formData.get('advancePaid') as string);
  const advanceConsumed = formData.get('advanceConsumed') === 'true';
  const billingCycle = formData.get('billingCycle') as string;
  const leaseStartDate = new Date(formData.get('leaseStartDate') as string);
  const waterWaived = formData.get('waterWaived') === 'true';
  const elecWaived = formData.get('elecWaived') === 'true';
  const waterMeterBaseline = parseFloat(formData.get('waterMeterBaseline') as string);
  const elecMeterBaseline = parseFloat(formData.get('elecMeterBaseline') as string);

  // Parse addons: addon_desc_0, addon_amount_0, addon_desc_1, ...
  const addons: { description: string; amount: number }[] = [];
  let i = 0;
  while (formData.get(`addon_desc_${i}`) !== null) {
    const desc = formData.get(`addon_desc_${i}`) as string;
    const amt = parseFloat(formData.get(`addon_amount_${i}`) as string);
    if (desc && !isNaN(amt) && amt >= 0) {
      addons.push({ description: desc, amount: amt });
    }
    i++;
  }

  if (!tenantId || !unitId || isNaN(monthlyRate) || monthlyRate <= 0) {
    throw new Error('Tenant, unit, and a valid monthly rate are required');
  }

  const lease = await leaseService.createLease({
    tenantId,
    unitId,
    monthlyRate,
    securityDeposit: isNaN(securityDeposit) ? 0 : securityDeposit,
    advancePaid: isNaN(advancePaid) ? 0 : advancePaid,
    advanceConsumed,
    billingCycle,
    leaseStartDate,
    addons,
    waterWaived,
    elecWaived,
    waterMeterBaseline: isNaN(waterMeterBaseline) ? 0 : waterMeterBaseline,
    elecMeterBaseline: isNaN(elecMeterBaseline) ? 0 : elecMeterBaseline,
  });

  revalidatePath('/leases');
  revalidatePath('/units');
  revalidatePath('/tenants');
  revalidatePath(`/tenants/${tenantId}`);
  revalidatePath(`/units/${unitId}`);

  redirect(`/leases/${lease.id}?success=Lease created successfully`);
}

export async function endLeaseAction(leaseId: string, tenantId: string, unitId: string) {
  await leaseService.endLease(leaseId);

  revalidatePath('/leases');
  revalidatePath('/units');
  revalidatePath('/tenants');
  revalidatePath(`/tenants/${tenantId}`);
  revalidatePath(`/units/${unitId}`);

  redirect(`/leases?success=Lease ended. Tenant has been checked out.`);
}

export async function addLeaseAddonAction(leaseId: string, formData: FormData) {
  const description = formData.get('description') as string;
  const amount = parseFloat(formData.get('amount') as string);

  if (!description || isNaN(amount) || amount < 0) {
    throw new Error('Description and a valid amount are required');
  }

  await leaseService.addAddon(leaseId, description, amount);

  revalidatePath(`/leases/${leaseId}`);
  redirect(`/leases/${leaseId}?success=Add-on added successfully&tab=addons`);
}

export async function removeLeaseAddonAction(addonId: string, leaseId: string) {
  await leaseService.removeAddon(addonId);

  revalidatePath(`/leases/${leaseId}`);
  redirect(`/leases/${leaseId}?success=Add-on deactivated&tab=addons`);
}

export async function generateLeaseDocumentAction(leaseId: string, formData: FormData) {
  const landlordName = (formData.get('landlordName') as string) || 'SUSI Management';

  await leaseService.generateLeaseDocument(leaseId, landlordName);

  revalidatePath(`/leases/${leaseId}`);
  redirect(`/leases/${leaseId}?success=Lease document generated&tab=documents`);
}

export async function finalizeLeaseDocumentAction(leaseDocId: string, leaseId: string) {
  await leaseService.finalizeLeaseDocument(leaseDocId);

  revalidatePath(`/leases/${leaseId}`);
  redirect(`/leases/${leaseId}?success=Document marked as Final&tab=documents`);
}

export async function postLeaseDocumentAction(leaseDocId: string, leaseId: string) {
  await leaseService.postLeaseDocument(leaseDocId);

  revalidatePath(`/leases/${leaseId}`);
  redirect(`/leases/${leaseId}?success=Document posted to tenant portal&tab=documents`);
}

export async function uploadSignedLeaseAction(leaseId: string, formData: FormData) {
  const file = formData.get('file') as File;
  const uploadedBy = (formData.get('uploadedBy') as string) || 'landlord';

  if (!file || file.size === 0) {
    throw new Error('Please select a file to upload');
  }

  await leaseService.uploadSignedLease(leaseId, file, uploadedBy);

  revalidatePath(`/leases/${leaseId}`);
  redirect(`/leases/${leaseId}?success=Signed agreement uploaded&tab=documents`);
}

export async function sendMeterReadingRemindersAction() {
  const dueLeases = await leaseService.getLeasesDueForMeterReading(5);

  if (dueLeases.length === 0) {
    redirect('/billing?success=No meter readings are due in the next 5 days');
  }

  const unitList = dueLeases
    .map((l) => `Room ${l.unit.roomNumber} — ${l.tenant.firstName} ${l.tenant.lastName}`)
    .join(', ');

  await notificationService.notifyLandlord(
    `Meter Reading Reminder: ${dueLeases.length} unit(s) due in 5 days — ${unitList}. Please log readings in SUSI.`,
    'Action Required: Meter Readings Due'
  );

  revalidatePath('/billing');
  redirect(`/billing?success=Meter reading reminders sent for ${dueLeases.length} unit(s)`);
}

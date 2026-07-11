'use strict';

import { ledgerService } from '@/lib/services/ledger.service';
import { db } from '@/lib/db';
import { LedgerType } from '@prisma/client';
import { revalidatePath } from 'next/cache';

export async function createLedgerEntryAction(formData: FormData) {
  'use server';

  const tenantId = formData.get('tenantId') as string;
  const type = formData.get('type') as LedgerType;
  const amount = parseFloat(formData.get('amount') as string);
  const description = formData.get('description') as string;

  if (!tenantId || isNaN(amount) || !description) {
    throw new Error('All ledger fields are required');
  }

  // Fetch unitId dynamically from the tenant relation to avoid hidden inputs mismatch
  const tenant = await db.tenant.findUnique({
    where: { id: tenantId },
    select: { unitId: true },
  });

  if (!tenant || !tenant.unitId) {
    throw new Error('Selected tenant has no occupied unit assigned');
  }

  const unitId = tenant.unitId;

  await ledgerService.addEntry({
    unitId,
    tenantId,
    type,
    amount,
    description,
    isVerified: type === LedgerType.PAYMENT ? false : true,
  });

  revalidatePath('/ledger');
  revalidatePath(`/units/${unitId}`);
  revalidatePath(`/tenants/${tenantId}`);
}

export async function verifyLedgerEntryAction(id: string, unitId: string, tenantId: string) {
  'use server';

  await ledgerService.verifyEntry(id);

  revalidatePath('/ledger');
  revalidatePath(`/units/${unitId}`);
  revalidatePath(`/tenants/${tenantId}`);
}

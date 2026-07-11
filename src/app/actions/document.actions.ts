'use strict';

import { documentService } from '@/lib/services/document.service';
import { revalidatePath } from 'next/cache';

export async function generateLeaseAction(tenantId: string) {
  'use server';

  await documentService.generateLeasePdf(tenantId);
  revalidatePath(`/tenants/${tenantId}`);
}

export async function generateNoticeAction(tenantId: string, type: 'NOTICE_ARREARS' | 'NOTICE_EVICTION') {
  'use server';

  await documentService.generateNoticePdf(tenantId, type);
  revalidatePath(`/tenants/${tenantId}`);
}

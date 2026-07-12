import { db } from '../db';
import { minioClient } from '../minio';
import { UnitStatus, LedgerType } from '@prisma/client';

const BUCKET_NAME = 'documents';

async function ensureBucket() {
  const exists = await minioClient.bucketExists(BUCKET_NAME);
  if (!exists) {
    await minioClient.makeBucket(BUCKET_NAME, 'us-east-1');
  }
}

export interface CreateLeaseInput {
  tenantId: string;
  unitId: string;
  monthlyRate: number;
  securityDeposit: number;
  advancePaid: number;
  advanceConsumed: boolean;  // true = advance offsets first bill; false = kept as prepayment
  billingCycle: string;      // MONTHSARY | END_OF_MONTH
  leaseStartDate: Date;
  addons: { description: string; amount: number }[];
  waterWaived: boolean;
  elecWaived: boolean;
  waterMeterBaseline: number;
  elecMeterBaseline: number;
}

export const leaseService = {
  /**
   * Create a new lease agreement, post initial credits to ledger,
   * update unit meters/waivers, and mark unit OCCUPIED.
   */
  async createLease(data: CreateLeaseInput) {
    await ensureBucket();

    return db.$transaction(async (tx) => {
      // 1. Verify tenant and unit exist
      const tenant = await tx.tenant.findUnique({ where: { id: data.tenantId } });
      if (!tenant) throw new Error('Tenant not found');

      const unit = await tx.unit.findUnique({ where: { id: data.unitId } });
      if (!unit) throw new Error('Unit not found');

      // Check for existing active lease on this unit
      const existingLease = await tx.lease.findFirst({
        where: { unitId: data.unitId, status: 'ACTIVE' },
      });
      if (existingLease) throw new Error('This unit already has an active lease');

      // 2. Create the Lease record
      const lease = await tx.lease.create({
        data: {
          tenantId: data.tenantId,
          unitId: data.unitId,
          monthlyRate: data.monthlyRate,
          securityDeposit: data.securityDeposit,
          advancePaid: data.advancePaid,
          advanceConsumed: data.advanceConsumed,
          advanceApplied: false,
          billingCycle: data.billingCycle,
          leaseStartDate: data.leaseStartDate,
          status: 'ACTIVE',
          waterMeterBaseline: data.waterMeterBaseline,
          elecMeterBaseline: data.elecMeterBaseline,
        },
      });

      // 3. Create LeaseAddon records
      if (data.addons.length > 0) {
        await tx.leaseAddon.createMany({
          data: data.addons.map((a) => ({
            leaseId: lease.id,
            description: a.description,
            amount: a.amount,
            isActive: true,
          })),
        });
      }

      // 4. Post Security Deposit as CREDIT to Ledger
      if (data.securityDeposit > 0) {
        await tx.ledger.create({
          data: {
            type: LedgerType.CREDIT,
            amount: data.securityDeposit,
            description: `Security Deposit — Lease for Room ${unit.roomNumber}`,
            unitId: data.unitId,
            tenantId: data.tenantId,
            isVerified: true,
          },
        });
      }

      // 5. Post Advance Payment as CREDIT to Ledger
      if (data.advancePaid > 0) {
        await tx.ledger.create({
          data: {
            type: LedgerType.CREDIT,
            amount: data.advancePaid,
            description: data.advanceConsumed
              ? `1-Month Advance — Applied to first billing cycle (Room ${unit.roomNumber})`
              : `1-Month Advance — Kept as prepayment (Room ${unit.roomNumber})`,
            unitId: data.unitId,
            tenantId: data.tenantId,
            isVerified: true,
          },
        });
      }

      // 6. Update unit: meters baseline, waivers, status → OCCUPIED
      await tx.unit.update({
        where: { id: data.unitId },
        data: {
          waterMeter: data.waterMeterBaseline,
          electroMeter: data.elecMeterBaseline,
          waterWaived: data.waterWaived,
          elecWaived: data.elecWaived,
          status: UnitStatus.OCCUPIED,
        },
      });

      // 7. Link tenant to unit and update leaseStartDate
      await tx.tenant.update({
        where: { id: data.tenantId },
        data: {
          unitId: data.unitId,
          leaseStartDate: data.leaseStartDate,
        },
      });

      // 8. Create initial DRAFT lease document record
      await tx.leaseDocument.create({
        data: {
          leaseId: lease.id,
          status: 'DRAFT',
          label: 'Draft Agreement',
          isUploaded: false,
        },
      });

      // 9. System note
      await tx.tenantNote.create({
        data: {
          tenantId: data.tenantId,
          type: 'SYSTEM',
          content: `Lease created for Room ${unit.roomNumber}. Monthly rate: ₱${data.monthlyRate.toLocaleString()}. Deposit: ₱${data.securityDeposit.toLocaleString()}. Advance: ₱${data.advancePaid.toLocaleString()} (${data.advanceConsumed ? 'applied to first bill' : 'kept as prepayment'}).`,
        },
      });

      return lease;
    });
  },

  /**
   * Get the active lease for a unit or tenant, with all relations.
   */
  async getActiveLease(filter: { tenantId?: string; unitId?: string }) {
    return db.lease.findFirst({
      where: {
        status: 'ACTIVE',
        ...(filter.tenantId ? { tenantId: filter.tenantId } : {}),
        ...(filter.unitId ? { unitId: filter.unitId } : {}),
      },
      include: {
        tenant: true,
        unit: true,
        addons: { where: { isActive: true }, orderBy: { createdAt: 'asc' } },
        leaseDocuments: { orderBy: { createdAt: 'desc' } },
        payments: { orderBy: { createdAt: 'desc' } },
      },
    });
  },

  /**
   * Get all leases (for list view).
   */
  async getLeases(filter?: { status?: string }) {
    return db.lease.findMany({
      where: filter?.status ? { status: filter.status } : undefined,
      orderBy: { createdAt: 'desc' },
      include: {
        tenant: true,
        unit: true,
        addons: { where: { isActive: true } },
        leaseDocuments: { orderBy: { createdAt: 'desc' }, take: 1 },
        payments: { where: { status: 'PENDING' } },
      },
    });
  },

  /**
   * Get a single lease by ID.
   */
  async getLease(id: string) {
    return db.lease.findUnique({
      where: { id },
      include: {
        tenant: true,
        unit: true,
        addons: { orderBy: { createdAt: 'asc' } },
        leaseDocuments: { orderBy: { createdAt: 'desc' } },
        payments: {
          orderBy: { createdAt: 'desc' },
          include: { tenant: true },
        },
      },
    });
  },

  /**
   * End an active lease — marks it ENDED, unlinks tenant from unit, sets unit VACANT.
   */
  async endLease(leaseId: string) {
    return db.$transaction(async (tx) => {
      const lease = await tx.lease.findUnique({
        where: { id: leaseId },
        include: { unit: true, tenant: true },
      });
      if (!lease) throw new Error('Lease not found');
      if (lease.status !== 'ACTIVE') throw new Error('Lease is not active');

      // Mark lease ENDED
      await tx.lease.update({
        where: { id: leaseId },
        data: { status: 'ENDED' },
      });

      // Unlink tenant from unit
      await tx.tenant.update({
        where: { id: lease.tenantId },
        data: { unitId: null },
      });

      // Check if any other active tenants remain in this unit
      const otherActive = await tx.tenant.count({
        where: { unitId: lease.unitId, status: 'ACTIVE', id: { not: lease.tenantId } },
      });
      if (otherActive === 0) {
        await tx.unit.update({
          where: { id: lease.unitId },
          data: { status: UnitStatus.VACANT },
        });
      }

      // System note
      await tx.tenantNote.create({
        data: {
          tenantId: lease.tenantId,
          type: 'SYSTEM',
          content: `Lease ended for Room ${lease.unit.roomNumber}. Tenant checked out.`,
        },
      });

      return lease;
    });
  },

  /**
   * Add a recurring addon to an active lease.
   */
  async addAddon(leaseId: string, description: string, amount: number) {
    return db.leaseAddon.create({
      data: { leaseId, description, amount, isActive: true },
    });
  },

  /**
   * Deactivate a lease addon.
   */
  async removeAddon(addonId: string) {
    return db.leaseAddon.update({
      where: { id: addonId },
      data: { isActive: false },
    });
  },

  /**
   * Generate a lease document (text-based draft) and store in MinIO.
   */
  async generateLeaseDocument(leaseId: string, landlordName: string = 'SUSI Management') {
    await ensureBucket();

    const lease = await db.lease.findUnique({
      where: { id: leaseId },
      include: {
        tenant: true,
        unit: true,
        addons: { where: { isActive: true } },
      },
    });
    if (!lease) throw new Error('Lease not found');

    const { tenant, unit } = lease;

    const addonLines = lease.addons.map(
      (a) => `   - ${a.description}: PHP ${a.amount.toLocaleString()}/month`
    ).join('\n') || '   None';

    const billingCycleLabel = lease.billingCycle === 'MONTHSARY'
      ? 'Every Monthsary (same day each month as lease start)'
      : 'End of Month (first month prorated)';

    const content = `================================================================================
                       RESIDENTIAL LEASE AGREEMENT
================================================================================

This Residential Lease Agreement (the "Agreement") is entered into on
${new Date().toLocaleDateString('en-US', { dateStyle: 'long' })}, by and between:

LANDLORD: ${landlordName}

TENANT:   ${tenant.firstName} ${tenant.lastName}
          Email: ${tenant.email} | Phone: ${tenant.phone}

1. LEASED PREMISES
   Unit / Space Number: ${unit.roomNumber}

2. LEASE TERM
   Commencing: ${new Date(lease.leaseStartDate).toLocaleDateString('en-US', { dateStyle: 'long' })}
   Month-to-month basis. Either party may terminate with 30 days written notice.

3. RENT PAYMENTS & CHARGES
   Monthly Rent:    PHP ${lease.monthlyRate.toLocaleString()}
   Billing Cycle:   ${billingCycleLabel}

4. ADD-ON SERVICES (Recurring Monthly)
${addonLines}

5. UTILITIES
   Water:       ${unit.waterWaived ? 'Waived (Included)' : 'Metered - billed per consumption'}
   Electricity: ${unit.elecWaived ? 'Waived (Included)' : 'Metered - billed per consumption'}

6. SECURITY DEPOSIT & ADVANCE
   Security Deposit:  PHP ${lease.securityDeposit.toLocaleString()}
   1-Month Advance:   PHP ${lease.advancePaid.toLocaleString()}
   Advance Applied:   ${lease.advanceConsumed ? 'Applied to first billing cycle' : 'Kept as prepayment'}

7. ENTIRE AGREEMENT
   This document constitutes the entire agreement between the parties.

--------------------------------------------------------------------------------
LANDLORD:                             TENANT:
Name: ${landlordName.padEnd(30)} Name: ${tenant.firstName} ${tenant.lastName}
Signature: ___________________        Signature: ___________________
Date:      ___________________        Date:      ___________________
================================================================================
Generated by SUSI - System for Unit & Space Inventory
================================================================================`;

    const objectPath = `tenant-${tenant.id}/leases/lease-draft-${Date.now()}.txt`;
    const buffer = Buffer.from(content);

    await minioClient.putObject(BUCKET_NAME, objectPath, buffer, buffer.length, {
      'Content-Type': 'text/plain',
    });

    const fileUrl = await minioClient.presignedGetObject(BUCKET_NAME, objectPath, 7 * 24 * 60 * 60);

    // Update or create a DRAFT LeaseDocument
    const existingDraft = await db.leaseDocument.findFirst({
      where: { leaseId, status: 'DRAFT' },
    });

    let doc;
    if (existingDraft) {
      doc = await db.leaseDocument.update({
        where: { id: existingDraft.id },
        data: { fileUrl, isUploaded: false, label: 'Draft Agreement' },
      });
    } else {
      doc = await db.leaseDocument.create({
        data: {
          leaseId,
          status: 'DRAFT',
          fileUrl,
          isUploaded: false,
          label: 'Draft Agreement',
        },
      });
    }

    // Also create a Document on tenant for their portal
    await db.document.create({
      data: {
        tenantId: tenant.id,
        type: 'LEASE',
        fileUrl,
      },
    });

    await db.tenantNote.create({
      data: {
        tenantId: tenant.id,
        type: 'SYSTEM',
        content: `Lease agreement draft generated for Room ${unit.roomNumber}.`,
      },
    });

    return doc;
  },

  /**
   * Mark a lease document as FINAL.
   */
  async finalizeLeaseDocument(leaseDocId: string) {
    return db.leaseDocument.update({
      where: { id: leaseDocId },
      data: { status: 'FINAL' },
    });
  },

  /**
   * Post a lease document — makes it available in tenant's portal.
   */
  async postLeaseDocument(leaseDocId: string) {
    const doc = await db.leaseDocument.findUnique({
      where: { id: leaseDocId },
      include: { lease: { include: { tenant: true, unit: true } } },
    });
    if (!doc) throw new Error('Lease document not found');
    if (doc.status !== 'FINAL') throw new Error('Document must be finalized before posting');

    const updated = await db.leaseDocument.update({
      where: { id: leaseDocId },
      data: { status: 'POSTED' },
    });

    await db.tenantNote.create({
      data: {
        tenantId: doc.lease.tenantId,
        type: 'SYSTEM',
        content: `Lease agreement posted to tenant portal for Room ${doc.lease.unit.roomNumber}.`,
      },
    });

    return updated;
  },

  /**
   * Upload a signed lease copy (landlord or tenant scanned).
   */
  async uploadSignedLease(leaseId: string, file: File, uploadedBy: string = 'landlord') {
    await ensureBucket();

    const lease = await db.lease.findUnique({
      where: { id: leaseId },
      include: { tenant: true, unit: true },
    });
    if (!lease) throw new Error('Lease not found');

    const buffer = Buffer.from(await file.arrayBuffer());
    const ext = file.name.split('.').pop();
    const objectPath = `tenant-${lease.tenantId}/leases/lease-signed-${Date.now()}.${ext}`;

    await minioClient.putObject(BUCKET_NAME, objectPath, buffer, buffer.length, {
      'Content-Type': file.type || 'application/octet-stream',
    });

    const fileUrl = await minioClient.presignedGetObject(BUCKET_NAME, objectPath, 7 * 24 * 60 * 60);

    const doc = await db.leaseDocument.create({
      data: {
        leaseId,
        status: 'POSTED',
        fileUrl,
        isUploaded: true,
        label: `Signed Agreement (uploaded by ${uploadedBy})`,
      },
    });

    if (lease) {
      await db.document.create({
        data: {
          tenantId: lease.tenantId,
          type: 'LEASE',
          fileUrl,
        },
      });
      await db.tenantNote.create({
        data: {
          tenantId: lease.tenantId,
          type: 'SYSTEM',
          content: `Signed lease agreement uploaded by ${uploadedBy} for Room ${lease.unit.roomNumber}.`,
        },
      });
    }

    return doc;
  },

  /**
   * Returns leases whose next billing date falls within `daysAhead` days.
   * Used by the cron job to trigger meter-reading reminders.
   */
  async getLeasesDueForMeterReading(daysAhead: number = 5) {
    const today = new Date();
    const leases = await db.lease.findMany({
      where: { status: 'ACTIVE' },
      include: { tenant: true, unit: true },
    });

    return leases.filter((lease) => {
      const start = new Date(lease.leaseStartDate);
      let nextBillingDate: Date;

      if (lease.billingCycle === 'MONTHSARY') {
        // Same day of month as lease start
        nextBillingDate = new Date(today.getFullYear(), today.getMonth(), start.getDate());
        if (nextBillingDate <= today) {
          nextBillingDate = new Date(today.getFullYear(), today.getMonth() + 1, start.getDate());
        }
      } else {
        // END_OF_MONTH
        nextBillingDate = new Date(today.getFullYear(), today.getMonth() + 1, 0); // last day
      }

      const diffMs = nextBillingDate.getTime() - today.getTime();
      const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
      return diffDays <= daysAhead && diffDays >= 0;
    });
  },
};

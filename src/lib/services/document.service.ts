import { db } from '../db';
import { minioClient } from '../minio';

const BUCKET_NAME = 'documents';

async function ensureBucketAndPublicPolicy() {
  const exists = await minioClient.bucketExists(BUCKET_NAME);
  if (!exists) {
    await minioClient.makeBucket(BUCKET_NAME, 'us-east-1');
  }
}

export const documentService = {
  async getDocumentsByTenant(tenantId: string) {
    return db.document.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
    });
  },

  async createDocument(data: { tenantId: string; type: string; fileUrl: string }) {
    return db.document.create({
      data: {
        type: data.type,
        fileUrl: data.fileUrl,
        tenantId: data.tenantId,
      },
    });
  },

  async generateLeasePdf(tenantId: string) {
    await ensureBucketAndPublicPolicy();

    const tenant = await db.tenant.findUnique({
      where: { id: tenantId },
      include: { unit: true },
    });

    if (!tenant) throw new Error('Tenant not found');

    // Get financial amounts from active Lease
    const activeLease = await db.lease.findFirst({
      where: { tenantId, status: 'ACTIVE' },
    });
    const depositPaid = activeLease?.securityDeposit ?? 0;
    const advancePaid = activeLease?.advancePaid ?? 0;

    const fileName = `lease-${tenant.id}-${Date.now()}.txt`;

    const waterStatus = tenant.unit?.waterWaived ? 'Waived (Free)' : 'Standard Metered Billing';
    const elecStatus = tenant.unit?.elecWaived ? 'Waived (Free)' : 'Standard Metered Billing';

    const content = `================================================================================
                           RESIDENTIAL LEASE AGREEMENT
================================================================================

This Residential Lease Agreement (the "Agreement") is entered into on this
${new Date().toLocaleDateString('en-US', { dateStyle: 'long' })}, by and between:

LANDLORD: SUSI Space Management (System for Unit & Space Inventory)
TENANT:   ${tenant.firstName} ${tenant.lastName}
          Email: ${tenant.email} | Phone: ${tenant.phone}

1. LEASED PREMISES
The Landlord hereby leases to the Tenant, and the Tenant hereby leases from the
Landlord, the residential unit designated as:
Room / Space Number: ${tenant.unit ? tenant.unit.roomNumber : 'N/A'}

2. LEASE TERM
The term of this lease shall begin on ${new Date(tenant.leaseStartDate).toLocaleDateString('en-US', { dateStyle: 'long' })}
and shall continue on a monthly basis until formally terminated by either party
with a 30-day written notice.

3. RENT PAYMENTS & CHARGES
* Monthly Rent:  ₱${tenant.unit ? tenant.unit.monthlyRate.toLocaleString() : '0'} per month.
* Due Date:      Every 1st of the month, or aligned with the tenant's cycle.
* Late Fee:      Subject to the monthly landlord policy parameters (applied when overdue).

4. UTILITIES & SERVICES
Responsibility for utility charges is designated on a per-unit basis:
* Water Utility:      ${waterStatus}
* Electricity Utility: ${elecStatus}

5. SECURITY DEPOSIT & ADVANCES
The Tenant has paid and the Landlord acknowledges receipt of the following:
* Security Deposit:  ₱${depositPaid.toLocaleString()}
* Advance Rental:    ₱${advancePaid.toLocaleString()}
These deposits shall be held as security for the faithful performance of all
provisions of this agreement.

6. RULES & REGULATIONS
* The leased premises shall be occupied solely as a private residential dwelling.
* Subleasing, unauthorized guests staying longer than 14 days, and commercial activities
  are strictly prohibited without written consent from the Landlord.
* The Tenant shall maintain the unit in a clean, sanitary, and safe condition.

7. ENTIRE AGREEMENT
This document constitutes the entire agreement between the Landlord and Tenant.
No modifications shall be binding unless written and signed by both parties.

IN WITNESS WHEREOF, the Parties have executed this Lease Agreement.


LANDLORD SIGNATURE:
SUSI Management Representative: _______________________
Printed Name: _______________________
Date: _______________________


TENANT SIGNATURE:
Tenant: _______________________
Printed Name: ${tenant.firstName} ${tenant.lastName}
Date: _______________________

================================================================================
Generated and secured via System for Unit & Space Inventory (SUSI)
================================================================================`;

    const mockBuffer = Buffer.from(content);

    await minioClient.putObject(BUCKET_NAME, fileName, mockBuffer, mockBuffer.length, {
      'Content-Type': 'text/plain',
    });

    const presignedUrl = await minioClient.presignedGetObject(BUCKET_NAME, fileName, 24 * 60 * 60);

    await this.createDocument({
      tenantId,
      type: 'LEASE',
      fileUrl: presignedUrl,
    });

    await db.tenantNote.create({
      data: {
        tenantId,
        type: 'SYSTEM',
        content: `Standard Lease Agreement contract generated for Unit ${tenant.unit ? tenant.unit.roomNumber : 'N/A'}.`,
      },
    });

    return presignedUrl;
  },

  async generateNoticePdf(tenantId: string, type: 'NOTICE_ARREARS' | 'NOTICE_EVICTION') {
    await ensureBucketAndPublicPolicy();

    const tenant = await db.tenant.findUnique({
      where: { id: tenantId },
      include: { unit: true },
    });

    if (!tenant) throw new Error('Tenant not found');

    const fileName = `notice-${type.toLowerCase()}-${tenant.id}-${Date.now()}.txt`;

    const content = `=========================================
          OFFICIAL NOTICE: ${type}
=========================================
Recipient: ${tenant.firstName} ${tenant.lastName}
Unit Address: ${tenant.unit ? tenant.unit.roomNumber : 'N/A'}
Billing Email: ${tenant.email}

This document serves as formal notification regarding your unit's status.
Please contact management immediately to resolve any outstanding matters.

Generated on: ${new Date().toLocaleString()}
System for Unit & Space Inventory (SUSI)
=========================================`;

    const mockBuffer = Buffer.from(content);

    await minioClient.putObject(BUCKET_NAME, fileName, mockBuffer, mockBuffer.length, {
      'Content-Type': 'text/plain',
    });

    const presignedUrl = await minioClient.presignedGetObject(BUCKET_NAME, fileName, 24 * 60 * 60);

    await this.createDocument({
      tenantId,
      type,
      fileUrl: presignedUrl,
    });

    await db.tenantNote.create({
      data: {
        tenantId,
        type: 'SYSTEM',
        content: `Official notice [${type}] issued and document logged.`,
      },
    });

    return presignedUrl;
  },

  async generateCustomLeasePdf(
    tenantId: string,
    data: {
      leaseStartDate: Date;
      monthlyRate: number;
      depositPaid: number;
      advancePaid: number;
      waterWaived: boolean;
      elecWaived: boolean;
      customRules: string;
      landlordSignatory: string;
      tenantSignatory: string;
    }
  ) {
    await ensureBucketAndPublicPolicy();

    const tenant = await db.tenant.findUnique({
      where: { id: tenantId },
      include: { unit: true },
    });

    if (!tenant) throw new Error('Tenant not found');

    const fileName = `lease-custom-${tenant.id}-${Date.now()}.txt`;

    const waterStatus = data.waterWaived ? 'Waived (Free)' : 'Standard Metered Billing';
    const elecStatus = data.elecWaived ? 'Waived (Free)' : 'Standard Metered Billing';

    const content = `================================================================================
                           RESIDENTIAL LEASE AGREEMENT
================================================================================

This Residential Lease Agreement (the "Agreement") is entered into on this
${new Date().toLocaleDateString('en-US', { dateStyle: 'long' })}, by and between:

LANDLORD: ${data.landlordSignatory}
TENANT:   ${data.tenantSignatory}
          Email: ${tenant.email} | Phone: ${tenant.phone}

1. LEASED PREMISES
The Landlord hereby leases to the Tenant, and the Tenant hereby leases from the
Landlord, the residential unit designated as:
Room / Space Number: ${tenant.unit ? tenant.unit.roomNumber : 'N/A'}

2. LEASE TERM
The term of this lease shall begin on ${data.leaseStartDate.toLocaleDateString('en-US', { dateStyle: 'long' })}
and shall continue on a monthly basis until formally terminated by either party
with a 30-day written notice.

3. RENT PAYMENTS & CHARGES
* Monthly Rent:  ₱${data.monthlyRate.toLocaleString()} per month.
* Due Date:      Every 1st of the month, or aligned with the tenant's cycle.
* Late Fee:      Subject to the monthly landlord policy parameters (applied when overdue).

4. UTILITIES & SERVICES
Responsibility for utility charges is designated on a per-unit basis:
* Water Utility:      ${waterStatus}
* Electricity Utility: ${elecStatus}

5. SECURITY DEPOSIT & ADVANCES
The Tenant has paid and the Landlord acknowledges receipt of the following:
* Security Deposit:  ₱${data.depositPaid.toLocaleString()}
* Advance Rental:    ₱${data.advancePaid.toLocaleString()}
These deposits shall be held as security for the faithful performance of all
provisions of this agreement.

6. RULES & REGULATIONS
${data.customRules}

7. ENTIRE AGREEMENT
This document constitutes the entire agreement between the Landlord and Tenant.
No modifications shall be binding unless written and signed by both parties.

IN WITNESS WHEREOF, the Parties have executed this Lease Agreement.


LANDLORD SIGNATURE:
SUSI Management Representative: _______________________
Printed Name: ${data.landlordSignatory}
Date: _______________________


TENANT SIGNATURE:
Tenant: _______________________
Printed Name: ${data.tenantSignatory}
Date: _______________________

================================================================================
Generated and secured via System for Unit & Space Inventory (SUSI)
================================================================================`;

    const mockBuffer = Buffer.from(content);

    await minioClient.putObject(BUCKET_NAME, fileName, mockBuffer, mockBuffer.length, {
      'Content-Type': 'text/plain',
    });

    const presignedUrl = await minioClient.presignedGetObject(BUCKET_NAME, fileName, 24 * 60 * 60);

    await this.createDocument({
      tenantId,
      type: 'LEASE',
      fileUrl: presignedUrl,
    });

    await db.tenantNote.create({
      data: {
        tenantId,
        type: 'SYSTEM',
        content: `Customized Lease Agreement contract generated and signed for Unit ${tenant.unit ? tenant.unit.roomNumber : 'N/A'}.`,
      },
    });

    return presignedUrl;
  },
};

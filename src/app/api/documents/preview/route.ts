import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const documentType = formData.get('documentType') as string;
    const tenantId = formData.get('tenantId') as string;

    if (!tenantId) {
      return new NextResponse('Error: Tenant ID is required', { status: 400 });
    }

    const tenant = await db.tenant.findUnique({
      where: { id: tenantId },
      include: { unit: true },
    });

    if (!tenant) {
      return new NextResponse('Error: Tenant not found', { status: 404 });
    }

    let content = '';

    if (documentType === 'lease') {
      const leaseStartDateStr = formData.get('leaseStartDate') as string;
      const leaseStartDate = leaseStartDateStr ? new Date(leaseStartDateStr) : new Date();
      const monthlyRate = parseFloat(formData.get('monthlyRate') as string || '0');
      const depositPaid = parseFloat(formData.get('depositPaid') as string || '0');
      const advancePaid = parseFloat(formData.get('advancePaid') as string || '0');
      const waterWaived = formData.get('waterWaived') === 'true';
      const elecWaived = formData.get('elecWaived') === 'true';
      const customRules = formData.get('customRules') as string || '';
      const landlordSignatory = formData.get('landlordSignatory') as string || 'Landlord';
      const tenantSignatory = formData.get('tenantSignatory') as string || 'Tenant';

      const waterStatus = waterWaived ? 'Waived (Free)' : 'Standard Metered Billing';
      const elecStatus = elecWaived ? 'Waived (Free)' : 'Standard Metered Billing';

      content = `================================================================================
                           PREVIEW: RESIDENTIAL LEASE AGREEMENT
================================================================================

This Residential Lease Agreement (the "Agreement") is entered into on this
${new Date().toLocaleDateString('en-US', { dateStyle: 'long' })}, by and between:

LANDLORD: ${landlordSignatory}
TENANT:   ${tenantSignatory}
          Email: ${tenant.email} | Phone: ${tenant.phone}

1. LEASED PREMISES
The Landlord hereby leases to the Tenant, and the Tenant hereby leases from the
Landlord, the residential unit designated as:
Room / Space Number: ${tenant.unit ? tenant.unit.roomNumber : 'N/A'}

2. LEASE TERM
The term of this lease shall begin on ${leaseStartDate.toLocaleDateString('en-US', { dateStyle: 'long' })}
and shall continue on a monthly basis until formally terminated by either party
with a 30-day written notice.

3. RENT PAYMENTS & CHARGES
* Monthly Rent:  ₱${monthlyRate.toLocaleString()} per month.
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
${customRules}

7. ENTIRE AGREEMENT
This document constitutes the entire agreement between the Landlord and Tenant.
No modifications shall be binding unless written and signed by both parties.

IN WITNESS WHEREOF, the Parties have executed this Lease Agreement.


LANDLORD SIGNATURE:
SUSI Management Representative: _______________________
Printed Name: ${landlordSignatory}
Date: _______________________


TENANT SIGNATURE:
Tenant: _______________________
Printed Name: ${tenantSignatory}
Date: _______________________

================================================================================
Generated and secured via System for Unit & Space Inventory (SUSI)
================================================================================`;
    } else if (documentType === 'notice') {
      const type = formData.get('type') as string || 'OFFICIAL_NOTICE';
      content = `=========================================
          PREVIEW: OFFICIAL NOTICE
=========================================
Notice Type: ${type}
Recipient: ${tenant.firstName} ${tenant.lastName}
Unit Address: ${tenant.unit ? tenant.unit.roomNumber : 'N/A'}
Billing Email: ${tenant.email}

This document serves as formal notification regarding your unit's status.
Please contact management immediately to resolve any outstanding matters.

Generated on: ${new Date().toLocaleString()}
System for Unit & Space Inventory (SUSI)
=========================================`;
    } else {
      return new NextResponse('Error: Invalid document type for preview', { status: 400 });
    }

    return new NextResponse(content, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Content-Disposition': 'inline',
      },
    });
  } catch (error: any) {
    return new NextResponse(`Error generating preview: ${error.message}`, { status: 500 });
  }
}

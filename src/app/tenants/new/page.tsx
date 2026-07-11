import { createTenantAction } from '@/app/actions/tenant.actions';
import { unitService } from '@/lib/services/unit.service';
import { Button, Input, Label, Select } from '@/components/ui-elements';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default async function NewTenantPage() {
  const vacantUnits = await unitService.getVacantUnits();

  return (
    <div className="p-8 max-w-3xl space-y-8">
      {/* Back button */}
      <div>
        <Link href="/tenants" className="inline-flex items-center gap-2 text-slate-500 hover:text-slate-900 transition-colors text-sm font-medium">
          <ArrowLeft className="h-4 w-4" />
          Back to Tenants
        </Link>
      </div>

      <div>
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Register Tenant</h1>
        <p className="text-slate-550 mt-2">Add contact parameters, security payments, and assign space.</p>
      </div>

      <form action={createTenantAction} className="bg-white border border-slate-200 rounded-xl p-6 space-y-6 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label htmlFor="firstName">First Name</Label>
            <Input id="firstName" name="firstName" placeholder="e.g. John" required />
          </div>

          <div className="space-y-2">
            <Label htmlFor="lastName">Last Name</Label>
            <Input id="lastName" name="lastName" placeholder="e.g. Doe" required />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label htmlFor="email">Email Address</Label>
            <Input id="email" name="email" type="email" placeholder="e.g. john.doe@example.com" required />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Phone Number</Label>
            <Input id="phone" name="phone" placeholder="e.g. +63 917 123 4567" required />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 border-t border-slate-100 pt-6">
          <div className="space-y-2">
            <Label htmlFor="billingPreference">Billing Preference</Label>
            <Select id="billingPreference" name="billingPreference" defaultValue="EMAIL">
              <option value="EMAIL">Email</option>
              <option value="PRINT">Print</option>
              <option value="APP">App Invite</option>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="appAccess">App Access Invite</Label>
            <Select id="appAccess" name="appAccess" defaultValue="false">
              <option value="false">No (Inactive)</option>
              <option value="true">Yes (Active Invite)</option>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="unitId">Assign Unit (Vacant Only)</Label>
            <Select id="unitId" name="unitId" defaultValue="">
              <option value="">-- Leave Unassigned --</option>
              {vacantUnits.map((unit) => (
                <option key={unit.id} value={unit.id}>
                  {unit.roomNumber} (₱{unit.monthlyRate.toLocaleString()})
                </option>
              ))}
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 border-t border-slate-100 pt-6">
          <div className="space-y-2">
            <Label htmlFor="depositPaid">Security Deposit Amount (₱)</Label>
            <Input id="depositPaid" name="depositPaid" type="number" step="0.01" defaultValue="0" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="advancePaid">Advance Rent Amount (₱)</Label>
            <Input id="advancePaid" name="advancePaid" type="number" step="0.01" defaultValue="0" />
          </div>
        </div>

        <div className="flex justify-end gap-4 border-t border-slate-100 pt-6">
          <Link href="/tenants" className="px-4 py-2 border border-slate-200 text-slate-500 hover:text-slate-900 rounded-lg transition-colors font-semibold text-sm">
            Cancel
          </Link>
          <Button type="submit">Register Tenant</Button>
        </div>
      </form>
    </div>
  );
}

import { tenantService } from '@/lib/services/tenant.service';
import { unitService } from '@/lib/services/unit.service';
import { createLeaseAction } from '@/app/actions/lease.actions';
import { Button, Input, Label, Select } from '@/components/ui-elements';
import { AddonsManager } from '@/components/addons-manager';
import Link from 'next/link';
import { ArrowLeft, Building2, User, CreditCard, Droplets, Zap, Bell, Plus } from 'lucide-react';

export default async function NewLeasePage() {
  const allTenants = await tenantService.getTenants();
  const vacantUnits = await unitService.getVacantUnits();

  // Only tenants without an active unit assignment
  const availableTenants = allTenants.filter((t) => !t.unitId && t.status === 'ACTIVE');

  const today = new Date().toISOString().split('T')[0];

  return (
    <div className="p-8 max-w-4xl space-y-8">
      {/* Back */}
      <Link href="/leases" className="inline-flex items-center gap-2 text-slate-500 hover:text-slate-900 transition-colors text-sm font-medium">
        <ArrowLeft className="h-4 w-4" /> Back to Leases
      </Link>

      <div>
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Create Lease Agreement</h1>
        <p className="text-slate-500 mt-1 text-sm">Set up the formal tenancy agreement between landlord and tenant.</p>
      </div>

      <form action={createLeaseAction} className="space-y-6">

        {/* Section 1: Tenant & Space */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-5">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg">
              <User className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Tenant & Space</h2>
              <p className="text-xs text-slate-400 mt-0.5">Select the tenant and the unit they are renting.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-2">
              <Label htmlFor="tenantId">Tenant</Label>
              {availableTenants.length === 0 ? (
                <div className="text-xs text-slate-400 italic p-3 border border-dashed border-slate-200 rounded-lg">
                  No available tenants. <Link href="/tenants/new" className="text-indigo-600 font-semibold">Register a tenant first →</Link>
                </div>
              ) : (
                <Select id="tenantId" name="tenantId" required>
                  <option value="">— Select Tenant —</option>
                  {availableTenants.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.firstName} {t.lastName} · {t.email}
                    </option>
                  ))}
                </Select>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="unitId">Vacant Space / Unit</Label>
              {vacantUnits.length === 0 ? (
                <div className="text-xs text-slate-400 italic p-3 border border-dashed border-slate-200 rounded-lg">
                  No vacant units available.
                </div>
              ) : (
                <Select id="unitId" name="unitId" required>
                  <option value="">— Select Unit —</option>
                  {vacantUnits.map((u) => (
                    <option key={u.id} value={u.id}>
                      Room {u.roomNumber} (Listed: ₱{u.monthlyRate.toLocaleString()})
                    </option>
                  ))}
                </Select>
              )}
            </div>
          </div>
        </div>

        {/* Section 2: Lease Terms */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-5">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <div className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg">
              <CreditCard className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Lease Terms</h2>
              <p className="text-xs text-slate-400 mt-0.5">Agreed financial terms as per the signed agreement.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-2">
              <Label htmlFor="leaseStartDate">Lease Start Date</Label>
              <Input id="leaseStartDate" name="leaseStartDate" type="date" defaultValue={today} required />
            </div>

            <div className="space-y-2">
              <Label htmlFor="monthlyRate">Agreed Monthly Rent (₱)</Label>
              <Input id="monthlyRate" name="monthlyRate" type="number" step="0.01" placeholder="e.g. 8000" required />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-2">
              <Label htmlFor="securityDeposit">Security Deposit (₱)</Label>
              <Input id="securityDeposit" name="securityDeposit" type="number" step="0.01" defaultValue="0" />
              <p className="text-[10px] text-slate-400">Will be posted as a CREDIT to the tenant's ledger.</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="advancePaid">1-Month Advance (₱)</Label>
              <Input id="advancePaid" name="advancePaid" type="number" step="0.01" defaultValue="0" />
              <p className="text-[10px] text-slate-400">Will be posted as a CREDIT to the tenant's ledger.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-2">
              <Label htmlFor="advanceConsumed">Advance Disposition</Label>
              <Select id="advanceConsumed" name="advanceConsumed" defaultValue="false">
                <option value="false">Keep as prepayment (billed normally next cycle)</option>
                <option value="true">Apply to first billing cycle (waives first month's rent)</option>
              </Select>
              <p className="text-[10px] text-slate-400">As agreed and signed in the lease agreement.</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="billingCycle">Billing Cycle</Label>
              <Select id="billingCycle" name="billingCycle" defaultValue="MONTHSARY">
                <option value="MONTHSARY">Every Monthsary (same day each month)</option>
                <option value="END_OF_MONTH">End of Month (1st month prorated)</option>
              </Select>
            </div>
          </div>
        </div>

        {/* Section 3: Recurring Add-ons */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-5" id="addons-section">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <div className="p-1.5 bg-purple-50 text-purple-600 rounded-lg">
              <Plus className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Recurring Add-on Services</h2>
              <p className="text-xs text-slate-400 mt-0.5">Monthly add-ons agreed in the lease (WiFi, parking, appliances…). Auto-billed every cycle.</p>
            </div>
          </div>

          <AddonsManager />
        </div>

        {/* Section 4: Utilities & Meter Baselines */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-5">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <div className="p-1.5 bg-cyan-50 text-cyan-600 rounded-lg">
              <Droplets className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Utilities & Meter Baselines</h2>
              <p className="text-xs text-slate-400 mt-0.5">Set move-in meter readings and utility waiver status.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-2">
              <Label htmlFor="waterMeterBaseline" className="flex items-center gap-2">
                <Droplets className="h-4 w-4 text-cyan-600" /> Water Meter at Move-in (m³)
              </Label>
              <Input id="waterMeterBaseline" name="waterMeterBaseline" type="number" step="0.01" defaultValue="0" required />
            </div>

            <div className="space-y-2">
              <Label htmlFor="elecMeterBaseline" className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-amber-600" /> Electricity Meter at Move-in (kWh)
              </Label>
              <Input id="elecMeterBaseline" name="elecMeterBaseline" type="number" step="0.01" defaultValue="0" required />
            </div>
          </div>

          <div className="flex flex-wrap gap-6 pt-2">
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="waterWaived"
                name="waterWaived"
                value="true"
                className="h-4 w-4 rounded border-slate-300 text-indigo-600 cursor-pointer"
              />
              <Label htmlFor="waterWaived" className="cursor-pointer">Waive Water Utility (included in rent)</Label>
            </div>
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="elecWaived"
                name="elecWaived"
                value="true"
                className="h-4 w-4 rounded border-slate-300 text-indigo-600 cursor-pointer"
              />
              <Label htmlFor="elecWaived" className="cursor-pointer">Waive Electricity Utility (included in rent)</Label>
            </div>
          </div>
        </div>

        {/* Section 5: Notification Preferences */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-5">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <div className="p-1.5 bg-amber-50 text-amber-600 rounded-lg">
              <Bell className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Tenant Notification Preferences</h2>
              <p className="text-xs text-slate-400 mt-0.5">How the tenant wishes to receive billing and system notifications (per agreement).</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-8">
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="notifyEmail"
                name="notifyEmail"
                value="true"
                defaultChecked
                className="h-4 w-4 rounded border-slate-300 text-indigo-600 cursor-pointer"
              />
              <label htmlFor="notifyEmail" className="text-sm font-medium text-slate-700 cursor-pointer select-none">
                📧 Email Notifications
              </label>
            </div>
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="notifyApp"
                name="notifyApp"
                value="true"
                className="h-4 w-4 rounded border-slate-300 text-indigo-600 cursor-pointer"
              />
              <label htmlFor="notifyApp" className="text-sm font-medium text-slate-700 cursor-pointer select-none">
                📱 SUSI App Notifications
              </label>
            </div>
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="notifySms"
                name="notifySms"
                value="true"
                className="h-4 w-4 rounded border-slate-300 text-indigo-600 cursor-pointer"
              />
              <label htmlFor="notifySms" className="text-sm font-medium text-slate-700 cursor-pointer select-none">
                💬 SMS / Cellphone
                <span className="ml-1.5 text-[10px] text-amber-600 font-semibold border border-amber-200 rounded px-1 py-0.5 bg-amber-50">Coming soon</span>
              </label>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="appAccess">SUSI Account Access</Label>
            <Select id="appAccess" name="appAccess" defaultValue="false">
              <option value="false">No (Landlord manages on their behalf)</option>
              <option value="true">Yes (Send tenant a SUSI portal invite)</option>
            </Select>
          </div>
        </div>

        {/* Submit */}
        <div className="flex justify-end gap-4 pt-2">
          <Link
            href="/leases"
            className="px-5 py-2.5 border border-slate-200 text-slate-600 hover:text-slate-900 rounded-xl text-sm font-semibold transition-colors"
          >
            Cancel
          </Link>
          <Button type="submit" className="px-8">
            Create Lease Agreement
          </Button>
        </div>
      </form>
    </div>
  );
}


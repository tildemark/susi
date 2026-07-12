import { createTenantAction } from '@/app/actions/tenant.actions';
import { Button, Input, Label, Select } from '@/components/ui-elements';
import Link from 'next/link';
import { ArrowLeft, User, Bell, ScrollText } from 'lucide-react';

export default async function NewTenantPage() {
  return (
    <div className="p-8 max-w-3xl space-y-8">
      {/* Back button */}
      <Link href="/tenants" className="inline-flex items-center gap-2 text-slate-500 hover:text-slate-900 transition-colors text-sm font-medium">
        <ArrowLeft className="h-4 w-4" />
        Back to Tenants
      </Link>

      <div>
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Register Tenant</h1>
        <p className="text-slate-500 mt-2 text-sm">
          Register a tenant&apos;s personal info and notification preferences.
          <span className="ml-1 text-indigo-600 font-semibold">
            Unit assignment, deposit, and advance are set when creating a Lease.
          </span>
        </p>
      </div>

      <form action={createTenantAction} className="space-y-6">

        {/* Section 1: Personal Info */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-6 shadow-sm">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg">
              <User className="h-4 w-4" />
            </div>
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Personal Information</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="firstName">First Name</Label>
              <Input id="firstName" name="firstName" placeholder="e.g. Juan" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Last Name</Label>
              <Input id="lastName" name="lastName" placeholder="e.g. Dela Cruz" required />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input id="email" name="email" type="email" placeholder="e.g. juan@example.com" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone / Cellphone</Label>
              <Input id="phone" name="phone" placeholder="e.g. 09171234567" required />
            </div>
          </div>
        </div>

        {/* Section 2: Notification Preferences */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-6 shadow-sm">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <div className="p-1.5 bg-amber-50 text-amber-600 rounded-lg">
              <Bell className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Notification Preferences</h2>
              <p className="text-xs text-slate-400 mt-0.5">Can be updated later by landlord or by tenant through their SUSI account.</p>
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="billingPreference">Preferred Billing Method</Label>
              <Select id="billingPreference" name="billingPreference" defaultValue="EMAIL">
                <option value="EMAIL">Email</option>
                <option value="PRINT">Print</option>
                <option value="APP">SUSI App</option>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="appAccess">SUSI Account Access</Label>
              <Select id="appAccess" name="appAccess" defaultValue="false">
                <option value="false">No (Landlord manages on their behalf)</option>
                <option value="true">Yes (Send portal invite)</option>
              </Select>
            </div>
          </div>
        </div>

        {/* Info box: next step is Lease */}
        <div className="flex items-start gap-3 px-5 py-4 bg-indigo-50 border border-indigo-200 rounded-xl text-sm text-indigo-800">
          <ScrollText className="h-5 w-5 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Next step: Create a Lease Agreement</p>
            <p className="text-xs mt-0.5 text-indigo-600">
              After registering, go to <strong>Leases → New Lease</strong> to assign a unit, set deposit/advance, billing cycle, and add-ons.
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-4">
          <Link href="/tenants" className="px-4 py-2 border border-slate-200 text-slate-500 hover:text-slate-900 rounded-lg transition-colors font-semibold text-sm">
            Cancel
          </Link>
          <Button type="submit">Register Tenant</Button>
        </div>
      </form>
    </div>
  );
}

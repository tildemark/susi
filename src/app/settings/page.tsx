import { billingService } from '@/lib/services/billing.service';
import { db } from '@/lib/db';
import { paymentService } from '@/lib/services/payment.service';
import { updateBillingConfigAction, submitMassReadingsAction, resetAndSeedDatabaseAction } from '@/app/actions/settings.actions';
import { ingestCsvDataAction } from '@/app/actions/ingest.actions';
import {
  generateLeaseAction,
  generateNoticeAction,
  generateCustomLeaseAction,
  uploadTenantDocumentAction,
} from '@/app/actions/document.actions';
import { verifyPaymentAction, rejectPaymentAction } from '@/app/actions/payment.actions';
import { Button, Input, Label, Select } from '@/components/ui-elements';
import { Settings, CreditCard, Layers, TrendingUp, AlertCircle, Wrench, Droplets, Zap, FileText, Upload, Banknote, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';

export const revalidate = 0; // Dynamic rendering

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string; error?: string; tab?: string }>;
}) {
  const { success, error, tab = 'billing' } = await searchParams;
  const config = await billingService.getOrCreateBillingConfig();
  const pendingPayments = await paymentService.getPendingSubmissions();

  // Get occupied units for mass readings
  const occupiedUnits = await db.unit.findMany({
    where: {
      tenants: {
        some: { status: 'ACTIVE' },
      },
    },
    include: {
      tenants: {
        where: { status: 'ACTIVE' },
      },
    },
    orderBy: { roomNumber: 'asc' },
  });

  // Get active tenants for document operations
  const activeTenants = await db.tenant.findMany({
    where: { status: 'ACTIVE' },
    include: { unit: true },
    orderBy: { lastName: 'asc' },
  });

  const errorList = error ? decodeURIComponent(error).split('; ') : [];

  return (
    <div className="p-8 w-full space-y-8 bg-slate-50/50 min-h-screen">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
          <Settings className="h-8 w-8 text-indigo-650 text-indigo-650 animate-spin-slow" />
          Global Settings & Operations
        </h1>
        <p className="text-slate-550 text-slate-500 mt-2">
          Manage property-wide configurations, mass meter readings, and central document generation.
        </p>
      </div>

      {/* Status Notifications */}
      {success && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl flex items-start gap-3 shadow-sm">
          <div className="p-1 bg-emerald-100 text-emerald-700 rounded-lg">
            <AlertCircle className="h-4 w-4" />
          </div>
          <div>
            <p className="font-semibold text-sm">Operation Successful</p>
            <p className="text-xs text-emerald-700 mt-0.5">{decodeURIComponent(success)}</p>
          </div>
        </div>
      )}

      {errorList.length > 0 && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl space-y-2 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="p-1 bg-rose-100 text-rose-700 rounded-lg">
              <AlertCircle className="h-4 w-4" />
            </div>
            <div>
              <p className="font-semibold text-sm">Some Operations Failed</p>
              <p className="text-xs text-rose-705 text-rose-700 mt-0.5">Please review the validation warnings below:</p>
            </div>
          </div>
          <ul className="list-disc pl-11 text-xs text-rose-700 space-y-1">
            {errorList.map((err, idx) => (
              <li key={idx}>{err}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Tabs Navigation */}
      <div className="flex border-b border-slate-200 gap-6">
        <Link
          href={`/settings?tab=billing${success ? `&success=${success}` : ''}`}
          className={`pb-4 text-sm font-semibold transition-all border-b-2 -mb-[2px] ${
            tab === 'billing'
              ? 'border-indigo-600 text-indigo-650 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          Billing & Rates
        </Link>
        <Link
          href={`/settings?tab=mass-readings${success ? `&success=${success}` : ''}`}
          className={`pb-4 text-sm font-semibold transition-all border-b-2 -mb-[2px] ${
            tab === 'mass-readings'
              ? 'border-indigo-600 text-indigo-650 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          Mass Meter Readings
        </Link>
        <Link
          href={`/settings?tab=documents${success ? `&success=${success}` : ''}`}
          className={`pb-4 text-sm font-semibold transition-all border-b-2 -mb-[2px] ${
            tab === 'documents'
              ? 'border-indigo-600 text-indigo-650 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          Leases & Documents
        </Link>
        <Link
          href={`/settings?tab=payments${success ? `&success=${success}` : ''}`}
          className={`pb-4 text-sm font-semibold transition-all border-b-2 -mb-[2px] ${
            tab === 'payments'
              ? 'border-indigo-600 text-indigo-700 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          Payment Verification {pendingPayments.length > 0 && (
            <span className="ml-1.5 inline-flex items-center justify-center h-4 w-4 text-[9px] font-bold rounded-full bg-amber-500 text-white">
              {pendingPayments.length}
            </span>
          )}
        </Link>
        <Link
          href={`/settings?tab=sandbox${success ? `&success=${success}` : ''}`}
          className={`pb-4 text-sm font-semibold transition-all border-b-2 -mb-[2px] ${
            tab === 'sandbox'
              ? 'border-indigo-600 text-indigo-750 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          Sandbox &amp; Data Ingest
        </Link>
      </div>

      {/* Tab Panels */}
      <div className="space-y-8">
        {/* Tab 1: Billing & Rates */}
        {tab === 'billing' && (
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-6">
            <div className="flex items-center gap-2 pb-4 border-b border-slate-100">
              <span className="inline-flex p-1.5 bg-indigo-50 text-indigo-600 rounded-lg">
                <CreditCard className="h-4 w-4" />
              </span>
              <h2 className="text-xl font-bold text-slate-900">Billing Configuration</h2>
            </div>

            <form action={updateBillingConfigAction} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="waterRate" className="text-sm font-semibold">Water Billing Rate (₱/m³)</Label>
                <Input
                  id="waterRate"
                  name="waterRate"
                  type="number"
                  step="0.01"
                  defaultValue={config.waterRate}
                  required
                  className="text-sm"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="elecRate" className="text-sm font-semibold">Electricity Billing Rate (₱/kWh)</Label>
                <Input
                  id="elecRate"
                  name="elecRate"
                  type="number"
                  step="0.01"
                  defaultValue={config.elecRate}
                  required
                  className="text-sm"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="billingCycle" className="text-sm font-semibold">Billing Cycle Scheme</Label>
                <Select id="billingCycle" name="billingCycle" defaultValue={config.billingCycle} className="text-sm">
                  <option value="MONTHSARY">Monthsary (Lease Start Anniversary)</option>
                  <option value="FIRST_OF_MONTH">Calendar Month (First of Month)</option>
                </Select>
              </div>

              <div className="pt-2 border-t border-slate-100 space-y-4">
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Late Fee Policy</h3>
                
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="lateFeeImposed"
                    name="lateFeeImposed"
                    value="true"
                    defaultChecked={config.lateFeeImposed}
                    className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <Label htmlFor="lateFeeImposed" className="text-sm font-semibold cursor-pointer select-none">
                    Impose late payment fees
                  </Label>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="lateFeeAmount" className="text-xs font-semibold">Late Fee Amount (₱)</Label>
                  <Input
                    id="lateFeeAmount"
                    name="lateFeeAmount"
                    type="number"
                    step="0.01"
                    defaultValue={config.lateFeeAmount}
                    className="text-sm"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100">
                <Button type="submit" className="w-full justify-center text-xs py-2.5">
                  Save Configurations
                </Button>
              </div>
            </form>
          </div>
        )}

        {/* Tab 2: Mass Meter Readings */}
        {tab === 'mass-readings' && (
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-indigo-600" />
                <h2 className="text-xl font-bold text-slate-900">Mass Meter Readings Entry</h2>
              </div>
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                {occupiedUnits.length} Occupied Units
              </span>
            </div>

            {occupiedUnits.length === 0 ? (
              <p className="text-sm text-slate-450 italic py-8 text-center border border-dashed border-slate-200 rounded-lg bg-slate-50/50">
                No occupied units with active tenants are currently registered. Assign tenants to units to begin operations.
              </p>
            ) : (
              <form action={submitMassReadingsAction} className="space-y-6">
                {/* Period Selector Header */}
                <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="mass-month" className="text-xs font-bold uppercase tracking-wider">Target Billing Month</Label>
                    <Select id="mass-month" name="month" defaultValue={new Date().getMonth() + 1} className="text-xs">
                      {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                        <option key={m} value={m}>
                          {new Date(0, m - 1).toLocaleString('en-US', { month: 'long' })}
                        </option>
                      ))}
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="mass-year" className="text-xs font-bold uppercase tracking-wider">Target Billing Year</Label>
                    <Input
                      id="mass-year"
                      name="year"
                      type="number"
                      defaultValue={new Date().getFullYear()}
                      className="text-xs"
                      required
                    />
                  </div>
                </div>

                {/* Mass Readings Entry Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider">
                        <th className="py-3">Room</th>
                        <th className="py-3">Tenant</th>
                        <th className="py-3">Water (m³)</th>
                        <th className="py-3">Electricity (kWh)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {occupiedUnits.map((unit) => {
                        const tenant = unit.tenants[0];
                        return (
                          <tr key={unit.id} className="hover:bg-slate-50/50 transition-colors">
                            <td className="py-4 font-bold text-slate-800 text-sm">Room {unit.roomNumber}</td>
                            <td className="py-4 text-slate-700">
                              <span className="font-semibold block">{tenant.firstName} {tenant.lastName}</span>
                              <span className="text-[10px] text-slate-400">Since {new Date(tenant.leaseStartDate).toLocaleDateString()}</span>
                            </td>
                            
                            {/* Water Input */}
                            <td className="py-4 space-y-1.5 pr-4">
                              <div className="flex items-center gap-1 text-[10px] text-slate-500">
                                <Droplets className="h-3.5 w-3.5 text-cyan-600" />
                                <span>Prev: {unit.waterMeter}</span>
                              </div>
                              <Input
                                name={`water_${unit.id}`}
                                type="number"
                                step="0.01"
                                placeholder={`Min: ${unit.waterMeter}`}
                                min={unit.waterMeter}
                                className="h-8 text-xs max-w-[120px]"
                              />
                            </td>

                            {/* Electricity Input */}
                            <td className="py-4 space-y-1.5">
                              <div className="flex items-center gap-1 text-[10px] text-slate-500">
                                <Zap className="h-3.5 w-3.5 text-amber-600" />
                                <span>Prev: {unit.electroMeter}</span>
                              </div>
                              <Input
                                name={`elec_${unit.id}`}
                                type="number"
                                step="0.01"
                                placeholder={`Min: ${unit.electroMeter}`}
                                min={unit.electroMeter}
                                className="h-8 text-xs max-w-[120px]"
                              />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="flex justify-end pt-4 border-t border-slate-100">
                  <Button type="submit" className="text-xs sm:px-6 py-2.5">
                    Process Mass Billings & Statements
                  </Button>
                </div>
              </form>
            )}
          </div>
        )}

        {/* Tab 3: Leases & Documents */}
        {tab === 'documents' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
            
            {/* Custom Lease Agreement Generator Card */}
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-6">
              <div className="flex items-center gap-2 pb-4 border-b border-slate-100">
                <span className="inline-flex p-1.5 bg-indigo-50 text-indigo-600 rounded-lg">
                  <FileText className="h-4 w-4" />
                </span>
                <h2 className="text-xl font-bold text-slate-900">Custom Lease Generator</h2>
              </div>

              {activeTenants.length === 0 ? (
                <p className="text-sm text-slate-450 italic py-4 text-center border border-dashed border-slate-200 rounded-lg bg-slate-50/50">
                  No active tenants registered to generate custom leases.
                </p>
              ) : (
                <form action={async (formData) => {
                  'use server';
                  const tenantId = formData.get('tenantId') as string;
                  if (tenantId) {
                    await generateCustomLeaseAction(tenantId, formData);
                  }
                }} className="space-y-4 text-xs font-semibold text-slate-700">
                  <input type="hidden" name="documentType" value="lease" />
                  <div className="space-y-1.5">
                    <Label htmlFor="lease-tenant">Select Active Tenant</Label>
                    <Select id="lease-tenant" name="tenantId" required className="text-sm">
                      <option value="">-- Choose Tenant --</option>
                      {activeTenants.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.firstName} {t.lastName} {t.unit ? `(Room ${t.unit.roomNumber})` : '(No Room)'}
                        </option>
                      ))}
                    </Select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="leaseStartDate" className="text-xs">Lease Start Date</Label>
                      <Input
                        id="leaseStartDate"
                        type="date"
                        name="leaseStartDate"
                        required
                        defaultValue={new Date().toISOString().split('T')[0]}
                        className="text-sm font-normal"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="monthlyRate" className="text-xs">Monthly Rate (₱)</Label>
                      <Input
                        id="monthlyRate"
                        type="number"
                        name="monthlyRate"
                        required
                        placeholder="0.00"
                        className="text-sm font-normal"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="depositPaid" className="text-xs">Security Deposit Paid (₱)</Label>
                      <Input
                        id="depositPaid"
                        type="number"
                        name="depositPaid"
                        required
                        placeholder="0.00"
                        className="text-sm font-normal"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="advancePaid" className="text-xs">Advance Rental Paid (₱)</Label>
                      <Input
                        id="advancePaid"
                        type="number"
                        name="advancePaid"
                        required
                        placeholder="0.00"
                        className="text-sm font-normal"
                      />
                    </div>
                    <div className="flex items-center gap-3 pt-3">
                      <input
                        type="checkbox"
                        id="waterWaived"
                        name="waterWaived"
                        value="true"
                        className="h-4 w-4 rounded border-slate-300 text-indigo-650 focus:ring-indigo-500 cursor-pointer"
                      />
                      <Label htmlFor="waterWaived" className="text-xs font-semibold cursor-pointer select-none">
                        Waive Water Bill
                      </Label>
                    </div>
                    <div className="flex items-center gap-3 pt-3">
                      <input
                        type="checkbox"
                        id="elecWaived"
                        name="elecWaived"
                        value="true"
                        className="h-4 w-4 rounded border-slate-300 text-indigo-650 focus:ring-indigo-500 cursor-pointer"
                      />
                      <Label htmlFor="elecWaived" className="text-xs font-semibold cursor-pointer select-none">
                        Waive Electricity Bill
                      </Label>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="landlordSignatory" className="text-xs">Landlord Signatory Name</Label>
                      <Input
                        id="landlordSignatory"
                        type="text"
                        name="landlordSignatory"
                        required
                        defaultValue="Property Owner / Landlord"
                        className="text-sm font-normal"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="tenantSignatory" className="text-xs">Tenant Signatory Name</Label>
                      <Input
                        id="tenantSignatory"
                        type="text"
                        name="tenantSignatory"
                        required
                        defaultValue="Occupant Tenant"
                        className="text-sm font-normal"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="customRules">Custom Lease Clauses / House Rules</Label>
                    <textarea
                      id="customRules"
                      name="customRules"
                      required
                      rows={4}
                      defaultValue={`1. Tenant shall maintain peace and quiet.\n2. Utility payments must be settled within 5 days of invoice statement.\n3. Alterations to structure are strictly prohibited.`}
                      className="w-full p-2.5 border border-slate-350 rounded-lg text-xs font-normal focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow bg-white text-slate-800"
                    />
                  </div>

                  <div className="pt-2 flex gap-3">
                    <button
                      type="submit"
                      formAction="/api/documents/preview"
                      formTarget="_blank"
                      className="flex-1 text-center px-4 py-2.5 border border-slate-200 hover:border-slate-350 hover:bg-slate-50 text-slate-600 rounded-lg text-xs font-semibold transition-colors shadow-sm"
                    >
                      Preview Lease Agreement
                    </button>
                    <Button type="submit" className="flex-1 justify-center py-2.5 text-xs">
                      Generate & Save Contract
                    </Button>
                  </div>
                </form>
              )}
            </div>

            {/* Right side: Notice Generator & Upload Document Panel */}
            <div className="space-y-8">
              
              {/* Official Notices Generator Card */}
              <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-6">
                <div className="flex items-center gap-2 pb-4 border-b border-slate-100">
                  <span className="inline-flex p-1.5 bg-amber-50 text-amber-600 rounded-lg">
                    <AlertCircle className="h-4 w-4" />
                  </span>
                  <h2 className="text-xl font-bold text-slate-900">Official Notice Generator</h2>
                </div>

                {activeTenants.length === 0 ? (
                  <p className="text-sm text-slate-450 italic py-4 text-center border border-dashed border-slate-200 rounded-lg bg-slate-50/50">
                    No active tenants registered to generate notices.
                  </p>
                ) : (
                  <form action={async (formData) => {
                    'use server';
                    const tenantId = formData.get('tenantId') as string;
                    const type = formData.get('type') as 'NOTICE_ARREARS' | 'NOTICE_EVICTION';
                    if (tenantId && type) {
                      await generateNoticeAction(tenantId, type);
                    }
                  }} className="space-y-4">
                    <input type="hidden" name="documentType" value="notice" />
                    <div className="space-y-1.5">
                      <Label htmlFor="notice-tenant" className="text-xs">Select Tenant</Label>
                      <Select id="notice-tenant" name="tenantId" required className="text-sm">
                        <option value="">-- Choose Tenant --</option>
                        {activeTenants.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.firstName} {t.lastName} {t.unit ? `(Room ${t.unit.roomNumber})` : '(No Room)'}
                          </option>
                        ))}
                      </Select>
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="notice-type" className="text-xs">Notice Type</Label>
                      <Select id="notice-type" name="type" required className="text-xs">
                        <option value="NOTICE_ARREARS">Notice of Arrears (Unpaid Balances)</option>
                        <option value="NOTICE_EVICTION">Notice of Eviction (Lease Termination)</option>
                      </Select>
                    </div>

                    <div className="pt-2 flex gap-3">
                      <button
                        type="submit"
                        formAction="/api/documents/preview"
                        formTarget="_blank"
                        className="flex-1 text-center px-4 py-2.5 border border-slate-200 hover:border-slate-350 hover:bg-slate-50 text-slate-600 rounded-lg text-xs font-semibold transition-colors shadow-sm"
                      >
                        Preview Notice
                      </button>
                      <Button type="submit" className="flex-1 justify-center py-2.5 text-xs">
                        Generate & Save Notice
                      </Button>
                    </div>
                  </form>
                )}
              </div>

              {/* Central File Uploader Card */}
              <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-6">
                <div className="flex items-center gap-2 pb-4 border-b border-slate-100">
                  <span className="inline-flex p-1.5 bg-emerald-50 text-emerald-600 rounded-lg">
                    <Upload className="h-4 w-4" />
                  </span>
                  <h2 className="text-xl font-bold text-slate-900">Upload Tenant Files</h2>
                </div>

                {activeTenants.length === 0 ? (
                  <p className="text-sm text-slate-450 italic py-4 text-center border border-dashed border-slate-200 rounded-lg bg-slate-50/50">
                    No active tenants registered to upload documents to.
                  </p>
                ) : (
                  <form action={async (formData) => {
                    'use server';
                    const tenantId = formData.get('tenantId') as string;
                    if (tenantId) {
                      await uploadTenantDocumentAction(tenantId, formData);
                    }
                  }} className="space-y-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="upload-tenant" className="text-xs">Select Tenant Profile</Label>
                      <Select id="upload-tenant" name="tenantId" required className="text-sm">
                        <option value="">-- Choose Tenant --</option>
                        {activeTenants.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.firstName} {t.lastName} {t.unit ? `(Room ${t.unit.roomNumber})` : '(No Room)'}
                          </option>
                        ))}
                      </Select>
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="upload-type" className="text-xs">Document Category / Classification</Label>
                      <Select id="upload-type" name="type" required className="text-xs">
                        <option value="LEASE">Signed Custom Lease Contract</option>
                        <option value="GOVERNMENT_ID">Government Issued ID Card</option>
                        <option value="ID_VERIFICATION">Employment / Student ID Card</option>
                        <option value="BILL">External Billing Document</option>
                      </Select>
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="upload-file" className="text-xs">Select File</Label>
                      <input
                        id="upload-file"
                        type="file"
                        name="file"
                        required
                        className="w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                      />
                    </div>

                    <div className="pt-2">
                      <Button type="submit" className="w-full justify-center py-2.5 text-xs">
                        Upload Document to Tenant Profile
                      </Button>
                    </div>
                  </form>
                )}
              </div>
            </div>

          </div>
        )}

        {/* Payment Verification Tab */}
        {tab === 'payments' && (
          <div className="space-y-6">
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-5">
              <div className="flex items-center gap-2">
                <Banknote className="h-5 w-5 text-emerald-600" />
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Payment Verification Queue</h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Tenants who submitted bank/GCash proof. Verify to post the credit to their ledger.
                  </p>
                </div>
              </div>

              {pendingPayments.length === 0 ? (
                <div className="py-10 text-center border border-dashed border-slate-200 rounded-xl text-slate-400 text-sm">
                  <CheckCircle2 className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  <p>No pending payment submissions.</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {pendingPayments.map((submission) => (
                    <div key={submission.id} className="py-5 space-y-3">
                      <div className="flex items-start justify-between gap-4 flex-wrap">
                        <div>
                          <p className="font-bold text-slate-900 text-sm">
                            {submission.tenant.firstName} {submission.tenant.lastName}
                          </p>
                          <p className="text-xs text-slate-500">
                            Room {submission.lease.unit.roomNumber} · Submitted {new Date(submission.createdAt).toLocaleDateString('en-US', { dateStyle: 'medium' })}
                          </p>
                          {submission.notes && (
                            <p className="text-xs text-slate-500 mt-1 italic">{submission.notes}</p>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="text-xl font-extrabold text-emerald-700">
                            ₱{submission.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </p>
                          {submission.proofUrl && (
                            <a
                              href={submission.proofUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="text-xs text-indigo-600 font-semibold hover:underline"
                            >
                              View Proof →
                            </a>
                          )}
                        </div>
                      </div>

                      <div className="flex gap-3">
                        <form action={verifyPaymentAction.bind(null, submission.id, submission.leaseId)}>
                          <button
                            type="submit"
                            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg transition-colors"
                          >
                            ✓ Verify &amp; Post Credit
                          </button>
                        </form>
                        <form action={rejectPaymentAction.bind(null, submission.id, submission.leaseId)}>
                          <button
                            type="submit"
                            className="px-4 py-2 border border-rose-200 text-rose-600 hover:bg-rose-50 text-xs font-bold rounded-lg transition-colors"
                          >
                            ✗ Reject
                          </button>
                        </form>
                        <Link
                          href={`/leases/${submission.leaseId}?tab=payments`}
                          className="px-4 py-2 border border-slate-200 text-slate-600 hover:border-indigo-300 hover:text-indigo-700 text-xs font-semibold rounded-lg transition-colors"
                        >
                          View Lease →
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 5: Sandbox & Data Ingest */}
        {tab === 'sandbox' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            
            {/* Sandbox Database Reset */}
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-6">
              <div className="flex items-center gap-2 pb-4 border-b border-slate-100">
                <span className="inline-flex p-1.5 bg-rose-50 text-rose-600 rounded-lg">
                  <Wrench className="h-4 w-4" />
                </span>
                <h2 className="text-lg font-bold text-slate-900">Sandbox Database Operations</h2>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">
                Clears all transactional databases and seeds baseline entities (Room 101/102, occupied tenants, active leases, prepayments, and addons) for testing purposes.
              </p>

              <form action={resetAndSeedDatabaseAction}>
                <button
                  type="submit"
                  className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2.5 border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold rounded-lg text-xs transition-colors cursor-pointer"
                >
                  Reset &amp; Populate Demo Seed Data
                </button>
              </form>
            </div>

            {/* CSV Data Ingest Operations */}
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-6">
              <div className="flex items-center gap-2 pb-4 border-b border-slate-100">
                <span className="inline-flex p-1.5 bg-indigo-50 text-indigo-650 rounded-lg">
                  <Upload className="h-4 w-4" />
                </span>
                <h2 className="text-lg font-bold text-slate-900">CSV Data Ingestion</h2>
              </div>

              {/* Download Templates */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">1. Download CSV Ingest Templates</h3>
                <div className="flex gap-4">
                  <a
                    href="data:text/csv;charset=utf-8,RoomNumber,MonthlyRate,WaterMeter,ElectroMeter%0A101,5000,0,0%0A102,5500,120,1450%0A201,6000,0,0"
                    download="spaces_template.csv"
                    className="inline-flex items-center gap-1.5 text-xs text-indigo-600 hover:text-indigo-900 font-bold hover:underline"
                  >
                    📥 Spaces Template CSV
                  </a>
                  <a
                    href="data:text/csv;charset=utf-8,FirstName,LastName,Email,Phone,RoomNumber%0AAlfredo,Sanchez Jr,tildemark@gmail.com,09171234567,101%0ABeatriz,Del Prado,beatriz@example.com,09187654321,102"
                    download="tenants_template.csv"
                    className="inline-flex items-center gap-1.5 text-xs text-indigo-600 hover:text-indigo-900 font-bold hover:underline"
                  >
                    📥 Tenants Template CSV
                  </a>
                </div>
              </div>

              {/* Upload Ingest form */}
              <form action={ingestCsvDataAction} className="space-y-4 pt-4 border-t border-slate-100">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">2. Upload completed CSV files</h3>
                
                <div className="space-y-1.5">
                  <Label htmlFor="roomsCsv" className="text-xs">Upload Rooms/Spaces CSV</Label>
                  <Input id="roomsCsv" name="roomsCsv" type="file" accept=".csv" className="text-xs cursor-pointer" />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="tenantsCsv" className="text-xs">Upload Tenants CSV</Label>
                  <Input id="tenantsCsv" name="tenantsCsv" type="file" accept=".csv" className="text-xs cursor-pointer" />
                  <p className="text-[9px] text-slate-400">Note: Room spaces must be imported first before linking tenants to room numbers.</p>
                </div>

                <Button type="submit" className="w-full justify-center text-xs py-2 bg-indigo-650 hover:bg-indigo-600">
                  Upload and Ingest CSV Data
                </Button>
              </form>
            </div>

          </div>
        )}
      </div>
    </div>
  );
}

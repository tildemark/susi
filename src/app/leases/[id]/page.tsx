import { leaseService } from '@/lib/services/lease.service';
import {
  endLeaseAction, addLeaseAddonAction, removeLeaseAddonAction,
  generateLeaseDocumentAction, finalizeLeaseDocumentAction,
  postLeaseDocumentAction, uploadSignedLeaseAction
} from '@/app/actions/lease.actions';
import { verifyPaymentAction, rejectPaymentAction, recordManualPaymentAction } from '@/app/actions/payment.actions';
import { Button, Input, Label, Select } from '@/components/ui-elements';
import { FileUploadDragDrop } from '@/components/file-upload-drag-drop';
import Link from 'next/link';
import {
  ArrowLeft, FileText, CheckCircle2, XCircle, Clock, Plus,
  Upload, Eye, Banknote, Droplets, Zap, Bell, CreditCard,
  ShieldCheck, TrendingUp, AlertCircle, Printer
} from 'lucide-react';
import { notFound } from 'next/navigation';

export default async function LeaseDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ success?: string; error?: string; tab?: string }>;
}) {
  const { id } = await params;
  const { success, error, tab = 'overview' } = await searchParams;

  const lease = await leaseService.getLease(id);
  if (!lease) notFound();

  const { tenant, unit } = lease;
  const activeLease = lease.status === 'ACTIVE';

  // Financial summary from Ledger (via tenant)
  const tabLinks = [
    { key: 'overview', label: 'Overview' },
    { key: 'documents', label: `Documents (${lease.leaseDocuments.length})` },
    { key: 'addons', label: `Add-ons (${lease.addons.filter(a => a.isActive).length})` },
    { key: 'payments', label: `Payments (${lease.payments.length})` },
  ];

  const pendingPayments = lease.payments.filter((p) => p.status === 'PENDING');
  const latestDoc = lease.leaseDocuments[0];

  return (
    <div className="p-8 space-y-8 min-h-screen bg-slate-50/50">
      {/* Back */}
      <Link href="/leases" className="inline-flex items-center gap-2 text-slate-500 hover:text-slate-900 transition-colors text-sm font-medium">
        <ArrowLeft className="h-4 w-4" /> Back to Leases
      </Link>

      {/* Header */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">Lease Agreement</span>
          <h1 className="text-2xl font-extrabold text-slate-900 mt-1">
            {tenant.firstName} {tenant.lastName}
            <span className="text-slate-400 font-normal mx-2">→</span>
            Room {unit.roomNumber}
          </h1>
          <div className="flex flex-wrap gap-2 mt-2">
            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold border uppercase tracking-wider ${
              lease.status === 'ACTIVE'
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : 'bg-slate-100 text-slate-500 border-slate-200'
            }`}>
              {lease.status}
            </span>
            <span className="text-xs text-slate-500 font-medium">
              Since {new Date(lease.leaseStartDate).toLocaleDateString('en-US', { dateStyle: 'medium' })}
            </span>
            <span className="text-xs text-slate-500 font-medium">
              {lease.billingCycle === 'MONTHSARY' ? '📅 Monthsary' : '📅 End of Month'}
            </span>
          </div>
        </div>

        {activeLease && (
          <form action={endLeaseAction.bind(null, lease.id, tenant.id, unit.id)}>
            <button
              type="submit"
              className="px-4 py-2 bg-rose-50 border border-rose-200 text-rose-600 hover:bg-rose-100 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
            >
              End Lease / Checkout
            </button>
          </form>
        )}
      </div>

      {/* Notifications */}
      {success && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-sm font-medium">
          ✓ {decodeURIComponent(success)}
        </div>
      )}
      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-sm font-medium">
          ✗ {decodeURIComponent(error)}
        </div>
      )}

      {/* Pending payment alert */}
      {pendingPayments.length > 0 && (
        <div className="p-4 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl text-sm font-medium flex items-center gap-3">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <span><strong>{pendingPayments.length}</strong> payment submission(s) awaiting your verification.</span>
          <Link href={`/leases/${lease.id}?tab=payments`} className="ml-auto text-xs font-bold underline">Review →</Link>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-slate-200 gap-6 overflow-x-auto">
        {tabLinks.map(({ key, label }) => (
          <Link
            key={key}
            href={`/leases/${lease.id}?tab=${key}`}
            className={`pb-4 text-sm font-semibold transition-all border-b-2 -mb-[2px] whitespace-nowrap ${
              tab === key
                ? 'border-indigo-600 text-indigo-700 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            {label}
          </Link>
        ))}
      </div>

      {/* Tab: Overview */}
      {tab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Terms */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-5">
            <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wider">Agreed Lease Terms</h2>
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between border-b border-slate-50 pb-2">
                <dt className="text-slate-500">Monthly Rent</dt>
                <dd className="font-bold text-slate-900">₱{lease.monthlyRate.toLocaleString()}</dd>
              </div>
              <div className="flex justify-between border-b border-slate-50 pb-2">
                <dt className="text-slate-500">Security Deposit</dt>
                <dd className="font-semibold text-slate-800">₱{lease.securityDeposit.toLocaleString()}</dd>
              </div>
              <div className="flex justify-between border-b border-slate-50 pb-2">
                <dt className="text-slate-500">1-Month Advance</dt>
                <dd className="font-semibold text-slate-800">₱{lease.advancePaid.toLocaleString()}</dd>
              </div>
              <div className="flex justify-between border-b border-slate-50 pb-2">
                <dt className="text-slate-500">Advance Disposition</dt>
                <dd className="font-semibold text-slate-800">
                  {lease.advanceConsumed
                    ? lease.advanceApplied
                      ? '✓ Applied to first bill'
                      : '⏳ Will apply on first billing'
                    : '💰 Kept as prepayment'}
                </dd>
              </div>
              <div className="flex justify-between border-b border-slate-50 pb-2">
                <dt className="text-slate-500">Billing Cycle</dt>
                <dd className="font-semibold text-slate-800">
                  {lease.billingCycle === 'MONTHSARY' ? 'Every Monthsary' : 'End of Month (prorated)'}
                </dd>
              </div>
              <div className="flex justify-between border-b border-slate-50 pb-2">
                <dt className="text-slate-500">Water</dt>
                <dd className="font-semibold text-slate-800">
                  {unit.waterWaived ? '✓ Waived' : `Metered (baseline: ${unit.waterMeter} m³)`}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-500">Electricity</dt>
                <dd className="font-semibold text-slate-800">
                  {unit.elecWaived ? '✓ Waived' : `Metered (baseline: ${unit.electroMeter} kWh)`}
                </dd>
              </div>
            </dl>
          </div>

          {/* Tenant Info */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-5">
            <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wider">Tenant & Notifications</h2>
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between border-b border-slate-50 pb-2">
                <dt className="text-slate-500">Name</dt>
                <dd className="font-bold text-slate-900">{tenant.firstName} {tenant.lastName}</dd>
              </div>
              <div className="flex justify-between border-b border-slate-50 pb-2">
                <dt className="text-slate-500">Email</dt>
                <dd className="font-semibold text-slate-700 text-xs break-all">{tenant.email}</dd>
              </div>
              <div className="flex justify-between border-b border-slate-50 pb-2">
                <dt className="text-slate-500">Phone</dt>
                <dd className="font-semibold text-slate-700">{tenant.phone}</dd>
              </div>
              <div className="flex justify-between border-b border-slate-50 pb-2">
                <dt className="text-slate-500">Notify via Email</dt>
                <dd>{tenant.notifyEmail ? '✓ Yes' : '✗ No'}</dd>
              </div>
              <div className="flex justify-between border-b border-slate-50 pb-2">
                <dt className="text-slate-500">Notify via App</dt>
                <dd>{tenant.notifyApp ? '✓ Yes' : '✗ No'}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-500">Notify via SMS</dt>
                <dd className="text-slate-400">{tenant.notifySms ? '✓ Yes (stub)' : '✗ No'}</dd>
              </div>
            </dl>
            <div className="pt-2 border-t border-slate-100">
              <Link
                href={`/tenants/${tenant.id}`}
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 transition-colors"
              >
                View Full Tenant Profile →
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Documents */}
      {tab === 'documents' && (
        <div className="max-w-3xl space-y-6">
          {/* Document List */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-5">
            <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wider">Lease Documents</h2>

            {lease.leaseDocuments.length === 0 ? (
              <p className="text-sm text-slate-400 italic py-4 text-center border border-dashed border-slate-200 rounded-lg">
                No documents yet. Generate the draft below.
              </p>
            ) : (
              <div className="space-y-3">
                {lease.leaseDocuments.map((doc) => (
                  <div key={doc.id} className="flex items-center justify-between gap-4 py-3 border-b border-slate-100 last:border-0">
                    <div className="flex items-center gap-3">
                      <FileText className="h-5 w-5 text-indigo-500 shrink-0" />
                      <div>
                        <p className="text-sm font-semibold text-slate-800">{doc.label || 'Lease Document'}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                            doc.status === 'POSTED'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : doc.status === 'FINAL'
                              ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                              : 'bg-slate-100 text-slate-500 border-slate-200'
                          }`}>
                            {doc.status}
                          </span>
                          {doc.isUploaded && (
                            <span className="text-[10px] text-slate-400">Uploaded copy</span>
                          )}
                          <span className="text-[10px] text-slate-400">
                            {new Date(doc.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {doc.fileUrl ? (
                        <>
                          <a href={doc.fileUrl} target="_blank" rel="noreferrer"
                            className="text-xs text-indigo-600 font-semibold hover:underline flex items-center gap-1">
                            <Eye className="h-3.5 w-3.5" /> View
                          </a>
                          <a href={doc.fileUrl} target="_blank" rel="noreferrer"
                            className="text-xs text-slate-650 font-semibold hover:underline flex items-center gap-1 hover:text-slate-900">
                            <Printer className="h-3.5 w-3.5" /> Print
                          </a>
                          {activeLease && doc.status === 'DRAFT' && (
                            <form action={finalizeLeaseDocumentAction.bind(null, doc.id, lease.id)}>
                              <button type="submit" className="text-xs px-3 py-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-500 transition-colors font-semibold cursor-pointer">
                                Mark Final
                              </button>
                            </form>
                          )}
                          {activeLease && doc.status === 'FINAL' && (
                            <form action={postLeaseDocumentAction.bind(null, doc.id, lease.id)}>
                              <button type="submit" className="text-xs px-3 py-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-500 transition-colors font-semibold cursor-pointer">
                                Post to Tenant
                              </button>
                            </form>
                          )}
                        </>
                      ) : (
                        <span className="text-xs text-slate-400 italic">Generate draft below to view &amp; finalize</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Generate Document */}
          {activeLease && (
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-slate-800">Generate Agreement Draft</h3>
              <form action={generateLeaseDocumentAction.bind(null, lease.id)} className="flex gap-3">
                <Input name="landlordName" placeholder="Landlord / signatory name" className="flex-1 text-sm" />
                <Button type="submit" className="text-xs">Generate Draft</Button>
              </form>
            </div>
          )}

          {/* Upload Signed Copy */}
          {activeLease && (
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-slate-800">Upload Signed Agreement</h3>
              <p className="text-xs text-slate-500">Upload the signed physical copy (scanned PDF or image).</p>
              <FileUploadDragDrop leaseId={lease.id} action={uploadSignedLeaseAction.bind(null, lease.id)} />
            </div>
          )}
        </div>
      )}

      {/* Tab: Add-ons */}
      {tab === 'addons' && (
        <div className="max-w-2xl space-y-6">
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-5">
            <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wider">Recurring Add-on Services</h2>
            <p className="text-xs text-slate-400">These are automatically billed every billing cycle.</p>

            {lease.addons.length === 0 ? (
              <p className="text-sm text-slate-400 italic py-4 text-center border border-dashed border-slate-200 rounded-lg">
                No add-ons configured for this lease.
              </p>
            ) : (
              <div className="divide-y divide-slate-100">
                {lease.addons.map((addon) => (
                  <div key={addon.id} className={`flex items-center justify-between py-3 ${!addon.isActive ? 'opacity-40' : ''}`}>
                    <div>
                      <p className="text-sm font-semibold text-slate-800">{addon.description}</p>
                      <p className="text-xs text-slate-400">{addon.isActive ? 'Active — recurring monthly' : 'Inactive'}</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="font-bold text-indigo-700">₱{addon.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                      {activeLease && addon.isActive && (
                        <form action={removeLeaseAddonAction.bind(null, addon.id, lease.id)}>
                          <button type="submit" className="text-xs text-rose-600 hover:text-rose-700 font-semibold">Remove</button>
                        </form>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {activeLease && (
              <form action={addLeaseAddonAction.bind(null, lease.id)} className="border-t border-slate-100 pt-5 space-y-3">
                <h3 className="text-xs font-bold text-slate-600 uppercase tracking-wider">Add New Add-on</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="addonDesc">Description</Label>
                    <Input id="addonDesc" name="description" placeholder="e.g. WiFi, Parking" required className="text-sm" />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="addonAmount">Amount (₱)</Label>
                    <Input id="addonAmount" name="amount" type="number" step="0.01" placeholder="0.00" required className="text-sm" />
                  </div>
                </div>
                <div className="flex justify-end">
                  <Button type="submit" className="text-xs">
                    <Plus className="h-3.5 w-3.5 mr-1.5" /> Add Service
                  </Button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Tab: Payments */}
      {tab === 'payments' && (
        <div className="max-w-3xl space-y-6">

          {/* Payment History */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-4">
            <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wider">Payment Records</h2>

            {lease.payments.length === 0 ? (
              <p className="text-sm text-slate-400 italic py-4 text-center border border-dashed border-slate-200 rounded-lg">
                No payment submissions yet.
              </p>
            ) : (
              <div className="divide-y divide-slate-100">
                {lease.payments.map((p) => (
                  <div key={p.id} className="py-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold text-slate-800">
                          ₱{p.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </p>
                        <p className="text-xs text-slate-400">{new Date(p.createdAt).toLocaleDateString('en-US', { dateStyle: 'medium' })}</p>
                        {p.notes && <p className="text-xs text-slate-500 mt-0.5 italic">{p.notes}</p>}
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border ${
                          p.status === 'VERIFIED'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : p.status === 'REJECTED'
                            ? 'bg-rose-50 text-rose-700 border-rose-200'
                            : 'bg-amber-50 text-amber-700 border-amber-200'
                        }`}>
                          {p.status}
                        </span>
                        {p.proofUrl && (
                          <a href={p.proofUrl} target="_blank" rel="noreferrer"
                            className="text-xs text-indigo-600 font-semibold hover:underline">
                            View Proof
                          </a>
                        )}
                      </div>
                    </div>

                    {p.status === 'PENDING' && activeLease && (
                      <div className="flex gap-2 pt-1">
                        <form action={verifyPaymentAction.bind(null, p.id, lease.id)}>
                          <button type="submit" className="text-xs px-3 py-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-500 font-semibold transition-colors">
                            ✓ Verify & Post Credit
                          </button>
                        </form>
                        <form action={rejectPaymentAction.bind(null, p.id, lease.id)}>
                          <button type="submit" className="text-xs px-3 py-1.5 border border-rose-200 text-rose-600 rounded-lg hover:bg-rose-50 font-semibold transition-colors">
                            ✗ Reject
                          </button>
                        </form>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Record Manual (Cash) Payment */}
          {activeLease && (
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-4">
              <div className="flex items-center gap-2">
                <Banknote className="h-5 w-5 text-emerald-600" />
                <h3 className="text-sm font-bold text-slate-800">Record Cash Payment</h3>
              </div>
              <p className="text-xs text-slate-500">Landlord-confirmed. Credit posts immediately without verification.</p>

              <form action={recordManualPaymentAction.bind(null, lease.id, tenant.id)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label htmlFor="cashAmount">Amount (₱)</Label>
                    <Input id="cashAmount" name="amount" type="number" step="0.01" placeholder="0.00" required className="text-sm" />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="cashDescription">Description (optional)</Label>
                    <Input id="cashDescription" name="description" placeholder="e.g. July 2026 rent" className="text-sm" />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="cashReceipt">Upload Receipt (optional)</Label>
                  <input
                    id="cashReceipt"
                    name="receipt"
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    className="block w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100 cursor-pointer"
                  />
                </div>
                <Button type="submit" className="text-xs bg-emerald-600 hover:bg-emerald-500">
                  <Banknote className="h-3.5 w-3.5 mr-1.5" /> Record Payment
                </Button>
              </form>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

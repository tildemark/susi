import { tenantService } from '@/lib/services/tenant.service';
import { unlinkTenantAction } from '@/app/actions/tenant.actions';
import { generateLeaseAction, generateNoticeAction } from '@/app/actions/document.actions';
import { Button } from '@/components/ui-elements';
import Link from 'next/link';
import { ArrowLeft, User, Phone, Mail, FileText, Wrench, ShieldAlert } from 'lucide-react';
import { notFound } from 'next/navigation';

export default async function TenantDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const tenant = await tenantService.getTenant(id);

  if (!tenant) {
    notFound();
  }

  return (
    <div className="p-8 max-w-6xl space-y-8">
      {/* Back button */}
      <div>
        <Link href="/tenants" className="inline-flex items-center gap-2 text-slate-500 hover:text-slate-900 transition-colors text-sm font-medium">
          <ArrowLeft className="h-4 w-4" />
          Back to Tenants
        </Link>
      </div>

      {/* Profile Header */}
      <div className="flex justify-between items-start gap-4">
        <div className="flex items-center gap-4">
          <div className="h-16 w-16 bg-slate-200 border border-slate-300 rounded-2xl flex items-center justify-center text-slate-800 text-2xl font-bold">
            {tenant.firstName[0]}
            {tenant.lastName[0]}
          </div>
          <div>
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
              {tenant.firstName} {tenant.lastName}
            </h1>
            <p className="text-slate-500 text-sm mt-1 flex items-center gap-2">
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-slate-100 border border-slate-200 text-slate-600">
                Tenant ID: {tenant.id.slice(0, 8)}
              </span>
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${
                  tenant.status === 'ACTIVE'
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                    : 'bg-slate-100 text-slate-500 border border-slate-200'
                }`}
              >
                {tenant.status}
              </span>
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left main info */}
        <div className="lg:col-span-2 space-y-8">
          {/* Card: Contact Details */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900">Contact Info</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                <Mail className="h-5 w-5 text-indigo-600" />
                <div>
                  <p className="text-xs text-slate-500 font-medium">Email Address</p>
                  <p className="text-sm font-semibold text-slate-800">{tenant.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                <Phone className="h-5 w-5 text-indigo-600" />
                <div>
                  <p className="text-xs text-slate-500 font-medium">Phone Number</p>
                  <p className="text-sm font-semibold text-slate-800">{tenant.phone}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Card: Ledger Logs */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900">Ledger Activities</h2>
            {tenant.ledgers.length === 0 ? (
              <p className="text-sm text-slate-400 py-4 text-center border border-dashed border-slate-200 rounded-lg">
                No ledger transactions logged for this tenant.
              </p>
            ) : (
              <div className="space-y-3">
                {tenant.ledgers.map((l) => (
                  <div key={l.id} className="flex justify-between items-center text-sm border-b border-slate-100 pb-2">
                    <div>
                      <p className="font-semibold text-slate-800">{l.description}</p>
                      <p className="text-xs text-slate-500">{new Date(l.date).toLocaleDateString()}</p>
                    </div>
                    <span className={`font-semibold ${l.type === 'CHARGE' ? 'text-rose-600' : 'text-emerald-600'}`}>
                      {l.type === 'CHARGE' ? '+' : '-'}₱{l.amount.toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right side info panel */}
        <div className="space-y-8">
          {/* Assigned Space Card */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-6 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <User className="h-5 w-5 text-indigo-600" />
              Space Inventory Assignment
            </h2>

            {tenant.unit ? (
              <div className="space-y-4">
                <div className="p-3 bg-slate-50 rounded-lg">
                  <span className="text-xs text-slate-500 block font-medium">Assigned Unit</span>
                  <Link href={`/units/${tenant.unit.id}`} className="text-lg font-bold text-indigo-650 hover:underline mt-1 block">
                    {tenant.unit.roomNumber}
                  </Link>
                  <span className="text-xs text-indigo-600 font-semibold block mt-0.5">
                    Monthly Rent: ₱{tenant.unit.monthlyRate.toLocaleString()}
                  </span>
                </div>

                <div className="flex flex-col gap-2 pt-2 border-t border-slate-100">
                  <form action={generateLeaseAction.bind(null, tenant.id)}>
                    <Button type="submit" className="w-full justify-center text-xs">
                      Generate Lease Agreement
                    </Button>
                  </form>

                  <form action={generateNoticeAction.bind(null, tenant.id, 'NOTICE_ARREARS')}>
                    <button
                      type="submit"
                      className="w-full text-center px-4 py-2 bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-750 rounded-lg text-xs font-semibold transition-all"
                    >
                      Issue Arrears Notice
                    </button>
                  </form>

                  <form action={generateNoticeAction.bind(null, tenant.id, 'NOTICE_EVICTION')}>
                    <button
                      type="submit"
                      className="w-full text-center px-4 py-2 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-600 rounded-lg text-xs font-semibold transition-all"
                    >
                      Issue Eviction Notice
                    </button>
                  </form>
                </div>

                <form action={unlinkTenantAction.bind(null, tenant.id, tenant.unitId)} className="pt-2 border-t border-slate-100">
                  <button
                    type="submit"
                    className="w-full text-center px-4 py-2 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-600 rounded-lg text-sm font-semibold transition-all"
                  >
                    Unlink Tenant from Unit
                  </button>
                </form>
              </div>
            ) : (
              <div className="text-center py-6">
                <p className="text-slate-400 text-sm">Tenant currently has no room assigned.</p>
              </div>
            )}
          </div>

          {/* Documents Card */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900">Leases & Notices</h2>
            {tenant.documents.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-2">No documents issued.</p>
            ) : (
              <div className="space-y-2 text-xs">
                {tenant.documents.map((doc: any) => (
                  <div key={doc.id} className="flex justify-between items-center border-b border-slate-100 pb-2">
                    <div>
                      <p className="font-bold text-slate-700">{doc.type}</p>
                      <p className="text-slate-400 mt-0.5">{new Date(doc.createdAt).toLocaleDateString()}</p>
                    </div>
                    <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer" className="font-bold text-indigo-600 hover:underline">
                      Download
                    </a>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Ledger Preferences Card */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900">Billing Settings</h2>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Security Deposit:</span>
                <span className="font-semibold text-slate-900">₱{tenant.depositPaid.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-555 font-medium">Advance Rent:</span>
                <span className="font-semibold text-slate-900">₱{tenant.advancePaid.toLocaleString()}</span>
              </div>
              <div className="flex justify-between border-t border-slate-100 pt-2">
                <span className="text-slate-555 font-medium">Invoice Method:</span>
                <span className="font-semibold text-indigo-600">{tenant.billingPreference}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-555 font-medium">App access:</span>
                <span className="font-semibold text-slate-700">{tenant.appAccess ? 'Invite Sent' : 'Disabled'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

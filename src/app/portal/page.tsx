import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { notFound, redirect } from 'next/navigation';
import { CreditCard, Calendar, FileText, User, Wrench } from 'lucide-react';
import Link from 'next/link';
import { createMaintenanceAction } from '@/app/actions/maintenance.actions';
import { Button, Input, Label } from '@/components/ui-elements';

export const revalidate = 0; // Dynamic rendering

export default async function TenantPortalPage() {
  const session = await auth();

  if (!session || !session.user || (session.user as any).role !== 'TENANT') {
    redirect('/login');
  }

  const tenantId = (session.user as any).id;
  const tenant = await db.tenant.findUnique({
    where: { id: tenantId },
    include: {
      unit: true,
      ledgers: { orderBy: { date: 'desc' } },
      documents: { orderBy: { createdAt: 'desc' } },
    },
  });

  if (!tenant) {
    notFound();
  }

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex justify-between items-center border-b border-slate-200 pb-6">
        <div>
          <span className="text-xs font-bold bg-indigo-50 border border-indigo-100 text-indigo-700 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
            Tenant Space Portal
          </span>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight mt-2">
            Welcome, {tenant.firstName}!
          </h1>
          <p className="text-slate-500 text-sm mt-1">Manage payments, view lease details, and download invoices.</p>
        </div>
        <Link
          href="/api/auth/signout"
          className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-lg text-sm font-semibold transition-colors"
        >
          Sign Out
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Details Panel */}
        <div className="lg:col-span-2 space-y-8">
          {/* Card: Account Ledgers */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-indigo-600" />
              Invoice & Transactions History
            </h2>

            {tenant.ledgers.length === 0 ? (
              <p className="text-sm text-slate-400 py-6 text-center border border-dashed border-slate-200 rounded-lg">
                No ledger transactions recorded yet.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50">
                      <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Date</th>
                      <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Description</th>
                      <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Amount</th>
                      <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {tenant.ledgers.map((l) => (
                      <tr key={l.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-500">
                          {new Date(l.date).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-700">{l.description}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm font-semibold">
                          <span className={l.type === 'CHARGE' ? 'text-rose-600' : 'text-emerald-600'}>
                            {l.type === 'CHARGE' ? '+' : '-'}₱{l.amount.toLocaleString()}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-650">
                          {l.isVerified ? 'Settled' : 'Pending Verification'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar Info Panel */}
        <div className="space-y-8">
          {/* Card: Leased Room */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <User className="h-5 w-5 text-indigo-600" />
              Room & Rates
            </h2>

            {tenant.unit ? (
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">Assigned Unit:</span>
                  <span className="font-bold text-slate-900">{tenant.unit.roomNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">Monthly Rent:</span>
                  <span className="font-semibold text-slate-900">₱{tenant.unit.monthlyRate.toLocaleString()}</span>
                </div>
                <div className="flex justify-between border-t border-slate-100 pt-2">
                  <span className="text-slate-500 font-medium">Water Meter:</span>
                  <span className="font-medium text-slate-700">{tenant.unit.waterMeter} m³</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">Electro Meter:</span>
                  <span className="font-medium text-slate-700">{tenant.unit.electroMeter} kWh</span>
                </div>
              </div>
            ) : (
              <p className="text-sm text-slate-400 text-center py-4">No unit assigned to your account.</p>
            )}
          </div>

          {/* Card: Documents Repository */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <FileText className="h-5 w-5 text-indigo-600" />
              Leases & Notices
            </h2>

            {tenant.documents.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-4">No documents generated yet.</p>
            ) : (
              <div className="space-y-3.5">
                {tenant.documents.map((doc) => (
                  <div key={doc.id} className="flex justify-between items-center text-xs border-b border-slate-100 pb-2">
                    <div>
                      <p className="font-bold text-slate-800">{doc.type}</p>
                      <p className="text-slate-400 mt-0.5">{new Date(doc.createdAt).toLocaleDateString()}</p>
                    </div>
                    <a
                      href={doc.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-bold text-indigo-650 hover:underline"
                    >
                      Download
                    </a>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Card: File Maintenance Ticket */}
          {tenant.unit && (
            <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4 shadow-sm">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Wrench className="h-5 w-5 text-indigo-600" />
                Submit Maintenance Request
              </h2>

              <form action={createMaintenanceAction} className="space-y-3">
                <input type="hidden" name="unitId" value={tenant.unit.id} />
                <input type="hidden" name="tenantId" value={tenant.id} />

                <div className="space-y-1">
                  <Label htmlFor="title">Issue Summary</Label>
                  <Input id="title" name="title" placeholder="e.g. Leaking faucet, broken light" required />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="description">Details</Label>
                  <Input id="description" name="description" placeholder="Describe the issue in detail" required />
                </div>

                <Button type="submit" className="w-full justify-center text-xs py-2">
                  Submit Request
                </Button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

import { leaseService } from '@/lib/services/lease.service';
import Link from 'next/link';
import { ArrowRight, FileText, Plus, Building2, User, Calendar, CheckCircle2, Clock, XCircle } from 'lucide-react';

export const revalidate = 0;

export default async function LeasesPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string; error?: string }>;
}) {
  const { success, error } = await searchParams;
  const leases = await leaseService.getLeases();

  const activeLeases = leases.filter((l) => l.status === 'ACTIVE');
  const endedLeases = leases.filter((l) => l.status === 'ENDED');

  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Lease Agreements</h1>
          <p className="text-slate-500 mt-1 text-sm">
            Manage all tenant lease agreements, documents, addons, and payment records.
          </p>
        </div>
        <Link
          href="/leases/new"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl shadow-md transition-all hover:scale-[1.02] text-sm"
        >
          <Plus className="h-4 w-4" /> New Lease
        </Link>
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

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Active Leases</p>
          <p className="text-3xl font-extrabold text-indigo-600 mt-1">{activeLeases.length}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Ended Leases</p>
          <p className="text-3xl font-extrabold text-slate-500 mt-1">{endedLeases.length}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Pending Payments</p>
          <p className="text-3xl font-extrabold text-amber-600 mt-1">
            {leases.reduce((sum, l) => sum + (l.payments?.length ?? 0), 0)}
          </p>
        </div>
      </div>

      {/* Active Leases */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5 text-emerald-600" />
          <h2 className="text-lg font-bold text-slate-900">Active Leases</h2>
        </div>

        {activeLeases.length === 0 ? (
          <div className="px-6 py-12 text-center text-slate-400 text-sm">
            No active leases. <Link href="/leases/new" className="text-indigo-600 font-semibold hover:underline">Create one →</Link>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {activeLeases.map((lease) => (
              <div key={lease.id} className="px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/50 transition-colors">
                <div className="flex items-start gap-4">
                  <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl shrink-0">
                    <FileText className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-slate-900">
                        {lease.tenant.firstName} {lease.tenant.lastName}
                      </span>
                      <span className="text-slate-400 text-xs">→</span>
                      <span className="text-slate-700 font-semibold text-sm">
                        Room {lease.unit.roomNumber}
                      </span>
                      {lease.payments && lease.payments.length > 0 && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-full text-[10px] font-bold uppercase">
                          <Clock className="h-3 w-3" /> {lease.payments.length} pending
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-slate-500 flex-wrap">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5" />
                        Since {new Date(lease.leaseStartDate).toLocaleDateString('en-US', { dateStyle: 'medium' })}
                      </span>
                      <span>₱{lease.monthlyRate.toLocaleString()}/mo</span>
                      <span className="capitalize">{lease.billingCycle === 'MONTHSARY' ? 'Monthsary' : 'End of Month'}</span>
                      {lease.addons.length > 0 && (
                        <span className="text-indigo-600 font-semibold">{lease.addons.length} add-on(s)</span>
                      )}
                    </div>
                  </div>
                </div>
                <Link
                  href={`/leases/${lease.id}`}
                  className="inline-flex items-center gap-1.5 px-4 py-2 border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 rounded-lg text-xs font-semibold transition-colors shrink-0"
                >
                  Manage <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Ended Leases */}
      {endedLeases.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
            <XCircle className="h-5 w-5 text-slate-400" />
            <h2 className="text-lg font-bold text-slate-500">Ended Leases</h2>
          </div>
          <div className="divide-y divide-slate-100">
            {endedLeases.map((lease) => (
              <div key={lease.id} className="px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 opacity-60">
                <div className="flex items-start gap-4">
                  <div className="p-2.5 bg-slate-100 text-slate-400 rounded-xl shrink-0">
                    <FileText className="h-5 w-5" />
                  </div>
                  <div>
                    <span className="font-semibold text-slate-700">
                      {lease.tenant.firstName} {lease.tenant.lastName}
                    </span>
                    <span className="text-slate-400 text-xs mx-2">→</span>
                    <span className="text-slate-600 font-medium text-sm">Room {lease.unit.roomNumber}</span>
                    <p className="text-xs text-slate-400 mt-0.5">
                      ₱{lease.monthlyRate.toLocaleString()}/mo · {new Date(lease.leaseStartDate).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <Link
                  href={`/leases/${lease.id}`}
                  className="inline-flex items-center gap-1.5 px-4 py-2 border border-slate-200 text-slate-500 rounded-lg text-xs font-semibold transition-colors shrink-0"
                >
                  View <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

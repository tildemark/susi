import { ledgerService } from '@/lib/services/ledger.service';
import { tenantService } from '@/lib/services/tenant.service';
import { createLedgerEntryAction, verifyLedgerEntryAction } from '../actions/ledger.actions';
import { Button, Input, Label, Select } from '@/components/ui-elements';
import { CreditCard, ArrowUpRight, ArrowDownLeft, ShieldAlert } from 'lucide-react';

export const revalidate = 0; // Dynamic rendering

export default async function LedgerPage() {
  const ledgers = await ledgerService.getLedgers();
  const tenants = await tenantService.getTenants();

  // Active tenants only for payment options
  const activeTenants = tenants.filter((t) => t.status === 'ACTIVE' && t.unit);

  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Financial Ledger</h1>
        <p className="text-slate-500 mt-2">Log manual rental fees, track utility charges, and verify tenant payments.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Record Transaction Form */}
        <div className="lg:col-span-1">
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-6">
            <div>
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-indigo-600" />
                Record Transaction
              </h2>
              <p className="text-slate-500 text-xs mt-1">Log payments, credits, or charges manually.</p>
            </div>

            {activeTenants.length === 0 ? (
              <p className="text-sm text-slate-500 py-4 text-center border border-dashed border-slate-200 rounded-lg">
                No active tenants associated with a unit available.
              </p>
            ) : (
              <form action={createLedgerEntryAction} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="tenantId">Tenant / Unit</Label>
                  <Select id="tenantId" name="tenantId" required>
                    {activeTenants.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.firstName} {t.lastName} ({t.unit?.roomNumber})
                      </option>
                    ))}
                  </Select>
                  {/* Keep unitId hidden or passed implicitly. For ease, we map it via action or simple input */}
                  {/* We can dynamically fetch unitId inside the server action, but let's pass a helper element */}
                  <Input type="hidden" name="unitId" value={activeTenants[0]?.unitId || ''} />
                </div>

                {/* Quick JS script injection would be cleaner to map tenant to unit, but to keep it simple, the server action can fetch unitId directly from tenantId. Let's make sure ledger.actions fetches it. */}

                <div className="space-y-1.5">
                  <Label htmlFor="type">Transaction Type</Label>
                  <Select id="type" name="type" required>
                    <option value="PAYMENT">PAYMENT (Received Rent/Fees)</option>
                    <option value="CHARGE">CHARGE (Add Charge Invoice)</option>
                    <option value="CREDIT">CREDIT (Add Credit adjustments)</option>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="amount">Amount (₱)</Label>
                  <Input id="amount" name="amount" type="number" step="0.01" placeholder="e.g. 5000" required />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="description">Description</Label>
                  <Input id="description" name="description" placeholder="e.g. Cash payment rent June" required />
                </div>

                <Button type="submit" className="w-full justify-center">
                  Record Entry
                </Button>
              </form>
            )}
          </div>
        </div>

        {/* Global Transactions Log */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-4">
            <h2 className="text-lg font-bold text-slate-900">Ledger Statement</h2>

            {ledgers.length === 0 ? (
              <p className="text-sm text-slate-500 py-8 text-center border border-dashed border-slate-200 rounded-lg">
                No ledger transactions recorded.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50">
                      <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Date</th>
                      <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Tenant (Unit)</th>
                      <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Description</th>
                      <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Amount</th>
                      <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {ledgers.map((l) => (
                      <tr key={l.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-500">
                          {new Date(l.date).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm font-semibold text-slate-900">
                          {l.tenant.firstName} {l.tenant.lastName} ({l.unit.roomNumber})
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-600 max-w-xs truncate">
                          {l.description}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm font-semibold">
                          <span className={l.type === 'CHARGE' ? 'text-rose-600' : 'text-emerald-600'}>
                            {l.type === 'CHARGE' ? '+' : '-'}₱{l.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm">
                          {l.isVerified ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-100">
                              Verified
                            </span>
                          ) : (
                            <form action={verifyLedgerEntryAction.bind(null, l.id, l.unitId, l.tenantId)}>
                              <button
                                type="submit"
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-semibold bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 transition-colors"
                              >
                                <ShieldAlert className="h-3.5 w-3.5" />
                                Verify
                              </button>
                            </form>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

import { unitService } from '@/lib/services/unit.service';
import { tenantService } from '@/lib/services/tenant.service';
import { updateUnitMetersAction, updateUnitStatusAction } from '@/app/actions/unit.actions';
import { linkTenantAction } from '@/app/actions/tenant.actions';
import { Button, Input, Label, Select } from '@/components/ui-elements';
import Link from 'next/link';
import { ArrowLeft, User, CreditCard, Droplets, Zap, ShieldAlert } from 'lucide-react';
import { notFound } from 'next/navigation';
import { UnitStatus } from '@prisma/client';

export default async function UnitDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const unit = await unitService.getUnit(id);

  if (!unit) {
    notFound();
  }

  const allTenants = await tenantService.getTenants();
  const unassignedTenants = allTenants.filter((t) => !t.unitId && t.status === 'ACTIVE');
  const activeTenant = unit.tenants.find((t) => t.status === 'ACTIVE');

  return (
    <div className="p-8 max-w-6xl space-y-8">
      {/* Back button */}
      <div>
        <Link href="/units" className="inline-flex items-center gap-2 text-slate-500 hover:text-slate-900 transition-colors text-sm font-medium">
          <ArrowLeft className="h-4 w-4" />
          Back to Units
        </Link>
      </div>

      {/* Header and Quick Status Updates */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <span className="text-sm font-semibold uppercase tracking-wider text-indigo-600">Unit Details</span>
          <h1 className="text-4xl font-bold text-slate-900 tracking-tight mt-1">{unit.roomNumber}</h1>
        </div>
        
        <div className="flex gap-2">
          {['VACANT', 'OCCUPIED', 'MAINTENANCE'].map((status) => (
            <form key={status} action={updateUnitStatusAction.bind(null, unit.id, status as UnitStatus)}>
              <button
                type="submit"
                disabled={unit.status === status}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                  unit.status === status
                    ? status === 'VACANT'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-100 cursor-default'
                      : status === 'OCCUPIED'
                      ? 'bg-indigo-50 text-indigo-700 border-indigo-100 cursor-default'
                      : 'bg-amber-50 text-amber-700 border-amber-100 cursor-default'
                    : 'bg-white text-slate-600 border-slate-200 hover:text-slate-900 hover:border-slate-300'
                }`}
              >
                {status}
              </button>
            </form>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Details Panel */}
        <div className="lg:col-span-2 space-y-8">
          {/* Card: Meter Readings */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-6 shadow-sm">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Meter Readings</h2>
              <p className="text-slate-500 text-sm mt-1">Update utility trackers for current usage periods.</p>
            </div>
            
            <form action={updateUnitMetersAction.bind(null, unit.id)} className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="waterMeter" className="flex items-center gap-2">
                  <Droplets className="h-4 w-4 text-cyan-600" />
                  Water Meter (m³)
                </Label>
                <Input
                  id="waterMeter"
                  name="waterMeter"
                  type="number"
                  step="0.01"
                  defaultValue={unit.waterMeter}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="electroMeter" className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-amber-600" />
                  Electricity Meter (kWh)
                </Label>
                <Input
                  id="electroMeter"
                  name="electroMeter"
                  type="number"
                  step="0.01"
                  defaultValue={unit.electroMeter}
                  required
                />
              </div>

              <div className="md:col-span-2 flex justify-end">
                <Button type="submit">Update Meter Readings</Button>
              </div>
            </form>
          </div>

          {/* Card: Ledger Logs */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4 shadow-sm">
            <h2 className="text-xl font-bold text-slate-900">Recent Ledger Activities</h2>
            {unit.ledgers.length === 0 ? (
              <p className="text-sm text-slate-400 py-4 text-center border border-dashed border-slate-200 rounded-lg">
                No financial transactions logged yet.
              </p>
            ) : (
              <div className="space-y-3">
                {unit.ledgers.map((l) => (
                  <div key={l.id} className="flex justify-between items-center text-sm border-b border-slate-100 pb-2">
                    <div>
                      <p className="font-semibold text-slate-800">{l.description}</p>
                      <p className="text-xs text-slate-550">{new Date(l.date).toLocaleDateString()}</p>
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

        {/* Sidebar Info Panel */}
        <div className="space-y-8">
          {/* Card: Occupant detail */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-6 shadow-sm">
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <User className="h-5 w-5 text-indigo-600" />
              Active Occupant
            </h2>

            {activeTenant ? (
              <div className="space-y-4">
                <div>
                  <p className="text-lg font-bold text-slate-900">
                    {activeTenant.firstName} {activeTenant.lastName}
                  </p>
                  <p className="text-slate-500 text-sm">{activeTenant.email}</p>
                  <p className="text-slate-500 text-sm mt-1">{activeTenant.phone}</p>
                </div>
                
                <div className="border-t border-slate-100 pt-4 flex flex-col gap-2">
                  <Link
                    href={`/tenants/${activeTenant.id}`}
                    className="text-center px-4 py-2 border border-slate-200 hover:border-slate-300 hover:text-slate-900 rounded-lg text-slate-500 transition-colors text-sm font-semibold"
                  >
                    View Tenant Profile
                  </Link>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-slate-400 text-sm text-center">This space is currently vacant.</p>
                
                {unassignedTenants.length > 0 ? (
                  <form action={async (formData) => {
                    'use server';
                    const tenantId = formData.get('tenantId') as string;
                    if (tenantId) {
                      await linkTenantAction(tenantId, unit.id);
                    }
                  }} className="space-y-3 pt-2 border-t border-slate-100">
                    <Label htmlFor="tenantId">Assign Existing Tenant</Label>
                    <Select id="tenantId" name="tenantId" required>
                      <option value="">-- Choose Tenant --</option>
                      {unassignedTenants.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.firstName} {t.lastName}
                        </option>
                      ))}
                    </Select>
                    <Button type="submit" className="w-full justify-center text-xs">
                      Assign Selected Tenant
                    </Button>
                  </form>
                ) : (
                  <p className="text-slate-450 text-xs text-center italic">No unassigned active tenants available.</p>
                )}

                <div className="pt-2 border-t border-slate-100">
                  <Link
                    href="/tenants/new"
                    className="inline-flex w-full justify-center px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-sm font-semibold transition-colors shadow-sm"
                  >
                    Register New Tenant
                  </Link>
                </div>
              </div>
            )}
          </div>

          {/* Quick Rates Card */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4 shadow-sm">
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-indigo-600" />
              Pricing Detail
            </h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">Monthly Rent:</span>
                <span className="font-semibold text-slate-900">
                  ₱{unit.monthlyRate.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

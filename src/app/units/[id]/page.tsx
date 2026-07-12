import { unitService } from '@/lib/services/unit.service';
import { tenantService } from '@/lib/services/tenant.service';
import { updateUnitMetersAction, updateUnitStatusAction } from '@/app/actions/unit.actions';
import { linkTenantAction, unlinkTenantAction, addTenantAddonAction } from '@/app/actions/tenant.actions';
import { computeBillAction } from '@/app/actions/billing.actions';
import { Button, Input, Label, Select } from '@/components/ui-elements';
import Link from 'next/link';
import { ArrowLeft, User, CreditCard, Droplets, Zap, ShieldAlert, Wrench, TrendingUp, History } from 'lucide-react';
import { notFound } from 'next/navigation';
import { UnitStatus } from '@prisma/client';

export default async function UnitDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ success?: string; error?: string; tab?: string }>;
}) {
  const { id } = await params;
  const { success, error, tab = 'overview' } = await searchParams;
  const unit = await unitService.getUnit(id);

  if (!unit) {
    notFound();
  }

  const allTenants = await tenantService.getTenants();
  const unassignedTenants = allTenants.filter((t) => !t.unitId && t.status === 'ACTIVE');
  const activeTenant = unit.tenants.find((t) => t.status === 'ACTIVE');
  const addOns = unit.ledgers.filter(
    (l) =>
      l.type === 'CHARGE' &&
      !l.description.toLowerCase().includes('rent') &&
      !l.description.toLowerCase().includes('water') &&
      !l.description.toLowerCase().includes('electr') &&
      !l.description.toLowerCase().includes('late fee')
  );

  const chartPeriods = [...unit.billPeriods].slice(0, 6).reverse();
  const maxWaterVal = Math.max(...chartPeriods.map(x => Math.max(x.currWater - x.prevWater, 0)), 1);
  const maxElecVal = Math.max(...chartPeriods.map(x => Math.max(x.currElec - x.prevElec, 0)), 1);

  const width = 500;
  const height = 150;
  const paddingLeft = 40;
  const paddingRight = 20;
  const paddingTop = 15;
  const paddingBottom = 25;
  const chartWidth = width - paddingLeft - paddingRight;
  const chartHeight = height - paddingTop - paddingBottom;

  const N = chartPeriods.length;
  const waterPoints = chartPeriods.map((bp, i) => {
    const w = Math.max(0, bp.currWater - bp.prevWater);
    const x = paddingLeft + (N > 1 ? (i / (N - 1)) * chartWidth : chartWidth / 2);
    const y = paddingTop + chartHeight - (w / maxWaterVal) * chartHeight;
    return { x, y, value: w, label: `${new Date(0, bp.month - 1).toLocaleString('en-US', { month: 'short' })}` };
  });

  const elecPoints = chartPeriods.map((bp, i) => {
    const e = Math.max(0, bp.currElec - bp.prevElec);
    const x = paddingLeft + (N > 1 ? (i / (N - 1)) * chartWidth : chartWidth / 2);
    const y = paddingTop + chartHeight - (e / maxElecVal) * chartHeight;
    return { x, y, value: e };
  });

  const waterPath = waterPoints.map(p => `${p.x},${p.y}`).join(' ');
  const elecPath = elecPoints.map(p => `${p.x},${p.y}`).join(' ');

  return (
    <div className="p-8 w-full space-y-8 bg-slate-50/50 min-h-screen">
      {/* Back button */}
      <div>
        <Link href="/units" className="inline-flex items-center gap-2 text-slate-500 hover:text-slate-900 transition-colors text-sm font-medium">
          <ArrowLeft className="h-4 w-4" />
          Back to Units
        </Link>
      </div>

      {/* Header and Status Summary */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-indigo-650">Space Details</span>
          <h1 className="text-3xl font-extrabold text-slate-900 mt-1">Room {unit.roomNumber}</h1>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Current Status</span>
          <span className={`inline-flex px-3.5 py-1.5 rounded-full text-xs font-extrabold border uppercase tracking-wider ${
            unit.status === 'VACANT'
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
              : unit.status === 'OCCUPIED'
              ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
              : 'bg-amber-50 text-amber-700 border-amber-200'
          }`}>
            {unit.status}
          </span>
        </div>
      </div>

      {/* Status Notifications */}
      {success && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl flex items-start gap-3 shadow-sm">
          <div className="p-1 bg-emerald-100 text-emerald-700 rounded-lg">
            <ShieldAlert className="h-4 w-4 text-emerald-600" />
          </div>
          <div>
            <p className="font-semibold text-sm">Update Successful</p>
            <p className="text-xs text-emerald-700 mt-0.5">{decodeURIComponent(success)}</p>
          </div>
        </div>
      )}

      {/* Tabs Navigation */}
      <div className="flex border-b border-slate-200 gap-6">
        <Link
          href={`/units/${unit.id}?tab=overview`}
          className={`pb-4 text-sm font-semibold transition-all border-b-2 -mb-[2px] ${
            tab === 'overview'
              ? 'border-indigo-600 text-indigo-650 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          Overview
        </Link>
        <Link
          href={`/units/${unit.id}?tab=utilities`}
          className={`pb-4 text-sm font-semibold transition-all border-b-2 -mb-[2px] ${
            tab === 'utilities'
              ? 'border-indigo-600 text-indigo-650 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          Utilities & Billing
        </Link>
        <Link
          href={`/units/${unit.id}?tab=addons`}
          className={`pb-4 text-sm font-semibold transition-all border-b-2 -mb-[2px] ${
            tab === 'addons'
              ? 'border-indigo-600 text-indigo-650 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          Add-on Services
        </Link>
        <Link
          href={`/units/${unit.id}?tab=ledger`}
          className={`pb-4 text-sm font-semibold transition-all border-b-2 -mb-[2px] ${
            tab === 'ledger'
              ? 'border-indigo-600 text-indigo-650 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          Finances & Ledger
        </Link>
        <Link
          href={`/units/${unit.id}?tab=maintenance`}
          className={`pb-4 text-sm font-semibold transition-all border-b-2 -mb-[2px] ${
            tab === 'maintenance'
              ? 'border-indigo-600 text-indigo-650 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          Maintenance ({unit.maintenanceRequests?.length || 0})
        </Link>
      </div>

      {/* Tab Panels */}
      <div className="space-y-8">
        
        {/* Tab 1: Overview */}
        {tab === 'overview' && (
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-8 w-full">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
              
              {/* Left Side: Unit Summary */}
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider">Unit Configurations</h3>
                  <p className="text-xs text-slate-400 mt-1">Rates, meter baselines, and status options.</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Price */}
                  <div className="bg-slate-50 rounded-xl p-4 flex items-center gap-3 border border-slate-100">
                    <div className="p-3 bg-white rounded-lg shadow-sm border border-slate-100">
                      <CreditCard className="h-5 w-5 text-indigo-600" />
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Monthly Lease Rate</p>
                      <p className="text-base font-extrabold text-slate-900 mt-0.5">
                        ₱{unit.monthlyRate.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                  </div>

                  {/* Meters */}
                  <div className="bg-slate-50 rounded-xl p-4 flex items-center gap-3 border border-slate-100">
                    <div className="p-3 bg-white rounded-lg shadow-sm border border-slate-100 flex gap-0.5">
                      <Droplets className="h-4 w-4 text-cyan-600" />
                      <Zap className="h-4 w-4 text-amber-600" />
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Meter Baseline</p>
                      <p className="text-xs font-semibold text-slate-700 mt-0.5">
                        W: <span className="font-extrabold text-slate-900">{unit.waterMeter} m³</span>
                      </p>
                      <p className="text-xs font-semibold text-slate-700">
                        E: <span className="font-extrabold text-slate-900">{unit.electroMeter} kWh</span>
                      </p>
                    </div>
                  </div>
                </div>

                {/* Quick Status Toggles */}
                <div className="pt-2 border-t border-slate-100/80">
                  <p className="text-xs font-semibold text-slate-450 uppercase tracking-wider mb-2 text-slate-500">Update Status</p>
                  <div className="flex flex-wrap gap-2">
                    {['VACANT', 'OCCUPIED', 'MAINTENANCE'].map((status) => (
                      <form key={status} action={updateUnitStatusAction.bind(null, unit.id, status as UnitStatus)}>
                        <button
                          type="submit"
                          disabled={unit.status === status}
                          className={`px-3.5 py-2 rounded-lg text-xs font-semibold border transition-all ${
                            unit.status === status
                              ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-default font-bold shadow-inner'
                              : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50 hover:border-slate-350 shadow-sm'
                          }`}
                        >
                          {status}
                        </button>
                      </form>
                    ))}
                  </div>
                </div>
              </div>

              {/* Right Side: Current Occupant details */}
              <div className="space-y-6 md:border-l md:border-slate-150 md:pl-8">
                <div>
                  <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider">Current Occupant</h3>
                  <p className="text-xs text-slate-400 mt-1">Tenant profile details and tenancy state.</p>
                </div>

                {activeTenant ? (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Tenant Name</p>
                        <p className="text-base font-bold text-slate-900">
                          {activeTenant.firstName} {activeTenant.lastName}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Lease Started</p>
                        <p className="text-sm font-semibold text-slate-800">
                          {new Date(activeTenant.leaseStartDate).toLocaleDateString(undefined, {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                          })}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Email Address</p>
                        <p className="text-xs font-medium text-slate-700 break-all">{activeTenant.email}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Phone Number</p>
                        <p className="text-xs font-medium text-slate-700">{activeTenant.phone}</p>
                      </div>
                    </div>

                    <div className="flex gap-3 pt-4 border-t border-slate-100/80">
                      <Link
                        href={`/tenants/${activeTenant.id}`}
                        className="flex-1 text-center px-4 py-2 border border-slate-200 hover:border-slate-350 hover:bg-slate-50 rounded-lg text-slate-600 transition-colors text-xs font-semibold shadow-sm"
                      >
                        View Tenant Profile
                      </Link>
                      <form action={unlinkTenantAction.bind(null, activeTenant.id, unit.id)} className="flex-1">
                        <button
                          type="submit"
                          className="w-full text-center px-4 py-2 bg-rose-50 border border-rose-200 hover:border-rose-350 hover:bg-rose-100 text-rose-600 rounded-lg text-xs font-semibold transition-colors shadow-sm"
                        >
                          Checkout Tenant
                        </button>
                      </form>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <p className="text-slate-500 text-sm italic">
                      This space is currently vacant. No tenant is assigned.
                    </p>

                    <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 space-y-4">
                      {unassignedTenants.length > 0 ? (
                        <form action={async (formData) => {
                          'use server';
                          const tenantId = formData.get('tenantId') as string;
                          if (tenantId) {
                            await linkTenantAction(tenantId, unit.id);
                          }
                        }} className="space-y-3">
                          <Label htmlFor="tenantId" className="text-xs uppercase tracking-wider font-bold">Assign Active Tenant</Label>
                          <div className="flex flex-col sm:flex-row gap-3">
                            <Select id="tenantId" name="tenantId" required className="flex-1 text-xs bg-white">
                              <option value="">-- Select Active Tenant --</option>
                              {unassignedTenants.map((t) => (
                                <option key={t.id} value={t.id}>
                                  {t.firstName} {t.lastName}
                                </option>
                              ))}
                            </Select>
                            <Button type="submit" className="text-xs px-4 py-2">
                              Assign Tenant
                            </Button>
                          </div>
                        </form>
                      ) : (
                        <p className="text-slate-450 text-xs italic">No active unassigned tenants available to link.</p>
                      )}

                      <div className="pt-3 border-t border-slate-200/60 flex items-center justify-between">
                        <span className="text-xs text-slate-455 text-slate-500 font-medium">Need a new tenant profile?</span>
                        <Link
                          href="/tenants/new"
                          className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 transition-colors"
                        >
                          Register New Tenant &rarr;
                        </Link>
                      </div>
                    </div>
                  </div>
                )}
              </div>

            </div>
          </div>
        )}

        {/* Tab 2: Utilities & Billing */}
        {tab === 'utilities' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
            
            {/* Left: Graphs and History Table */}
            <div className="lg:col-span-2 space-y-8">
              <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <History className="h-5 w-5 text-indigo-600" />
                    <h2 className="text-xl font-bold text-slate-900">Readings History & Trends</h2>
                  </div>
                  
                  {chartPeriods.length > 0 && (
                    <div className="flex gap-4 text-xs font-semibold">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-cyan-500" />
                        <span className="text-slate-500">Water (m³)</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                        <span className="text-slate-500">Electricity (kWh)</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* SVG Line Graph */}
                {chartPeriods.length === 0 ? (
                  <p className="text-sm text-slate-400 py-6 text-center border border-dashed border-slate-200 rounded-lg">
                    No billing periods generated yet to plot consumption trends.
                  </p>
                ) : (
                  <div className="space-y-6">
                    <div className="border border-slate-100 rounded-xl p-4 bg-slate-50/50">
                      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto">
                        {/* Grid lines */}
                        <line x1={paddingLeft} y1={paddingTop} x2={width - paddingRight} y2={paddingTop} stroke="#f1f5f9" strokeWidth="1" />
                        <line x1={paddingLeft} y1={paddingTop + chartHeight / 2} x2={width - paddingRight} y2={paddingTop + chartHeight / 2} stroke="#f1f5f9" strokeWidth="1" />
                        <line x1={paddingLeft} y1={paddingTop + chartHeight} x2={width - paddingRight} y2={paddingTop + chartHeight} stroke="#e2e8f0" strokeWidth="1" />

                        {/* Water Line */}
                        {waterPoints.length > 1 && (
                          <polyline fill="none" stroke="#06b6d4" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" points={waterPath} />
                        )}
                        {waterPoints.map((p, idx) => (
                          <circle key={`w-${idx}`} cx={p.x} cy={p.y} r="3.5" fill="#fff" stroke="#06b6d4" strokeWidth="2.5" />
                        ))}

                        {/* Electricity Line */}
                        {elecPoints.length > 1 && (
                          <polyline fill="none" stroke="#f59e0b" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" points={elecPath} />
                        )}
                        {elecPoints.map((p, idx) => (
                          <circle key={`e-${idx}`} cx={p.x} cy={p.y} r="3.5" fill="#fff" stroke="#f59e0b" strokeWidth="2.5" />
                        ))}

                        {/* X-Axis Labels */}
                        {waterPoints.map((p, idx) => (
                          <text key={`lbl-${idx}`} x={p.x} y={height - 8} textAnchor="middle" className="text-[9px] fill-slate-400 font-bold uppercase">
                            {p.label}
                          </text>
                        ))}
                      </svg>
                    </div>

                    {/* History Table */}
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider">
                            <th className="py-2.5">Billing Period</th>
                            <th className="py-2.5">Water Consumption</th>
                            <th className="py-2.5">Electricity Consumption</th>
                            <th className="py-2.5 text-right">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {unit.billPeriods.map((bp) => {
                            const waterUse = bp.currWater - bp.prevWater;
                            const elecUse = bp.currElec - bp.prevElec;
                            return (
                              <tr key={bp.id} className="text-slate-700 hover:bg-slate-50/50 transition-colors">
                                <td className="py-3 font-semibold">
                                  {new Date(0, bp.month - 1).toLocaleString('en-US', { month: 'long' })} {bp.year}
                                </td>
                                <td className="py-3">
                                  {waterUse.toFixed(2)} m³ <span className="text-slate-400 text-[10px] ml-1">({bp.currWater} - {bp.prevWater})</span>
                                </td>
                                <td className="py-3">
                                  {elecUse.toFixed(2)} kWh <span className="text-slate-400 text-[10px] ml-1">({bp.currElec} - {bp.prevElec})</span>
                                </td>
                                <td className="py-3 text-right">
                                  <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider ${
                                    bp.status === 'SENT'
                                      ? 'bg-emerald-50 text-emerald-700 border-emerald-250 bg-emerald-50'
                                      : 'bg-slate-50 text-slate-600 border-slate-200'
                                  }`}>
                                    {bp.status}
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Right Sidebar: Operational Actions */}
            <div className="space-y-8">
              {/* Submit Monthly Readings Form Card */}
              {activeTenant ? (
                <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-6">
                  <div className="flex items-center gap-2 pb-4 border-b border-slate-100">
                    <TrendingUp className="h-5 w-5 text-indigo-650" />
                    <h2 className="text-xl font-bold text-slate-900">Submit Readings</h2>
                  </div>
                  <p className="text-slate-500 text-xs">Log utility readings to generate the monthly rent & utility statement for the tenant.</p>
                  
                  <form action={computeBillAction} className="space-y-4">
                    <input type="hidden" name="unitId" value={unit.id} />
                    <input type="hidden" name="redirectPath" value={`/units/${unit.id}?tab=utilities`} />
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label htmlFor="month" className="text-xs">Month</Label>
                        <Select id="month" name="month" defaultValue={new Date().getMonth() + 1} className="text-xs">
                          {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                            <option key={m} value={m}>
                              {new Date(0, m - 1).toLocaleString('en-US', { month: 'long' })}
                            </option>
                          ))}
                        </Select>
                      </div>
                      
                      <div className="space-y-1.5">
                        <Label htmlFor="year" className="text-xs">Year</Label>
                        <Input
                          id="year"
                          name="year"
                          type="number"
                          defaultValue={new Date().getFullYear()}
                          className="text-xs"
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="space-y-1.5">
                        <Label htmlFor="currWater" className="text-xs">New Water (m³)</Label>
                        <Input
                          id="currWater"
                          name="currWater"
                          type="number"
                          step="0.01"
                          placeholder={`Current: ${unit.waterMeter}`}
                          min={unit.waterMeter}
                          required
                          className="text-sm"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor="currElec" className="text-xs">New Electricity (kWh)</Label>
                        <Input
                          id="currElec"
                          name="currElec"
                          type="number"
                          step="0.01"
                          placeholder={`Current: ${unit.electroMeter}`}
                          min={unit.electroMeter}
                          required
                          className="text-sm"
                        />
                      </div>
                    </div>

                    <div className="pt-2">
                      <Button type="submit" className="w-full justify-center text-xs py-2.5">
                        Submit & Generate Statement
                      </Button>
                    </div>
                  </form>
                </div>
              ) : (
                <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
                  <div className="flex items-center gap-2 pb-4 border-b border-slate-100">
                    <TrendingUp className="h-5 w-5 text-indigo-650" />
                    <h2 className="text-xl font-bold text-slate-900">Submit Readings</h2>
                  </div>
                  <p className="text-xs text-slate-450 italic py-4 text-center mt-2 border border-dashed border-slate-200 rounded-lg bg-slate-50/50">
                    Utility billing statement generation requires an active tenant.
                  </p>
                </div>
              )}

              {/* Utility Configuration Config (Waivers) Card */}
              <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-6">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">Utility Configuration</h2>
                  <p className="text-slate-505 text-xs text-slate-500 mt-1">Configure baseline meter values and waivers.</p>
                </div>
                
                <form action={updateUnitMetersAction.bind(null, unit.id)} className="space-y-5">
                  <input type="hidden" name="redirectPath" value={`/units/${unit.id}?tab=utilities`} />
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
                      className="text-sm"
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
                      className="text-sm"
                    />
                  </div>

                  <div className="flex items-center gap-3 pt-2">
                    <input
                      type="checkbox"
                      id="waterWaived"
                      name="waterWaived"
                      value="true"
                      defaultChecked={unit.waterWaived}
                      className="h-4 w-4 rounded border-slate-300 text-indigo-650 focus:ring-indigo-500 cursor-pointer"
                    />
                    <Label htmlFor="waterWaived" className="text-xs font-semibold cursor-pointer select-none">
                      Waive Water Utility Charges
                    </Label>
                  </div>

                  <div className="flex items-center gap-3 pt-2">
                    <input
                      type="checkbox"
                      id="elecWaived"
                      name="elecWaived"
                      value="true"
                      defaultChecked={unit.elecWaived}
                      className="h-4 w-4 rounded border-slate-300 text-indigo-650 focus:ring-indigo-500 cursor-pointer"
                    />
                    <Label htmlFor="elecWaived" className="text-xs font-semibold cursor-pointer select-none">
                      Waive Electricity Utility Charges
                    </Label>
                  </div>


                  <div className="pt-2">
                    <Button type="submit" className="w-full justify-center text-xs py-2.5">
                      Update Utility Config
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Add-on Services */}
        {tab === 'addons' && (
          <div className="max-w-2xl bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-6">
            <div className="flex items-center gap-2 pb-4 border-b border-slate-100">
              <span className="inline-flex p-1.5 bg-indigo-50 text-indigo-650 rounded-lg">
                <CreditCard className="h-4 w-4" />
              </span>
              <h2 className="text-xl font-bold text-slate-900">Custom Add-on Charges</h2>
            </div>

            {!activeTenant ? (
              <p className="text-sm text-slate-450 italic py-4 text-center border border-dashed border-slate-200 rounded-lg bg-slate-50/50">
                Please assign a tenant to this unit to manage custom add-ons.
              </p>
            ) : (
              <div className="space-y-6">
                {addOns.length === 0 ? (
                  <p className="text-sm text-slate-400 py-4 text-center border border-dashed border-slate-200 rounded-lg">
                    No active add-on charges (like parking, WiFi, appliance fee) configured for this occupant.
                  </p>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {addOns.map((add) => (
                      <div key={add.id} className="flex justify-between items-center py-3 text-sm">
                        <div>
                          <p className="font-semibold text-slate-800">{add.description}</p>
                          <p className="text-xs text-slate-400 mt-0.5">{new Date(add.date).toLocaleDateString()}</p>
                        </div>
                        <span className="font-bold text-indigo-650 text-base">
                          ₱{add.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Form to add an add-on */}
                <form action={addTenantAddonAction.bind(null, activeTenant.id, unit.id)} className="space-y-4 pt-6 border-t border-slate-100">
                  <input type="hidden" name="redirectPath" value={`/units/${unit.id}?tab=addons`} />
                  <div>
                    <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Charge Custom Add-on</h3>
                    <p className="text-xs text-slate-400 mt-0.5">Apply a service charge to the tenant's current monthly ledger.</p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="description">Description</Label>
                      <Input
                        id="description"
                        name="description"
                        placeholder="e.g. WiFi Router Rent, Parking Space"
                        required
                        className="text-sm"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="amount">Amount (₱)</Label>
                      <Input
                        id="amount"
                        name="amount"
                        type="number"
                        placeholder="0.00"
                        required
                        step="0.01"
                        className="text-sm"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <Button type="submit" className="text-xs">Charge Add-on</Button>
                  </div>
                </form>
              </div>
            )}
          </div>
        )}

        {/* Tab 4: Ledger & Finances */}
        {tab === 'ledger' && (
          <div className="max-w-4xl bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-4">
            <h2 className="text-xl font-bold text-slate-900">Financial Ledger Activities</h2>
            <p className="text-xs text-slate-500">History of all charges, waivers, and utility payments logged on this room.</p>
            
            {unit.ledgers.length === 0 ? (
              <p className="text-sm text-slate-400 py-6 text-center border border-dashed border-slate-200 rounded-lg">
                No financial transactions logged yet.
              </p>
            ) : (
              <div className="space-y-3 pt-2">
                {unit.ledgers.map((l) => (
                  <div key={l.id} className="flex justify-between items-center text-sm border-b border-slate-100 pb-2.5 last:border-0 last:pb-0">
                    <div>
                      <p className="font-semibold text-slate-800">{l.description}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{new Date(l.date).toLocaleDateString()}</p>
                    </div>
                    <span className={`font-bold ${l.type === 'CHARGE' ? 'text-rose-600' : 'text-emerald-600'}`}>
                      {l.type === 'CHARGE' ? '+' : '-'}₱{l.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 5: Maintenance */}
        {tab === 'maintenance' && (
          <div className="max-w-3xl bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-6">
            <div className="flex items-center gap-2 pb-4 border-b border-slate-100">
              <Wrench className="h-5 w-5 text-indigo-650" />
              <h2 className="text-xl font-bold text-slate-900">Maintenance Request Log</h2>
            </div>
            
            {!unit.maintenanceRequests || unit.maintenanceRequests.length === 0 ? (
              <p className="text-sm text-slate-400 py-6 text-center border border-dashed border-slate-200 rounded-lg">
                No maintenance requests logged for this unit.
              </p>
            ) : (
              <div className="space-y-4">
                {unit.maintenanceRequests.map((req) => (
                  <div key={req.id} className="border border-slate-150 rounded-xl p-4 space-y-2 bg-slate-50/50 hover:bg-slate-50 transition-colors">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h4 className="font-semibold text-slate-900 text-sm">{req.title}</h4>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Requested by {req.tenant.firstName} {req.tenant.lastName} on {new Date(req.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider ${
                        req.status === 'OPEN'
                          ? 'bg-rose-50 text-rose-700 border-rose-250 bg-rose-50'
                          : req.status === 'IN_PROGRESS'
                          ? 'bg-amber-50 text-amber-700 border-amber-250 bg-amber-50'
                          : 'bg-emerald-50 text-emerald-700 border-emerald-250 bg-emerald-50'
                      }`}>
                        {req.status.replace('_', ' ')}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600">{req.description}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}

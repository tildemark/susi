import { BillingCalculator } from '@/components/billing-calculator';
import { db } from '@/lib/db';
import { billingService } from '@/lib/services/billing.service';
import { computeBillAction, updateMonthlyPolicyAction } from '../actions/billing.actions';
import { sendMeterReadingRemindersAction } from '../actions/lease.actions';
import { Button, Input, Label, Select } from '@/components/ui-elements';
import { CreditCard, Calendar, Droplets, Zap, Settings, Bell } from 'lucide-react';

export const revalidate = 0; // Dynamic rendering

export default async function BillingDashboardPage() {
  const units = await db.unit.findMany({
    orderBy: { roomNumber: 'asc' },
    include: {
      billPeriods: true,
      tenants: {
        where: { status: 'ACTIVE' },
        include: {
          leases: {
            where: { status: 'ACTIVE' },
          },
          ledgers: true,
        },
      },
    },
  });
  const billPeriods = await billingService.getBillPeriods();
  const config = await billingService.getOrCreateBillingConfig();
  const monthlyPolicies = await billingService.getMonthlyPolicies();

  // Get current active occupied units
  const occupiedUnits = units.filter((u) => u.status === 'OCCUPIED' && u.tenants.length > 0);

  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();

  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Billing Dashboard</h1>
          <p className="text-slate-500 mt-2 text-sm">Calculate monthly utilities, configure landlord billing policies, and inspect statements.</p>
        </div>
        <form action={sendMeterReadingRemindersAction}>
          <button
            type="submit"
            className="inline-flex items-center gap-2 px-4 py-2 border border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100 rounded-xl text-xs font-semibold transition-colors"
          >
            <Bell className="h-4 w-4" /> Send Meter Reading Reminders
          </button>
        </form>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Bill Calculator */}
        <div className="lg:col-span-1 space-y-6">
          {/* Bill Calculator Panel */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-6">
            <div>
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-indigo-600" />
                Compute Period Bill
              </h2>
              <p className="text-slate-500 text-xs mt-1">Compute monthly rent and meter differentials.</p>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl space-y-2 border border-slate-100 text-xs text-slate-650">
              <p className="font-semibold text-slate-800">Active Defaults:</p>
              <div className="grid grid-cols-2 gap-y-1.5 gap-x-2">
                <div>💧 Water: ₱{config.waterRate}/m³</div>
                <div>⚡ Elec: ₱{config.elecRate}/kWh</div>
                <div className="col-span-2">📅 Schedule: {config.billingCycle === 'MONTHSARY' ? 'Monthsary Day' : 'End of Month (Prorated)'}</div>
                <div className="col-span-2">⚠️ Late Fee: {config.lateFeeImposed ? `₱${config.lateFeeAmount} (Imposed)` : 'No Late Fees'}</div>
              </div>
            </div>

            {occupiedUnits.length === 0 ? (
              <p className="text-sm text-slate-500 py-4 text-center border border-dashed border-slate-200 rounded-lg">
                No occupied units with active tenants available.
              </p>
            ) : (
              <BillingCalculator 
                occupiedUnits={occupiedUnits} 
                currentMonth={currentMonth} 
                currentYear={currentYear} 
                defaultWaterRate={config.waterRate}
                defaultElecRate={config.elecRate}
                defaultLateFee={config.lateFeeImposed ? config.lateFeeAmount : 0}
              />
            )}
          </div>
        </div>

        {/* Right Column: Generated Invoices & Policy Manager */}
        <div className="lg:col-span-2 space-y-6">
          {/* Generated Period Invoices */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-4">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Calendar className="h-5 w-5 text-indigo-600" />
              Generated Period Invoices
            </h2>

            {billPeriods.length === 0 ? (
              <p className="text-sm text-slate-500 py-8 text-center border border-dashed border-slate-200 rounded-lg">
                No bills generated yet for any inventory space.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50">
                      <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Unit</th>
                      <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Period</th>
                      <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Water (Diff)</th>
                      <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Electric (Diff)</th>
                      <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Late Fee</th>
                      <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Prorated?</th>
                      <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Statement</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {billPeriods.map((period) => (
                      <tr key={period.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3 whitespace-nowrap text-sm font-semibold text-slate-900">
                          {period.unit.roomNumber}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-600">
                          {new Date(0, period.month - 1).toLocaleString('en-US', { month: 'short' })} {period.year}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-600">
                          {(period.currWater - period.prevWater).toFixed(1)} m³ <span className="text-[10px] text-slate-400">(₱{period.waterRateUsed}/m³)</span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-600">
                          {(period.currElec - period.prevElec).toFixed(1)} kWh <span className="text-[10px] text-slate-400">(₱{period.elecRateUsed}/kWh)</span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-600">
                          {period.lateFeeApplied > 0 ? `₱${period.lateFeeApplied}` : '-'}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-600 flex flex-col justify-center">
                          <span>{period.isProrated ? 'Yes' : 'No'}</span>
                          <span className="text-[9px] text-indigo-500 font-semibold uppercase">{period.billingCycleType === 'FIRST_OF_MONTH' ? '1st of Month' : 'Monthsary'}</span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm">
                          {period.billPdfUrl ? (
                            <a
                              href={period.billPdfUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="text-indigo-600 hover:text-indigo-900 font-semibold"
                            >
                              Download Statement
                            </a>
                          ) : (
                            <span className="text-slate-400">Not Uploaded</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Unified Landlord Policy Settings Manager */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-6">
            <div>
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Settings className="h-5 w-5 text-indigo-600" />
                Landlord Policy & Billing Configuration
              </h2>
              <p className="text-slate-500 text-xs mt-1">Configure general default parameters, or override policies for a specific month and year.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Form on left (span 1) */}
              <div className="md:col-span-1 border-r border-slate-100 pr-6 space-y-4">
                <h3 className="text-sm font-semibold text-slate-800">Set Monthly Override</h3>
                <form action={updateMonthlyPolicyAction} className="space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label htmlFor="policyMonth">Month</Label>
                      <Select id="policyMonth" name="month" defaultValue={currentMonth}>
                        {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                          <option key={m} value={m}>
                            {new Date(0, m - 1).toLocaleString('en-US', { month: 'short' })}
                          </option>
                        ))}
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="policyYear">Year</Label>
                      <Select id="policyYear" name="year" defaultValue={currentYear}>
                        <option value={currentYear}>{currentYear}</option>
                        <option value={currentYear + 1}>{currentYear + 1}</option>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="policyWaterRate">Water Rate (₱)</Label>
                    <Input id="policyWaterRate" name="waterRate" type="number" step="0.01" defaultValue={config.waterRate} required />
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="policyElecRate">Elec Rate (₱)</Label>
                    <Input id="policyElecRate" name="elecRate" type="number" step="0.01" defaultValue={config.elecRate} required />
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="policyBillingCycle">Cycle</Label>
                    <Select id="policyBillingCycle" name="billingCycle" defaultValue={config.billingCycle}>
                      <option value="MONTHSARY">Monthsary Day</option>
                      <option value="FIRST_OF_MONTH">1st of Month</option>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="policyLateFeeImposed">Impose Late Fee?</Label>
                    <Select id="policyLateFeeImposed" name="lateFeeImposed" defaultValue={config.lateFeeImposed ? "true" : "false"}>
                      <option value="false">No Late Fees</option>
                      <option value="true">Apply Late Fee</option>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="policyLateFeeAmount">Late Fee (₱)</Label>
                    <Input id="policyLateFeeAmount" name="lateFeeAmount" type="number" step="0.01" defaultValue={config.lateFeeAmount} required />
                  </div>

                  <Button type="submit" className="w-full justify-center text-xs py-2 bg-indigo-600 hover:bg-indigo-500">
                    Save Policy Configuration
                  </Button>
                </form>
              </div>

              {/* Table on right (span 2) */}
              <div className="md:col-span-2 space-y-3">
                <h3 className="text-sm font-semibold text-slate-800">Saved Policies Audit Trail</h3>
                {monthlyPolicies.length === 0 ? (
                  <p className="text-xs text-slate-400 py-8 text-center border border-dashed border-slate-200 rounded-lg">
                    No custom monthly policies saved. Bills computed will inherit default config parameters.
                  </p>
                ) : (
                  <div className="overflow-x-auto text-xs max-h-[350px] overflow-y-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-slate-200 bg-slate-50">
                          <th className="px-3 py-2 text-[10px] font-semibold text-slate-500 uppercase">Period</th>
                          <th className="px-3 py-2 text-[10px] font-semibold text-slate-500 uppercase">Water Rate</th>
                          <th className="px-3 py-2 text-[10px] font-semibold text-slate-500 uppercase">Elec Rate</th>
                          <th className="px-3 py-2 text-[10px] font-semibold text-slate-500 uppercase">Cycle</th>
                          <th className="px-3 py-2 text-[10px] font-semibold text-slate-500 uppercase">Late Fee</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {monthlyPolicies.map((p) => (
                          <tr key={p.id} className="hover:bg-slate-50">
                            <td className="px-3 py-2 font-bold text-slate-900">
                              {new Date(0, p.month - 1).toLocaleString('en-US', { month: 'short' })} {p.year}
                            </td>
                            <td className="px-3 py-2 text-slate-600">₱{p.waterRate}/m³</td>
                            <td className="px-3 py-2 text-slate-600">₱{p.elecRate}/kWh</td>
                            <td className="px-3 py-2 text-slate-600">{p.billingCycle}</td>
                            <td className="px-3 py-2 text-slate-600">{p.lateFeeImposed ? `₱${p.lateFeeAmount}` : 'None'}</td>
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
      </div>
    </div>
  );
}



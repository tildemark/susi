import { billingService } from '@/lib/services/billing.service';
import { unitService } from '@/lib/services/unit.service';
import { computeBillAction } from '../actions/billing.actions';
import { Button, Input, Label, Select } from '@/components/ui-elements';
import { CreditCard, Calendar, Droplets, Zap } from 'lucide-react';

export const revalidate = 0; // Dynamic rendering

export default async function BillingDashboardPage() {
  const units = await unitService.getUnits();
  const billPeriods = await billingService.getBillPeriods();

  // Get current active occupied units
  const occupiedUnits = units.filter((u) => u.status === 'OCCUPIED' && u.tenants.length > 0);

  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();

  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Billing Dashboard</h1>
        <p className="text-slate-500 mt-2">Calculate monthly utilities, generate bills, and inspect historical period invoices.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Bill Calculator Panel */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-6">
            <div>
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-indigo-600" />
                Compute Period Bill
              </h2>
              <p className="text-slate-500 text-xs mt-1">Compute monthly rent and meter differentials.</p>
            </div>

            {occupiedUnits.length === 0 ? (
              <p className="text-sm text-slate-500 py-4 text-center border border-dashed border-slate-200 rounded-lg">
                No occupied units with active tenants available.
              </p>
            ) : (
              <form action={computeBillAction} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="unitId">Select Occupied Unit</Label>
                  <Select id="unitId" name="unitId" required>
                    {occupiedUnits.map((unit) => (
                      <option key={unit.id} value={unit.id}>
                        {unit.roomNumber} ({unit.tenants[0]?.firstName} {unit.tenants[0]?.lastName})
                      </option>
                    ))}
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="month">Month</Label>
                    <Select id="month" name="month" defaultValue={currentMonth}>
                      {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                        <option key={m} value={m}>
                          {new Date(0, m - 1).toLocaleString('en-US', { month: 'long' })}
                        </option>
                      ))}
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="year">Year</Label>
                    <Select id="year" name="year" defaultValue={currentYear}>
                      <option value={currentYear}>{currentYear}</option>
                      <option value={currentYear + 1}>{currentYear + 1}</option>
                    </Select>
                  </div>
                </div>

                <div className="space-y-1.5 border-t border-slate-100 pt-4">
                  <Label htmlFor="currWater" className="flex items-center gap-1.5">
                    <Droplets className="h-4 w-4 text-cyan-600" />
                    New Water Reading (m³)
                  </Label>
                  <Input id="currWater" name="currWater" type="number" step="0.01" placeholder="Current reading" required />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="currElec" className="flex items-center gap-1.5">
                    <Zap className="h-4 w-4 text-amber-600" />
                    New Electricity Reading (kWh)
                  </Label>
                  <Input id="currElec" name="currElec" type="number" step="0.01" placeholder="Current reading" required />
                </div>

                <Button type="submit" className="w-full justify-center">
                  Calculate and Post Bill
                </Button>
              </form>
            )}
          </div>
        </div>

        {/* Historical Logs Panel */}
        <div className="lg:col-span-2 space-y-6">
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
                      <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
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
                          {(period.currWater - period.prevWater).toFixed(1)} m³
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-600">
                          {(period.currElec - period.prevElec).toFixed(1)} kWh
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm">
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-indigo-50 border border-indigo-100 text-indigo-700">
                            {period.status}
                          </span>
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

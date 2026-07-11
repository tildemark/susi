import { unitService } from '@/lib/services/unit.service';
import { tenantService } from '@/lib/services/tenant.service';
import { billingService } from '@/lib/services/billing.service';
import { maintenanceService } from '@/lib/services/maintenance.service';
import { Building2, Users, CreditCard, AlertCircle } from 'lucide-react';

export const revalidate = 0; // Dynamic rendering

export default async function AdminDashboardPage() {
  const units = await unitService.getUnits();
  const tenants = await tenantService.getTenants();
  const bills = await billingService.getBillPeriods();
  const maintenance = await maintenanceService.getRequests();

  const totalUnits = units.length;
  const activeTenants = tenants.filter((t) => t.status === 'ACTIVE').length;
  const activeMaintenance = maintenance.filter((r) => r.status !== 'RESOLVED').length;

  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Dashboard Overview</h1>
        <p className="text-slate-500 mt-2">Welcome back to System for Unit & Space Inventory.</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white border border-slate-200 rounded-xl p-6 flex items-center justify-between shadow-sm">
          <div>
            <p className="text-sm font-medium text-slate-500">Total Units</p>
            <h3 className="text-2xl font-bold mt-1 text-slate-900">{totalUnits}</h3>
          </div>
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-lg">
            <Building2 className="h-6 w-6" />
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-6 flex items-center justify-between shadow-sm">
          <div>
            <p className="text-sm font-medium text-slate-500">Active Tenants</p>
            <h3 className="text-2xl font-bold mt-1 text-slate-900">{activeTenants}</h3>
          </div>
          <div className="p-3 bg-cyan-50 text-cyan-600 rounded-lg">
            <Users className="h-6 w-6" />
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-6 flex items-center justify-between shadow-sm">
          <div>
            <p className="text-sm font-medium text-slate-500">Active Bills</p>
            <h3 className="text-2xl font-bold mt-1 text-slate-900">{bills.length}</h3>
          </div>
          <div className="p-3 bg-amber-50 text-amber-600 rounded-lg">
            <CreditCard className="h-6 w-6" />
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-6 flex items-center justify-between shadow-sm">
          <div>
            <p className="text-sm font-medium text-slate-500">Active Maintenance</p>
            <h3 className="text-2xl font-bold mt-1 text-slate-900">{activeMaintenance}</h3>
          </div>
          <div className="p-3 bg-rose-50 text-rose-600 rounded-lg">
            <AlertCircle className="h-6 w-6" />
          </div>
        </div>
      </div>

      {/* Main Grid section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Placeholder cards for recent ledger activities */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Recent Transactions</h2>
          <div className="text-slate-400 text-sm py-8 text-center border border-dashed border-slate-200 rounded-lg">
            All transaction statements can be inspected in the Ledger tab.
          </div>
        </div>

        {/* Placeholder cards for units availability summary */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Occupancy & Billing</h2>
          <div className="text-slate-400 text-sm py-8 text-center border border-dashed border-slate-200 rounded-lg">
            Calculate usage and draft invoices in the Billing dashboard.
          </div>
        </div>
      </div>
    </div>
  );
}

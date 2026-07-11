import { unitService } from '@/lib/services/unit.service';
import Link from 'next/link';
import { Plus, Eye, Home } from 'lucide-react';

export default async function UnitsPage() {
  const units = await unitService.getUnits();

  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Units & Space</h1>
          <p className="text-slate-500 mt-2">Manage apartments, rooms, and meter readings.</p>
        </div>
        <Link
          href="/units/new"
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-lg shadow transition-colors"
        >
          <Plus className="h-5 w-5" />
          Add Unit
        </Link>
      </div>

      {/* Grid or Table */}
      {units.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-8 text-center space-y-4 shadow-sm">
          <div className="inline-flex p-4 bg-indigo-50 text-indigo-600 rounded-2xl mx-auto">
            <Home className="h-10 w-10" />
          </div>
          <h3 className="text-lg font-semibold text-slate-800">No units found</h3>
          <p className="text-slate-500 text-sm max-w-sm mx-auto">
            Start building your space inventory by adding your first unit.
          </p>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Room Number</th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Monthly Rate</th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Water Meter</th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Electricity Meter</th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Tenant</th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {units.map((unit) => {
                  const activeTenant = unit.tenants[0];
                  return (
                    <tr key={unit.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-slate-900">
                        {unit.roomNumber}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">
                        ₱{unit.monthlyRate.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            unit.status === 'VACANT'
                              ? 'bg-emerald-50 text-emerald-750 border border-emerald-205'
                              : unit.status === 'OCCUPIED'
                              ? 'bg-indigo-50 text-indigo-750 border border-indigo-205'
                              : 'bg-amber-50 text-amber-750 border border-amber-205'
                          }`}
                        >
                          {unit.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">
                        {unit.waterMeter} m³
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">
                        {unit.electroMeter} kWh
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                        {activeTenant ? (
                          <Link href={`/tenants/${activeTenant.id}`} className="text-indigo-650 hover:underline">
                            {activeTenant.firstName} {activeTenant.lastName}
                          </Link>
                        ) : (
                          'None'
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <Link
                          href={`/units/${unit.id}`}
                          className="inline-flex items-center gap-1.5 text-indigo-600 hover:text-indigo-500 font-semibold"
                        >
                          <Eye className="h-4 w-4" />
                          View
                        </Link>
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
  );
}

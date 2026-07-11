import { tenantService } from '@/lib/services/tenant.service';
import Link from 'next/link';
import { Plus, Eye, Users } from 'lucide-react';

export default async function TenantsPage() {
  const tenants = await tenantService.getTenants();

  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Tenants</h1>
          <p className="text-slate-500 mt-2">Manage unit tenants, contact information, and billing preferences.</p>
        </div>
        <Link
          href="/tenants/new"
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-lg shadow transition-colors"
        >
          <Plus className="h-5 w-5" />
          Add Tenant
        </Link>
      </div>

      {/* Grid or Table */}
      {tenants.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-8 text-center space-y-4 shadow-sm">
          <div className="inline-flex p-4 bg-cyan-50 text-cyan-600 rounded-2xl mx-auto">
            <Users className="h-10 w-10" />
          </div>
          <h3 className="text-lg font-semibold text-slate-800">No tenants registered</h3>
          <p className="text-slate-500 text-sm max-w-sm mx-auto">
            Start by adding a new tenant and linking them to a vacant space.
          </p>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Name</th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Email</th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Phone</th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Assigned Unit</th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Billing Preference</th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">App Invite</th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {tenants.map((tenant) => (
                  <tr key={tenant.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-slate-900">
                      {tenant.firstName} {tenant.lastName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">
                      {tenant.email}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">
                      {tenant.phone}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">
                      {tenant.unit ? (
                        <Link href={`/units/${tenant.unit.id}`} className="text-indigo-600 hover:underline">
                          {tenant.unit.roomNumber}
                        </Link>
                      ) : (
                        <span className="text-slate-400">Unassigned</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 border border-slate-200 text-slate-700">
                        {tenant.billingPreference}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          tenant.appAccess
                            ? 'bg-indigo-50 text-indigo-700 border border-indigo-100'
                            : 'bg-slate-100 text-slate-500 border border-slate-200/55'
                        }`}
                      >
                        {tenant.appAccess ? 'Invited' : 'None'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <Link
                        href={`/tenants/${tenant.id}`}
                        className="inline-flex items-center gap-1.5 text-indigo-600 hover:text-indigo-500 font-semibold"
                      >
                        <Eye className="h-4 w-4" />
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

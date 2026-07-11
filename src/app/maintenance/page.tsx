import { maintenanceService } from '@/lib/services/maintenance.service';
import { updateMaintenanceStatusAction } from '../actions/maintenance.actions';
import { Wrench, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { MaintenanceStatus } from '@prisma/client';

export const revalidate = 0; // Dynamic rendering

export default async function MaintenanceDashboardPage() {
  const requests = await maintenanceService.getRequests();

  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Maintenance Tickets</h1>
        <p className="text-slate-500 mt-2">Oversee open repair requests and coordinate completion statuses.</p>
      </div>

      {requests.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-8 text-center space-y-4 shadow-sm">
          <div className="inline-flex p-4 bg-rose-50 text-rose-600 rounded-2xl mx-auto">
            <Wrench className="h-10 w-10" />
          </div>
          <h3 className="text-lg font-semibold text-slate-800">No maintenance tickets</h3>
          <p className="text-slate-500 text-sm max-w-sm mx-auto">
            All spaces are in good order. Tenant-submitted tickets will appear here.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {requests.map((req) => (
            <div key={req.id} className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm flex flex-col justify-between space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between items-start gap-2">
                  <h3 className="font-bold text-slate-900 text-lg line-clamp-1">{req.title}</h3>
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${
                      req.status === 'OPEN'
                        ? 'bg-rose-50 text-rose-700 border border-rose-100'
                        : req.status === 'IN_PROGRESS'
                        ? 'bg-amber-50 text-amber-750 border border-amber-100'
                        : 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                    }`}
                  >
                    {req.status}
                  </span>
                </div>
                <p className="text-slate-500 text-sm line-clamp-3">{req.description}</p>
                <div className="text-xs text-slate-400 space-y-0.5 pt-2 border-t border-slate-100">
                  <p>Room: <span className="font-medium text-slate-650">{req.unit.roomNumber}</span></p>
                  <p>Tenant: <span className="font-medium text-slate-650">{req.tenant.firstName} {req.tenant.lastName}</span></p>
                  <p>Submitted: <span className="font-medium text-slate-650">{new Date(req.createdAt).toLocaleDateString()}</span></p>
                </div>
              </div>

              {/* Status Update Actions */}
              <div className="flex gap-2 pt-2 border-t border-slate-100">
                {req.status !== 'IN_PROGRESS' && req.status !== 'RESOLVED' && (
                  <form action={updateMaintenanceStatusAction.bind(null, req.id, 'IN_PROGRESS' as MaintenanceStatus)} className="flex-1">
                    <button
                      type="submit"
                      className="w-full text-center px-3 py-1.5 bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-700 rounded-lg text-xs font-semibold transition-all"
                    >
                      Start Work
                    </button>
                  </form>
                )}
                {req.status !== 'RESOLVED' && (
                  <form action={updateMaintenanceStatusAction.bind(null, req.id, 'RESOLVED' as MaintenanceStatus)} className="flex-1">
                    <button
                      type="submit"
                      className="w-full text-center px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 rounded-lg text-xs font-semibold transition-all"
                    >
                      Resolve
                    </button>
                  </form>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

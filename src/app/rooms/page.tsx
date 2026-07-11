import { unitService } from '@/lib/services/unit.service';
import { Home, ClipboardList } from 'lucide-react';

export const revalidate = 0; // Dynamic rendering

export default async function PublicRoomsPage() {
  const vacantUnits = await unitService.getVacantUnits();

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Navbar */}
      <header className="h-16 border-b border-slate-900 bg-slate-900/50 backdrop-blur flex items-center px-8 justify-between sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <Home className="h-6 w-6 text-indigo-400" />
          <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-indigo-400 to-cyan-400 bg-clip-text text-transparent">
            SUSI Public Portal
          </span>
        </div>
        <span className="text-xs font-semibold px-2.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
          Available Vacancies
        </span>
      </header>

      {/* Hero section */}
      <section className="py-12 border-b border-slate-900 bg-gradient-to-b from-indigo-950/20 to-slate-950 text-center px-4 space-y-4">
        <h1 className="text-4xl md:text-5xl font-extrabold text-white tracking-tight">Available Rooms & Spaces</h1>
        <p className="text-slate-400 max-w-xl mx-auto text-sm md:text-base">
          Browse vacant units. Contact the landlord directly with requirements to coordinate lease options.
        </p>
      </section>

      {/* Main Grid */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {vacantUnits.length === 0 ? (
          <div className="md:col-span-2 lg:col-span-3 text-center py-20 bg-slate-900 border border-slate-800 rounded-xl space-y-4">
            <ClipboardList className="h-12 w-12 text-slate-500 mx-auto" />
            <h3 className="text-lg font-bold text-white">All Units Occupied</h3>
            <p className="text-slate-400 text-sm max-w-xs mx-auto">
              We currently have no open vacancies. Please check back later.
            </p>
          </div>
        ) : (
          vacantUnits.map((unit) => (
            <div key={unit.id} className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden hover:border-slate-700 transition-colors flex flex-col justify-between">
              <div className="p-6 space-y-4">
                <div className="flex justify-between items-start">
                  <h3 className="text-xl font-bold text-white">{unit.roomNumber}</h3>
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    Vacant
                  </span>
                </div>
                
                <div className="border-t border-slate-800/60 pt-4 space-y-2">
                  <span className="text-xs text-slate-500 font-medium block">Monthly Rent Rate</span>
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-extrabold text-white">₱{unit.monthlyRate.toLocaleString()}</span>
                    <span className="text-xs text-slate-400">/ month</span>
                  </div>
                </div>
              </div>
              
              <div className="p-6 bg-slate-900/50 border-t border-slate-800/60 text-xs text-slate-500 flex flex-col gap-1.5">
                <span className="font-semibold text-slate-400 uppercase tracking-wider text-[10px]">Requirements:</span>
                <p>• 2 months security deposit + 1 month advance</p>
                <p>• Government issued identification</p>
              </div>
            </div>
          ))
        )}
      </main>

      {/* Footer */}
      <footer className="py-8 text-center text-xs text-slate-600 border-t border-slate-900">
        <p>© 2026 SUSI. All rights reserved.</p>
      </footer>
    </div>
  );
}

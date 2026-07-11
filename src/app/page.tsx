import Link from 'next/link';
import { HomeIcon, Building2, Users, CreditCard, ShieldCheck, Mail, ArrowRight } from 'lucide-react';
import { unitService } from '@/lib/services/unit.service';

export const revalidate = 0; // Dynamic rendering

export default async function PublicMarketingPage() {
  const vacantUnits = await unitService.getVacantUnits();

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      {/* Premium Navbar */}
      <header className="h-20 border-b border-slate-200 bg-white/80 backdrop-blur-md sticky top-0 z-50 px-8 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-indigo-600 text-white rounded-xl shadow-md">
            <Building2 className="h-6 w-6" />
          </div>
          <span className="text-2xl font-bold tracking-tight bg-gradient-to-r from-indigo-600 to-indigo-400 bg-clip-text text-transparent">
            SUSI
          </span>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/rooms" className="text-sm font-semibold text-slate-600 hover:text-slate-900 transition-colors">
            Available Rooms
          </Link>
          <Link href="/login" className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl shadow-md transition-all hover:scale-[1.02] text-sm">
            Sign In
          </Link>
        </div>
      </header>

      {/* Hero Section - App Buyer Value Prop */}
      <section className="py-24 px-6 max-w-6xl mx-auto text-center space-y-8">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs font-semibold uppercase tracking-wider">
          <ShieldCheck className="h-4 w-4" /> Next-Gen Apartment Ledger & Billing
        </div>
        <h1 className="text-5xl md:text-6xl font-extrabold text-slate-900 tracking-tight leading-tight max-w-4xl mx-auto">
          The Automated System landlords trust to manage their spaces
        </h1>
        <p className="text-slate-500 text-lg md:text-xl max-w-2xl mx-auto leading-relaxed">
          Unlock transaction tracking, utility calculations, and digital leases in one dashboard. Invite tenants to manage invoices directly.
        </p>
        <div className="flex justify-center gap-4 pt-4">
          <Link href="/login" className="px-8 py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl shadow-lg transition-all hover:scale-[1.03] flex items-center gap-2">
            Try Demo Dashboard <ArrowRight className="h-5 w-5" />
          </Link>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-16 bg-white border-y border-slate-200">
        <div className="max-w-6xl mx-auto px-6 grid grid-cols-1 md:grid-cols-3 gap-10">
          <div className="space-y-3">
            <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl w-fit">
              <Building2 className="h-6 w-6" />
            </div>
            <h3 className="text-xl font-bold text-slate-900">Space & Meter Tracking</h3>
            <p className="text-slate-500 text-sm leading-relaxed">
              Maintain a real-time log of vacant, occupied, and maintenance units alongside precise utility water & electricity meter readings.
            </p>
          </div>

          <div className="space-y-3">
            <div className="p-3 bg-cyan-50 text-cyan-600 rounded-2xl w-fit">
              <Users className="h-6 w-6" />
            </div>
            <h3 className="text-xl font-bold text-slate-900">Tenant Portal Access</h3>
            <p className="text-slate-500 text-sm leading-relaxed">
              No public registration required. Landlords invite tenants directly. Once active, tenants sign in to view billing histories and log maintenance requests.
            </p>
          </div>

          <div className="space-y-3">
            <div className="p-3 bg-amber-50 text-amber-600 rounded-2xl w-fit">
              <CreditCard className="h-6 w-6" />
            </div>
            <h3 className="text-xl font-bold text-slate-900">Calculated Ledger Engine</h3>
            <p className="text-slate-500 text-sm leading-relaxed">
              Input new utility meter numbers, and the engine automatically computes consumption differentials and posts charge invoices to the client statement.
            </p>
          </div>
        </div>
      </section>

      {/* Vacancy Ads Section */}
      <section className="py-20 px-6 max-w-6xl mx-auto w-full space-y-12">
        <div className="text-center space-y-3">
          <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Current Available Vacancies</h2>
          <p className="text-slate-500 text-sm max-w-md mx-auto">
            Explore live vacant spaces from our current inventory.
          </p>
        </div>

        {vacantUnits.length === 0 ? (
          <div className="text-center py-16 bg-white border border-slate-200 rounded-2xl space-y-3 shadow-sm">
            <p className="text-slate-400 text-sm font-medium">All apartments are currently occupied.</p>
            <p className="text-xs text-slate-400">Please check back later for updates.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {vacantUnits.slice(0, 3).map((unit) => (
              <div key={unit.id} className="bg-white border border-slate-200 rounded-2xl overflow-hidden hover:shadow-md transition-shadow flex flex-col justify-between shadow-sm">
                <div className="p-6 space-y-4">
                  <div className="flex justify-between items-center">
                    <h4 className="text-lg font-bold text-slate-900">{unit.roomNumber}</h4>
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-100">
                      Vacant
                    </span>
                  </div>
                  <div className="border-t border-slate-100 pt-4">
                    <span className="text-xs text-slate-400 font-medium block">Monthly Rent</span>
                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl font-extrabold text-slate-900">₱{unit.monthlyRate.toLocaleString()}</span>
                      <span className="text-xs text-slate-400">/ month</span>
                    </div>
                  </div>
                </div>
                <div className="p-6 bg-slate-50 border-t border-slate-150/60 text-xs text-slate-500 space-y-1">
                  <p>• 2 months security deposit + 1 month advance</p>
                  <p>• Ready for immediate lease validation</p>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="text-center">
          <Link href="/rooms" className="inline-flex items-center gap-1.5 text-indigo-600 hover:text-indigo-500 font-bold text-sm">
            View All Vacant Units <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-slate-200 bg-white text-center text-xs text-slate-400 space-y-2 mt-auto">
        <p className="font-semibold text-slate-550">SUSI - System for Unit & Space Inventory</p>
        <p>© 2026 SUSI. Designed for landlords and apartment managers.</p>
      </footer>
    </div>
  );
}

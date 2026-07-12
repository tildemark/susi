import Link from 'next/link';
import { Home, Users, CreditCard, Wrench, FileText, Settings, Key, Building2, ScrollText } from 'lucide-react';

interface SidebarProps {
  currentPath?: string;
}

export default function Sidebar() {
  const navItems = [
    { name: 'Dashboard', href: '/admin', icon: Home },
    { name: 'Units & Space', href: '/units', icon: Building2 },
    { name: 'Tenants', href: '/tenants', icon: Users },
    { name: 'Leases', href: '/leases', icon: ScrollText },
    { name: 'Billing', href: '/billing', icon: CreditCard },
    { name: 'Maintenance', href: '/maintenance', icon: Wrench },
    { name: 'Documents', href: '/documents', icon: FileText },
    { name: 'Settings', href: '/settings', icon: Settings },
  ];


  return (
    <aside className="w-64 bg-white text-slate-800 flex flex-col h-screen border-r border-slate-200 sticky top-0">
      <div className="h-16 flex items-center px-6 border-b border-slate-200 gap-2">
        <Building2 className="h-6 w-6 text-indigo-600" />
        <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-indigo-600 to-indigo-400 bg-clip-text text-transparent">
          SUSI Admin
        </span>
      </div>
      
      <nav className="flex-1 px-4 py-6 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.name}
              href={item.href}
              className="flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg text-slate-600 hover:bg-slate-50 hover:text-indigo-600 transition-colors"
            >
              <Icon className="h-5 w-5 text-slate-400 group-hover:text-indigo-600" />
              {item.name}
            </Link>
          );
        })}
      </nav>
      
      <div className="p-4 border-t border-slate-200">
        <div className="flex items-center gap-3 px-3 py-2">
          <div className="h-8 w-8 rounded-full bg-indigo-600 flex items-center justify-center font-bold text-white text-sm">
            LA
          </div>
          <div>
            <p className="text-sm font-medium text-slate-800">Landlord Admin</p>
            <p className="text-xs text-slate-500">susi@landlord.com</p>
          </div>
        </div>
      </div>
    </aside>
  );
}

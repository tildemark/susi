import { loginAction } from '../actions/auth.actions';
import { Button, Input, Label } from '@/components/ui-elements';
import { Home } from 'lucide-react';

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl p-8 space-y-6 shadow-lg">
        {/* Title branding */}
        <div className="text-center space-y-2">
          <div className="inline-flex p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
            <Home className="h-8 w-8" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Login to SUSI</h1>
          <p className="text-slate-500 text-sm">Landlord dashboard or Tenant invite-only portal.</p>
        </div>

        <form action={loginAction} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="email">Email Address</Label>
            <Input id="email" name="email" type="email" placeholder="susi@landlord.com" required />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="password">Password (Optional for invited Tenants)</Label>
            <Input id="password" name="password" type="password" placeholder="••••••••" />
          </div>

          <Button type="submit" className="w-full justify-center py-2.5">
            Login
          </Button>
        </form>

        <div className="text-center text-xs text-slate-400 mt-6 border-t border-slate-100 pt-4">
          <p>Demo Admin: susi@landlord.com / password: susi123</p>
        </div>
      </div>
    </div>
  );
}

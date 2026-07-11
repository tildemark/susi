import { createUnitAction } from '@/app/actions/unit.actions';
import { Button, Input, Label, Select } from '@/components/ui-elements';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function NewUnitPage() {
  return (
    <div className="p-8 max-w-2xl space-y-8">
      {/* Back button */}
      <div>
        <Link href="/units" className="inline-flex items-center gap-2 text-slate-500 hover:text-slate-900 transition-colors text-sm font-medium">
          <ArrowLeft className="h-4 w-4" />
          Back to Units
        </Link>
      </div>

      <div>
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Add New Unit</h1>
        <p className="text-slate-500 mt-2">Create a new unit for your space inventory.</p>
      </div>

      <form action={createUnitAction} className="bg-white border border-slate-200 rounded-xl p-6 space-y-6 shadow-sm">
        <div className="space-y-2">
          <Label htmlFor="roomNumber">Room Number / Identifier</Label>
          <Input id="roomNumber" name="roomNumber" placeholder="e.g. Unit 101, Rm 3B" required />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label htmlFor="monthlyRate">Monthly Rent Rate (PHP ₱)</Label>
            <Input id="monthlyRate" name="monthlyRate" type="number" step="0.01" placeholder="e.g. 15000" required />
          </div>

          <div className="space-y-2">
            <Label htmlFor="status">Initial Status</Label>
            <Select id="status" name="status" defaultValue="VACANT">
              <option value="VACANT">Vacant</option>
              <option value="OCCUPIED">Occupied</option>
              <option value="MAINTENANCE">Maintenance</option>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 border-t border-slate-100 pt-6">
          <div className="space-y-2">
            <Label htmlFor="waterMeter">Initial Water Meter Reading (m³)</Label>
            <Input id="waterMeter" name="waterMeter" type="number" step="0.01" defaultValue="0" required />
          </div>

          <div className="space-y-2">
            <Label htmlFor="electroMeter">Initial Electricity Meter Reading (kWh)</Label>
            <Input id="electroMeter" name="electroMeter" type="number" step="0.01" defaultValue="0" required />
          </div>
        </div>

        <div className="flex justify-end gap-4 border-t border-slate-100 pt-6">
          <Link href="/units" className="px-4 py-2 border border-slate-200 text-slate-500 hover:text-slate-900 rounded-lg transition-colors font-semibold text-sm">
            Cancel
          </Link>
          <Button type="submit">Create Unit</Button>
        </div>
      </form>
    </div>
  );
}

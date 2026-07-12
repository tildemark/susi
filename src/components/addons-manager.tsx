'use client';

import React, { useState } from 'react';
import { Input, Label } from '@/components/ui-elements';
import { Plus } from 'lucide-react';

interface Addon {
  description: string;
  amount: string;
}

export function AddonsManager() {
  const [addons, setAddons] = useState<Addon[]>([]);

  const addAddon = () => {
    setAddons([...addons, { description: '', amount: '' }]);
  };

  const removeAddon = (index: number) => {
    setAddons(addons.filter((_, i) => i !== index));
  };

  const updateAddon = (index: number, field: keyof Addon, value: string) => {
    const updated = [...addons];
    updated[index][field] = value;
    setAddons(updated);
  };

  return (
    <div className="space-y-5">
      <div id="addons-list" className="space-y-3">
        {addons.map((addon, idx) => (
          <div key={idx} className="grid gap-3 items-end" style={{ gridTemplateColumns: '3fr 1fr auto' }}>
            <div className="space-y-1">
              <Label>Description</Label>
              <Input
                name={`addon_desc_${idx}`}
                placeholder="e.g. WiFi, Parking Space"
                value={addon.description}
                onChange={(e) => updateAddon(idx, 'description', e.target.value)}
                required
              />
            </div>
            <div className="space-y-1">
              <Label>Amount (₱)</Label>
              <Input
                name={`addon_amount_${idx}`}
                type="number"
                step="0.01"
                placeholder="0.00"
                value={addon.amount}
                onChange={(e) => updateAddon(idx, 'amount', e.target.value)}
                required
              />
            </div>
            <button
              type="button"
              onClick={() => removeAddon(idx)}
              className="py-2 px-3 text-xs text-rose-600 border border-rose-200 rounded-lg hover:bg-rose-50 transition-colors font-semibold whitespace-nowrap"
            >
              Remove
            </button>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={addAddon}
        className="inline-flex items-center gap-2 px-4 py-2 border border-dashed border-indigo-300 text-indigo-600 rounded-lg text-xs font-semibold hover:bg-indigo-50 transition-colors"
      >
        <Plus className="h-3.5 w-3.5" /> Add Service
      </button>
    </div>
  );
}

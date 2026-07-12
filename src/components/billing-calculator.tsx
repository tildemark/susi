'use client';

import React, { useState } from 'react';
import { computeBillAction } from '@/app/actions/billing.actions';
import { Button, Input, Label, Select } from '@/components/ui-elements';
import { Droplets, Zap, Eye, Calculator, ArrowRight, X } from 'lucide-react';

interface BillingCalculatorProps {
  occupiedUnits: any[];
  currentMonth: number;
  currentYear: number;
  defaultWaterRate: number;
  defaultElecRate: number;
  defaultLateFee: number;
}

export function BillingCalculator({
  occupiedUnits,
  currentMonth,
  currentYear,
  defaultWaterRate,
  defaultElecRate,
  defaultLateFee,
}: BillingCalculatorProps) {
  const [selectedUnitId, setSelectedUnitId] = useState(occupiedUnits[0]?.id || '');
  const [targetMonth, setTargetMonth] = useState(currentMonth);
  const [targetYear, setTargetYear] = useState(currentYear);
  const [currWater, setCurrWater] = useState('');
  const [currElec, setCurrElec] = useState('');
  
  // Preview Modal state
  const [showPreview, setShowPreview] = useState(false);

  const selectedUnit = occupiedUnits.find((u) => u.id === selectedUnitId);
  const activeLease = selectedUnit?.tenants[0]?.leases?.find((l: any) => l.status === 'ACTIVE');
  const tenant = selectedUnit?.tenants[0];

  // Look up if a bill period has already been processed/inputted for this target month/year
  const matchingBillPeriod = selectedUnit?.billPeriods?.find(
    (bp: any) => bp.month === targetMonth && bp.year === targetYear
  );

  // Sync inputs if a mass reading/precalculated reading exists
  React.useEffect(() => {
    if (matchingBillPeriod) {
      setCurrWater(matchingBillPeriod.currWater.toString());
      setCurrElec(matchingBillPeriod.currElec.toString());
    } else {
      setCurrWater('');
      setCurrElec('');
    }
  }, [selectedUnitId, targetMonth, targetYear, matchingBillPeriod]);

  // Ledger details
  const ledgers = tenant?.ledgers || [];
  const totalPaid = ledgers.filter((l: any) => l.type === 'PAYMENT').reduce((sum: number, l: any) => sum + l.amount, 0);
  const totalCharged = ledgers.filter((l: any) => l.type === 'CHARGE').reduce((sum: number, l: any) => sum + l.amount, 0);
  const runningLedgerCredit = Math.max(0, totalPaid - totalCharged);

  const securityDeposit = activeLease?.securityDeposit || 0;
  const advanceRental = activeLease?.advancePaid || 0;
  const isAdvanceApplied = activeLease?.advanceApplied || false;

  // Resolve meter baselines prior to the target period
  const priorBillPeriods = selectedUnit?.billPeriods
    ? selectedUnit.billPeriods.filter((bp: any) => {
        if (bp.year < targetYear) return true;
        if (bp.year === targetYear && bp.month < targetMonth) return true;
        return false;
      }).sort((a: any, b: any) => {
        if (b.year !== a.year) return b.year - a.year;
        return b.month - a.month;
      })
    : [];

  const lastPriorPeriod = priorBillPeriods[0];

  const prevWater = matchingBillPeriod 
    ? matchingBillPeriod.prevWater 
    : (lastPriorPeriod ? lastPriorPeriod.currWater : (activeLease?.waterMeterBaseline ?? (selectedUnit ? selectedUnit.waterMeter : 0)));

  const prevElec = matchingBillPeriod 
    ? matchingBillPeriod.prevElec 
    : (lastPriorPeriod ? lastPriorPeriod.currElec : (activeLease?.elecMeterBaseline ?? (selectedUnit ? selectedUnit.electroMeter : 0)));

  // Calculations for Preview
  const rentRate = activeLease?.monthlyRate ?? selectedUnit?.monthlyRate ?? 0;
  const waterRate = selectedUnit?.waterWaived ? 0 : defaultWaterRate;
  const elecRate = selectedUnit?.elecWaived ? 0 : defaultElecRate;

  const inputWater = parseFloat(currWater) || 0;
  const inputElec = parseFloat(currElec) || 0;

  const waterDiff = Math.max(0, inputWater - prevWater);
  const elecDiff = Math.max(0, inputElec - prevElec);

  const waterCharge = waterDiff * waterRate;
  const elecCharge = elecDiff * elecRate;

  const isFirstBillOfLease = priorBillPeriods.length === 0;

  let baseRent = rentRate;
  let advanceAppliedThisBill = false;
  if (activeLease && activeLease.advanceConsumed && (isFirstBillOfLease || !activeLease.advanceApplied)) {
    baseRent = 0;
    advanceAppliedThisBill = true;
  }

  const addons = activeLease?.addons || [];
  const totalAddons = addons.reduce((sum: number, a: any) => sum + a.amount, 0);

  const totalCalculated = baseRent + waterCharge + elecCharge + totalAddons;

  const openPreviewModal = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!selectedUnitId || !currWater || !currElec) {
      alert("Please fill out all readings before previewing.");
      return;
    }
    if (inputWater < prevWater || inputElec < prevElec) {
      alert("Current readings cannot be lower than baselines!");
      return;
    }
    setShowPreview(true);
  };

  return (
    <>
      <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
        <div className="space-y-1.5">
          <Label htmlFor="unitId">Select Occupied Unit</Label>
          <Select 
            id="unitId" 
            name="unitId" 
            value={selectedUnitId} 
            onChange={(e) => setSelectedUnitId(e.target.value)}
            required
          >
            {occupiedUnits.map((unit) => (
              <option key={unit.id} value={unit.id}>
                Room {unit.roomNumber} ({unit.tenants[0]?.firstName} {unit.tenants[0]?.lastName})
              </option>
            ))}
          </Select>
        </div>

        {/* Prepopulation Status Badge */}
        {selectedUnit && (
          <div className="flex items-center justify-between text-[11px] px-1">
            <span className="text-slate-450 font-medium">Status for {new Date(0, targetMonth - 1).toLocaleString('en-US', { month: 'short' })} {targetYear}:</span>
            {matchingBillPeriod ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-bold bg-amber-50 text-amber-700 border border-amber-500/35">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                Regeneration Mode (updating statement)
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-bold bg-emerald-50 text-emerald-700 border border-emerald-250">
                New Period Statement
              </span>
            )}
          </div>
        )}

        {/* Dynamic Lease Terms & Prepayments View */}
        {selectedUnit && (
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 text-xs space-y-2.5">
            <p className="font-bold text-slate-800 uppercase tracking-wider text-[10px]">Active Lease Terms &amp; Prepayments</p>
            <div className="grid grid-cols-2 gap-2 text-slate-650">
              <div>Rent Rate: <span className="font-semibold text-slate-800">PHP {rentRate.toLocaleString()}</span></div>
              <div>Billing Cycle: <span className="font-semibold text-slate-800 capitalize">{(activeLease?.billingCycle || 'Monthsary').toLowerCase()}</span></div>
              <div>Security Deposit: <span className="font-semibold text-slate-800">PHP {securityDeposit.toLocaleString()}</span></div>
              <div>Advance Payment: <span className="font-semibold text-slate-800">PHP {advanceRental.toLocaleString()}</span></div>
              <div className="col-span-2 border-t border-slate-200/60 pt-1.5 flex justify-between">
                <span>Advance Disposition:</span>
                <span className="font-semibold text-slate-800">
                  {activeLease?.advanceConsumed 
                    ? (isAdvanceApplied ? 'Applied (consumed)' : 'Apply to first bill')
                    : 'Keep as prepayment'}
                </span>
              </div>
              
              {/* Live readings summary display */}
              <div className="col-span-2 border-t border-slate-200/60 pt-1.5 grid grid-cols-2 gap-1 text-[11px] text-slate-500">
                <div>Water: <span className="font-bold text-cyan-700">{currWater || '—'} m³</span> <span className="text-[9px] text-slate-400 font-normal">(diff: {waterDiff.toFixed(1)}m³)</span></div>
                <div>Electricity: <span className="font-bold text-amber-700">{currElec || '—'} kWh</span> <span className="text-[9px] text-slate-400 font-normal">(diff: {elecDiff.toFixed(1)}kWh)</span></div>
              </div>

              <div className="col-span-2 border-t border-slate-200/60 pt-1.5 flex justify-between text-indigo-700 font-bold">
                <span>Ledger Credits / Payments:</span>
                <span>PHP {runningLedgerCredit.toLocaleString()}</span>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="month">Month</Label>
            <Select id="month" name="month" value={targetMonth} onChange={(e) => setTargetMonth(parseInt(e.target.value))}>
              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                <option key={m} value={m}>
                  {new Date(0, m - 1).toLocaleString('en-US', { month: 'long' })}
                </option>
              ))}
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="year">Year</Label>
            <Select id="year" name="year" value={targetYear} onChange={(e) => setTargetYear(parseInt(e.target.value))}>
              <option value={currentYear}>{currentYear}</option>
              <option value={currentYear + 1}>{currentYear + 1}</option>
            </Select>
          </div>
        </div>

        <div className="space-y-1.5 border-t border-slate-100 pt-4">
          <Label htmlFor="currWater" className="flex items-center gap-1.5">
            <Droplets className="h-4 w-4 text-cyan-600" />
            New Water Reading (m³)
            <span className="text-[10px] text-slate-400 font-normal ml-auto">(prev: {prevWater} m³)</span>
          </Label>
          <Input 
            id="currWater" 
            name="currWater" 
            type="number" 
            step="0.01" 
            placeholder="Current reading" 
            value={currWater}
            onChange={(e) => setCurrWater(e.target.value)}
            required 
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="currElec" className="flex items-center gap-1.5">
            <Zap className="h-4 w-4 text-amber-600" />
            New Electricity Reading (kWh)
            <span className="text-[10px] text-slate-400 font-normal ml-auto">(prev: {prevElec} kWh)</span>
          </Label>
          <Input 
            id="currElec" 
            name="currElec" 
            type="number" 
            step="0.01" 
            placeholder="Current reading" 
            value={currElec}
            onChange={(e) => setCurrElec(e.target.value)}
            required 
          />
        </div>

        <button 
          onClick={openPreviewModal}
          className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-indigo-650 hover:bg-indigo-600 text-white font-bold rounded-lg transition-colors shadow-sm text-sm cursor-pointer"
        >
          <Eye className="h-4 w-4" /> Calculate &amp; Preview Statement
        </button>
      </form>

      {/* Preview Modal */}
      {showPreview && selectedUnit && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
            
            {/* Modal Header */}
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calculator className="h-5 w-5 text-indigo-650" />
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Statement Calculation Preview</h3>
              </div>
              <button 
                onClick={() => setShowPreview(false)} 
                className="p-1 hover:bg-slate-200 rounded-lg transition-all text-slate-450"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto space-y-5 text-xs text-slate-700">
              <div className="border border-slate-200 rounded-xl p-4 space-y-2 bg-slate-50/50 font-mono">
                <p className="font-bold text-center border-b border-slate-200 pb-1 text-slate-800 text-sm">SUSI BILLING STATEMENT</p>
                <div className="grid grid-cols-2 gap-y-1">
                  <div>Unit / Room:</div>
                  <div className="font-semibold text-right">{selectedUnit.roomNumber}</div>
                  <div>Tenant:</div>
                  <div className="font-semibold text-right">{tenant?.firstName} {tenant?.lastName}</div>
                  <div>Billing Period:</div>
                  <div className="font-semibold text-right">{new Date(0, targetMonth - 1).toLocaleString('en-US', { month: 'long' })} {targetYear}</div>
                  <div>Billing Cycle:</div>
                  <div className="font-semibold text-right capitalize">{(activeLease?.billingCycle || 'Monthsary').toLowerCase()}</div>
                </div>
                <div className="border-t border-slate-200 my-2 pt-2 space-y-1.5">
                  <div className="flex justify-between">
                    <span>1. Rent:</span>
                    <span className="font-bold">PHP {baseRent.toLocaleString()} {advanceAppliedThisBill && '(Advance applied)'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>2. Water:</span>
                    <span className="font-bold">
                      PHP {waterCharge.toLocaleString()} ({waterDiff.toFixed(1)}m³ @ PHP {waterRate}/m³)
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>3. Electricity:</span>
                    <span className="font-bold">
                      PHP {elecCharge.toLocaleString()} ({elecDiff.toFixed(1)}kWh @ PHP {elecRate}/kWh)
                    </span>
                  </div>
                  
                  {addons.length > 0 && (
                    <div className="border-t border-slate-100 pt-1.5 mt-1">
                      <p className="font-bold text-slate-500 uppercase text-[9px] mb-1">Add-on Services:</p>
                      {addons.map((a: any, idx: number) => (
                        <div key={idx} className="flex justify-between pl-3 text-slate-600">
                          <span>- {a.description}:</span>
                          <span>PHP {a.amount.toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="border-t-2 border-dashed border-slate-300 pt-2 mt-3 flex justify-between text-sm font-extrabold text-slate-900">
                  <span>TOTAL DUE STATEMENT:</span>
                  <span>PHP {totalCalculated.toLocaleString()}</span>
                </div>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-amber-800 text-[11px] flex gap-2.5">
                <span className="text-base leading-none">⚠️</span>
                <div>
                  <p className="font-bold">Landlord verification notice</p>
                  <p className="mt-0.5">Posting this bill will log charges to the tenant's ledger and automatically dispatch notification copies via their designated channels.</p>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3">
              <button
                onClick={() => setShowPreview(false)}
                className="px-4 py-2 border border-slate-200 hover:bg-slate-200 text-slate-650 font-bold rounded-lg text-xs transition-colors cursor-pointer"
              >
                Go Back
              </button>
              
              {/* Actual form submission of Server Action */}
              <form action={computeBillAction}>
                <input type="hidden" name="unitId" value={selectedUnitId} />
                <input type="hidden" name="month" value={targetMonth} />
                <input type="hidden" name="year" value={targetYear} />
                <input type="hidden" name="currWater" value={currWater} />
                <input type="hidden" name="currElec" value={currElec} />
                
                <button
                  type="submit"
                  className="inline-flex items-center gap-1 px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-xs shadow-sm transition-colors cursor-pointer"
                >
                  Confirm &amp; Post Bill <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </form>
            </div>

          </div>
        </div>
      )}
    </>
  );
}

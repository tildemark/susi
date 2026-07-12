'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  User, Phone, Mail, FileText, CreditCard, Calendar, Droplets, Zap,
  ShieldCheck, Download, Paperclip, ChevronDown, ChevronUp, AlertCircle, Wrench, Plus, MessageSquare,
  Trash2, UploadCloud
} from 'lucide-react';
import { Button } from '@/components/ui-elements';
import { generateCustomLeaseAction, uploadTenantDocumentAction, deleteTenantDocumentAction } from '@/app/actions/document.actions';
import { createTenantNoteAction } from '@/app/actions/tenant-note.actions';
import { createTenantViolationAction } from '@/app/actions/tenant-violation.actions';

interface TenantDetailTabsProps {
  tenant: any;
  activeLease?: any;
  billPeriods: any[];
  chartPeriods: any[];
  monthlyLedger: any[];
  addOns: any[];
  leaseAgreements: any[];
  billDocuments: any[];
  notices: any[];
  idUploads: any[];
  unlinkTenantAction: any;
  addTenantAddonAction: any;
  generateLeaseAction: any;
  generateNoticeAction: any;
  defaultTab?: string;
}

export function TenantDetailTabs({
  tenant,
  activeLease,
  billPeriods,
  chartPeriods,
  monthlyLedger,
  addOns,
  leaseAgreements,
  billDocuments,
  notices,
  idUploads,
  unlinkTenantAction,
  addTenantAddonAction,
  generateLeaseAction,
  generateNoticeAction,
  defaultTab,
}: TenantDetailTabsProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'ledger' | 'lease-docs' | 'notes' | 'maintenance' | 'violations'>(
    (defaultTab as any) || 'overview'
  );

  React.useEffect(() => {
    if (defaultTab) {
      setActiveTab(defaultTab as any);
    }
  }, [defaultTab]);

  const [expandedLedgerRows, setExpandedLedgerRows] = useState<Record<string, boolean>>({});
  const [isDragging, setIsDragging] = useState(false);
  const [draggedFile, setDraggedFile] = useState<File | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      setDraggedFile(file);
      if (fileInputRef.current) {
        fileInputRef.current.files = e.dataTransfer.files;
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setDraggedFile(e.target.files[0]);
    }
  };
  const [isLeaseModalOpen, setIsLeaseModalOpen] = useState(false);

  const toggleRow = (key: string) => {
    setExpandedLedgerRows((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  // Compute running balance chronologically
  const sortedLedgersAsc = [...tenant.ledgers].sort(
    (a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  let balanceAccumulator = 0;
  const ledgersWithBalance = sortedLedgersAsc.map((l: any) => {
    if (l.type === 'CHARGE') {
      balanceAccumulator += l.amount;
    } else {
      balanceAccumulator -= l.amount;
    }
    return { ...l, runningBalance: balanceAccumulator };
  });

  // Filter ledgers by month & year for expandable details
  const getPeriodLedgerItems = (year: number, month: number) => {
    return ledgersWithBalance.filter((l: any) => {
      const d = new Date(l.date);
      return d.getFullYear() === year && (d.getMonth() + 1) === month;
    });
  };

  return (
    <div className="space-y-6">
      {/* Tabs Menu */}
      <div className="border-b border-slate-200">
        <nav className="flex gap-6 -mb-px overflow-x-auto pb-1">
          {(['overview', 'ledger', 'lease-docs', 'notes', 'maintenance', 'violations'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`pb-4 px-1 border-b-2 font-semibold text-sm capitalize transition-colors whitespace-nowrap ${
                activeTab === tab
                  ? 'border-indigo-650 text-indigo-650'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-350'
              }`}
            >
              {tab === 'overview'
                ? 'Overview'
                : tab === 'ledger'
                ? 'Statement of Account (SOA)'
                : tab === 'lease-docs'
                ? 'Lease & Documents'
                : tab === 'notes'
                ? 'History & Notes'
                : tab === 'maintenance'
                ? 'Maintenance Requests'
                : 'Violations Log'}
            </button>
          ))}
        </nav>
      </div>

      {/* Main Workspace (Full Width) */}
      <div className="space-y-6">
        
        {/* TAB 1: OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Utility Consumption Trends */}
            {tenant.unit && chartPeriods.length > 0 && (
              <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-6">
                <div>
                  <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                    <Droplets className="h-5 w-5 text-indigo-600" />
                    Utility Consumption Trends
                  </h2>
                  <p className="text-slate-500 text-xs mt-1">Water and electricity usage calculated from recent billing metrics.</p>
                </div>

                <div className="space-y-4">
                  <div className="h-44 flex items-end justify-between gap-4 border-b border-l border-slate-200 p-2 pt-6">
                    {chartPeriods.map((bp) => {
                      const water = bp.currWater - bp.prevWater;
                      const elec = bp.currElec - bp.prevElec;
                      const maxVal = Math.max(...chartPeriods.map(x => Math.max(x.currWater - x.prevWater, x.currElec - x.prevElec, 1)));
                      const waterHeight = `${(water / maxVal) * 100}%`;
                      const elecHeight = `${(elec / maxVal) * 100}%`;

                      return (
                        <div key={bp.id} className="flex-1 flex flex-col items-center h-full justify-end group relative">
                          <div className="flex gap-1.5 items-end h-full w-full justify-center">
                            <div
                              style={{ height: waterHeight }}
                              className="w-3.5 bg-cyan-500 rounded-t-sm hover:opacity-85 transition-all cursor-pointer relative"
                              title={`Water: ${water.toFixed(1)} m³`}
                            />
                            <div
                              style={{ height: elecHeight }}
                              className="w-3.5 bg-amber-50 rounded-t-sm hover:opacity-85 transition-all cursor-pointer relative"
                              title={`Electric: ${elec.toFixed(1)} kWh`}
                            />
                          </div>
                          <span className="text-[10px] text-slate-555 mt-2 font-bold uppercase">
                            {new Date(0, bp.month - 1).toLocaleString('en-US', { month: 'short' })}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                  
                  <div className="flex justify-center gap-6 text-xs font-semibold pt-2">
                    <span className="flex items-center gap-1.5 text-cyan-600">
                      <span className="h-3 w-3 bg-cyan-500 rounded-sm inline-block" /> Water (m³)
                    </span>
                    <span className="flex items-center gap-1.5 text-amber-600">
                      <span className="h-3 w-3 bg-amber-50 rounded-sm inline-block" /> Electricity (kWh)
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Personal Details Profile summary card */}
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-4">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <User className="h-5 w-5 text-indigo-650" />
                Tenant Personal File
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
                <div>
                  <span className="text-xs text-slate-500 block font-semibold uppercase tracking-wider">First Name</span>
                  <span className="text-slate-800 font-semibold mt-1 block">{tenant.firstName}</span>
                </div>
                <div>
                  <span className="text-xs text-slate-500 block font-semibold uppercase tracking-wider">Last Name</span>
                  <span className="text-slate-800 font-semibold mt-1 block">{tenant.lastName}</span>
                </div>
                <div>
                  <span className="text-xs text-slate-500 block font-semibold uppercase tracking-wider">Email Address</span>
                  <span className="text-slate-850 font-medium mt-1 block">{tenant.email}</span>
                </div>
                <div>
                  <span className="text-xs text-slate-500 block font-semibold uppercase tracking-wider">Phone Contact</span>
                  <span className="text-slate-855 font-medium mt-1 block">{tenant.phone}</span>
                </div>
                <div>
                  <span className="text-xs text-slate-500 block font-semibold uppercase tracking-wider">Created Timestamp</span>
                  <span className="text-slate-700 mt-1 block">{new Date(tenant.createdAt).toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-xs text-slate-500 block font-semibold uppercase tracking-wider">Billing Preference</span>
                  <span className="text-indigo-650 font-bold mt-1 block">{tenant.billingPreference}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: FINANCIALS & LEDGER */}
        {activeTab === 'ledger' && (
          <div className="space-y-6">
            {/* Consolidated Billing & Payments Ledger */}
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-4">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Calendar className="h-5 w-5 text-indigo-600" />
                Billing & Payments Ledger
              </h2>
              
              {monthlyLedger.length === 0 ? (
                <p className="text-sm text-slate-400 py-6 text-center border border-dashed border-slate-200 rounded-lg">
                  No billing or payment transactions recorded yet.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50 text-[11px] text-slate-555 uppercase">
                        <th className="px-4 py-3">Billing Period</th>
                        <th className="px-4 py-3">Billed</th>
                        <th className="px-4 py-3">Paid</th>
                        <th className="px-4 py-3">Receipt</th>
                        <th className="px-4 py-3">Statement PDF</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3 text-right">Details</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-sm">
                      {monthlyLedger.map((item) => {
                        const { year, month, bp, totalBilled, totalPaidForPeriod, receiptUrl } = item;
                        const key = `${year}-${month}`;
                        const isExpanded = !!expandedLedgerRows[key];
                        const periodItems = getPeriodLedgerItems(year, month);

                        const status =
                          totalBilled === 0
                            ? 'No Charge'
                            : totalPaidForPeriod >= totalBilled
                            ? 'Paid'
                            : totalPaidForPeriod > 0
                            ? 'Partial'
                            : 'Unpaid';

                        return (
                          <React.Fragment key={key}>
                            <tr className="hover:bg-slate-50/50 transition-colors">
                              <td className="px-4 py-3 font-semibold text-slate-800">
                                {new Date(0, month - 1).toLocaleString('en-US', { month: 'long' })} {year}
                              </td>
                              <td className="px-4 py-3 text-slate-900 font-medium">
                                ₱{totalBilled.toLocaleString()}
                              </td>
                              <td className="px-4 py-3 text-emerald-600 font-bold">
                                ₱{totalPaidForPeriod.toLocaleString()}
                              </td>
                              <td className="px-4 py-3">
                                {receiptUrl ? (
                                  <a
                                    href={receiptUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex items-center gap-1 text-indigo-650 hover:underline font-semibold"
                                  >
                                    <Paperclip className="h-3.5 w-3.5" /> Receipt
                                  </a>
                                ) : (
                                  <span className="text-slate-400 text-xs">No Upload</span>
                                )}
                              </td>
                              <td className="px-4 py-3">
                                {bp?.billPdfUrl ? (
                                  <a
                                    href={bp.billPdfUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex items-center gap-1 text-indigo-650 hover:underline font-semibold"
                                  >
                                    <Download className="h-3.5 w-3.5" /> PDF
                                  </a>
                                ) : (
                                  <span className="text-slate-400 text-xs">No PDF</span>
                                )}
                              </td>
                              <td className="px-4 py-3">
                                <span
                                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                                    status === 'Paid'
                                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                                      : status === 'Partial'
                                      ? 'bg-amber-50 text-amber-700 border border-amber-100'
                                      : status === 'No Charge'
                                      ? 'bg-slate-50 text-slate-500 border border-slate-200'
                                      : 'bg-rose-50 text-rose-700 border border-rose-100'
                                  }`}
                                >
                                  {status}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-right">
                                <button
                                  onClick={() => toggleRow(key)}
                                  className="text-slate-450 hover:text-indigo-650 p-1 rounded-md hover:bg-slate-100 transition-colors font-bold text-xs inline-flex items-center gap-1"
                                >
                                  {isExpanded ? 'Hide' : 'Expand'}
                                  {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                                </button>
                              </td>
                            </tr>

                            {/* Collapsable breakdown sub-table */}
                            {isExpanded && (
                              <tr>
                                <td colSpan={7} className="px-6 py-4 bg-slate-50/50 border-t border-b border-slate-150">
                                  <div className="space-y-3">
                                    <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Itemized Transactions & Running Balance</h4>
                                    <div className="overflow-x-auto">
                                      <table className="w-full text-left text-xs border-collapse">
                                        <thead>
                                          <tr className="border-b border-slate-200 bg-white/70 text-[9px] text-slate-455 uppercase">
                                            <th className="px-3 py-2">Date</th>
                                            <th className="px-3 py-2">Reference ID</th>
                                            <th className="px-3 py-2">Description</th>
                                            <th className="px-3 py-2">Billed Status</th>
                                            <th className="px-3 py-2">Amount</th>
                                            <th className="px-3 py-2 text-right">Running Balance</th>
                                          </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                          {periodItems.map((item: any) => {
                                            const isBilled = bp && item.type === 'CHARGE' && (
                                              item.description.toLowerCase().includes('rent') ||
                                              item.description.toLowerCase().includes('water') ||
                                              item.description.toLowerCase().includes('electric') ||
                                              item.description.toLowerCase().includes('late fee')
                                            );

                                            return (
                                              <tr key={item.id} className="hover:bg-white/40">
                                                <td className="px-3 py-2 text-slate-500">{new Date(item.date).toLocaleDateString()}</td>
                                                <td className="px-3 py-2 font-mono text-slate-400 uppercase">{item.id.slice(0, 8)}</td>
                                                <td className="px-3 py-2 font-semibold text-slate-700">{item.description}</td>
                                                <td className="px-3 py-2">
                                                  {item.type === 'PAYMENT' ? (
                                                    <span className="text-slate-400 italic">N/A</span>
                                                  ) : (
                                                    <span
                                                      className={`inline-flex items-center px-1.5 py-0.5 rounded text-[8px] font-bold ${
                                                        isBilled
                                                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                                                          : 'bg-amber-50 text-amber-700 border border-amber-100'
                                                      }`}
                                                    >
                                                      {isBilled ? 'Billed' : 'Unbilled'}
                                                    </span>
                                                  )}
                                                </td>
                                                <td className={`px-3 py-2 font-bold ${item.type === 'CHARGE' ? 'text-slate-900' : 'text-emerald-600'}`}>
                                                  {item.type === 'CHARGE' ? '+' : '-'}₱{item.amount.toLocaleString()}
                                                </td>
                                                <td className="px-3 py-2 text-right font-bold text-slate-900">₱{item.runningBalance.toLocaleString()}</td>
                                              </tr>
                                            );
                                          })}
                                        </tbody>
                                      </table>
                                    </div>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: LEASE & DOCUMENTS */}
        {activeTab === 'lease-docs' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
            {/* Left side: Lease details and actions */}
            <div className="md:col-span-2 space-y-6">
              
              {/* Room Lease Assignment controls card */}
              <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-6">
                <div className="flex justify-between items-center border-b border-slate-100 pb-4">
                  <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                    <User className="h-5 w-5 text-indigo-650" />
                    Room Lease Assignment & Controls
                  </h2>
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                      tenant.unit
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                        : 'bg-slate-50 text-slate-400 border border-slate-250'
                    }`}
                  >
                    {tenant.unit ? 'Occupied' : 'Vacant / Unassigned'}
                  </span>
                </div>

                {activeLease ? (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100 text-sm">
                      <div>
                        <span className="text-xs text-slate-500 font-medium block">Assigned Unit</span>
                        <Link href={`/units/${activeLease.unit.id}`} className="font-bold text-indigo-650 hover:underline mt-0.5 block">
                          Room {activeLease.unit.roomNumber}
                        </Link>
                      </div>
                      <div>
                        <span className="text-xs text-slate-500 font-medium block">Agreed Rent</span>
                        <span className="font-bold text-slate-800 mt-0.5 block">₱{activeLease.monthlyRate.toLocaleString()}</span>
                      </div>
                      <div>
                        <span className="text-xs text-slate-500 font-medium block">Billing Cycle</span>
                        <span className="font-bold text-slate-800 mt-0.5 block capitalize">{activeLease.billingCycle.toLowerCase()}</span>
                      </div>
                      <div>
                        <span className="text-xs text-slate-500 font-medium block">Lease Start</span>
                        <span className="font-bold text-slate-800 mt-0.5 block">
                          {new Date(activeLease.leaseStartDate).toLocaleDateString()}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3 pt-2">
                      <Link
                        href={`/leases/${activeLease.id}`}
                        className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-lg shadow transition-colors text-xs"
                      >
                        Manage Lease Agreement &rarr;
                      </Link>
                      <Link
                        href={`/leases/${activeLease.id}?tab=documents`}
                        className="inline-flex items-center justify-center gap-2 px-5 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold rounded-lg transition-colors text-xs"
                      >
                        View Documents &amp; Upload Signed Copy
                      </Link>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-10 bg-slate-50 rounded-xl border border-dashed border-slate-200 space-y-3">
                    <p className="text-slate-500 text-sm font-medium">Tenant currently has no active lease agreement.</p>
                    <Link
                      href={`/leases/new?tenantId=${tenant.id}`}
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-lg transition-colors shadow-sm"
                    >
                      Onboard Tenant / Create Lease
                    </Link>
                  </div>
                )}
              </div>

              {/* Agreements & Documents Card */}
              <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-6">
                <div>
                  <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                    <FileText className="h-5 w-5 text-indigo-650" />
                    Agreements & Documents
                  </h2>
                  <p className="text-slate-500 text-xs mt-1">Official lease agreements, notices, government ID verifications, and payment proofs.</p>
                            {/* Unified Documents List */}
                {(() => {
                  const combinedDocs = [
                    ...leaseAgreements,
                    ...billDocuments,
                    ...notices,
                    ...idUploads,
                    ...tenant.documents
                  ];

                  const seenUrls = new Set<string>();
                  const uniqueDocs = combinedDocs.filter((d: any) => {
                    if (!d.fileUrl) return false;
                    if (seenUrls.has(d.fileUrl)) return false;
                    seenUrls.add(d.fileUrl);
                    return true;
                  }).sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

                  if (uniqueDocs.length === 0) {
                    return (
                      <p className="text-sm text-slate-400 py-6 text-center border border-dashed border-slate-200 rounded-lg">
                        No documents or lease uploads present for this tenant.
                      </p>
                    );
                  }

                  return (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="border-b border-slate-200 bg-slate-50 text-[10px] text-slate-550 uppercase">
                            <th className="px-3 py-2">Document Type</th>
                            <th className="px-3 py-2">Upload Date</th>
                            <th className="px-3 py-2">Action</th>
                            <th className="px-3 py-2 text-right">Remove</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-slate-700">
                          {uniqueDocs.map((doc: any) => {
                            let typeLabel = doc.type;
                            if (doc.type === 'LEASE') typeLabel = doc.label || 'Lease Agreement';
                            if (doc.type === 'SIGNED_LEASE') typeLabel = 'Signed Lease Agreement';
                            if (doc.type === 'GOVT_ID' || doc.type === 'ID_VERIFICATION' || doc.type === 'GOVERNMENT_ID') typeLabel = 'Government ID Upload';
                            if (doc.type === 'PAYMENT_PROOF') typeLabel = 'Proof of Payment / Receipt';
                            if (doc.type === 'BILL') typeLabel = 'Monthly Statement';
                            if (doc.type === 'NOTICE_ARREARS') typeLabel = 'Arrears Notification Notice';
                            if (doc.type === 'NOTICE_EVICTION') typeLabel = 'Eviction Notification Notice';
                            if (doc.type === 'OTHER') typeLabel = doc.label || 'Other Attachment';

                            // Check if this document can be deleted (only direct uploaded tenant documents can be deleted)
                            const isSystemDoc = doc.type === 'LEASE' && !doc.isUploaded;

                            return (
                              <tr key={doc.id} className="hover:bg-slate-50/50">
                                <td className="px-3 py-2.5 font-bold text-slate-800">{typeLabel}</td>
                                <td className="px-3 py-2.5 text-slate-500">{new Date(doc.createdAt).toLocaleDateString()}</td>
                                <td className="px-3 py-2.5">
                                  <a
                                    href={doc.fileUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 font-semibold text-indigo-650 hover:underline"
                                  >
                                    <Download className="h-3 w-3" /> View / Download
                                  </a>
                                </td>
                                <td className="px-3 py-2.5 text-right">
                                  {!isSystemDoc ? (
                                    <form action={deleteTenantDocumentAction.bind(null, tenant.id, doc.id)} className="inline">
                                      <button
                                        type="submit"
                                        className="p-1 text-slate-400 hover:text-rose-600 rounded hover:bg-rose-50 transition-colors cursor-pointer"
                                        title="Delete Document"
                                      >
                                        <Trash2 className="h-3.5 w-3.5" />
                                      </button>
                                    </form>
                                  ) : (
                                    <span className="text-[10px] text-slate-400 italic">Locked</span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  );
                })()}
              </div>

                {/* Drag-and-Drop Upload Form */}
                <form
                  action={uploadTenantDocumentAction.bind(null, tenant.id)}
                  className="space-y-4 border-t border-slate-100 pt-4"
                >
                  <h3 className="text-sm font-bold text-slate-800">Upload Signed Agreements & Verification Files</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] text-slate-500 mb-1 uppercase font-bold">Document Type / Label</label>
                      <select
                        name="type"
                        required
                        className="w-full p-2 border border-slate-200 rounded-lg text-xs font-normal focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white"
                      >
                        <option value="SIGNED_LEASE">Signed Lease Agreement Contract</option>
                        <option value="GOVT_ID">Government ID Verification</option>
                        <option value="PAYMENT_PROOF">Payment Proof / Deposit Slip</option>
                        <option value="OTHER">Other Tenant Attachment</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] text-slate-500 mb-1 uppercase font-bold">Drag & Drop Upload Zone</label>
                      <div
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                        onClick={() => fileInputRef.current?.click()}
                        className={`border-2 border-dashed rounded-xl p-4 flex flex-col items-center justify-center cursor-pointer transition-all ${
                          isDragging
                            ? 'border-indigo-500 bg-indigo-50/50'
                            : 'border-slate-300 hover:border-indigo-400 bg-slate-50 hover:bg-slate-100/50'
                        }`}
                      >
                        <UploadCloud className={`h-6 w-6 mb-1.5 ${isDragging ? 'text-indigo-650' : 'text-slate-400'}`} />
                        <span className="text-[10px] font-semibold text-slate-600 text-center">
                          {draggedFile ? `Selected: ${draggedFile.name}` : 'Drag file here or click to browse'}
                        </span>
                        <input
                          type="file"
                          name="file"
                          ref={fileInputRef}
                          required
                          onChange={handleFileChange}
                          className="hidden"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end pt-2">
                    <button
                      type="submit"
                      className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
                    >
                      <Plus className="h-4 w-4" /> Upload Document
                    </button>
                  </div>
                </form>
              </div>
            </div>

            {/* Right side: Add-on charges config */}
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-4">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-indigo-600" />
                Add-ons Availed
              </h2>
              {addOns.length === 0 ? (
                <p className="text-xs text-slate-400 py-2">No custom add-ons (Wi-Fi, parking space, gym, etc.) availed yet.</p>
              ) : (
                <div className="space-y-2.5 text-xs max-h-48 overflow-y-auto">
                  {addOns.map((add: any) => (
                    <div key={add.id} className="flex justify-between items-center border-b border-slate-100 pb-2">
                      <div>
                        <p className="font-bold text-slate-700">{add.description}</p>
                        <p className="text-slate-400 mt-0.5">{new Date(add.date).toLocaleDateString()}</p>
                      </div>
                      <span className="font-semibold text-indigo-600">₱{add.amount}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Form to add an add-on */}
              <form action={addTenantAddonAction.bind(null, tenant.id, tenant.unitId)} className="space-y-2.5 border-t border-slate-100 pt-3">
                <p className="text-[10px] font-bold text-slate-550 uppercase tracking-wider">Charge Custom Add-on</p>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    name="description"
                    placeholder="e.g. WiFi Access"
                    required
                    className="px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs w-full focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white"
                  />
                  <input
                    name="amount"
                    type="number"
                    placeholder="Amount (₱)"
                    required
                    step="0.01"
                    className="px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs w-full focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full text-center px-4 py-1.5 bg-indigo-600 hover:bg-indigo-550 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors"
                >
                  Add Add-on Charge
                </button>
              </form>
            </div>
          </div>
        )}

        {/* TAB 4: HISTORY & NOTES */}
        {activeTab === 'notes' && (
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-6">
            <div>
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-indigo-650" />
                Timeline of Notes & Communications
              </h2>
              <p className="text-slate-500 text-xs mt-1">Logs representing automatic system operations, notice records, and manual landlord entries.</p>
            </div>

            <div className="space-y-3.5 max-h-[500px] overflow-y-auto pr-1">
              {(tenant.notes ?? []).length === 0 ? (
                <p className="text-sm text-slate-400 py-6 text-center border border-dashed border-slate-200 rounded-lg">
                  No chronological logs or landlord notes recorded.
                </p>
              ) : (
                (tenant.notes ?? []).map((note: any) => {
                  const style =
                    note.type === 'SYSTEM'
                      ? 'bg-slate-50 border-slate-100 text-slate-600'
                      : note.type === 'EMAIL'
                      ? 'bg-cyan-50/50 border-cyan-100 text-cyan-800'
                      : 'bg-indigo-50/40 border-indigo-100 text-slate-700';

                  return (
                    <div key={note.id} className={`p-3 border rounded-xl text-xs leading-relaxed ${style} shadow-sm`}>
                      <div className="flex justify-between items-center mb-1.5 font-bold text-[9px] text-slate-400 uppercase tracking-wider">
                        <span>{note.type} Note</span>
                        <span>{new Date(note.date).toLocaleString()}</span>
                      </div>
                      <p className="font-medium text-slate-800 leading-relaxed">{note.content}</p>
                    </div>
                  );
                })
              )}
            </div>

            {/* Note submission Form */}
            <form action={createTenantNoteAction.bind(null, tenant.id)} className="space-y-3 border-t border-slate-100 pt-4">
              <h3 className="text-sm font-bold text-slate-800">Add Log Entry / History Note</h3>
              <textarea
                name="content"
                placeholder="Write communication note details, telephone log summary, or custom lease notes here..."
                required
                rows={4}
                className="w-full p-2.5 border border-slate-200 rounded-lg text-xs font-normal focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white"
              />
              <div className="flex justify-end">
                <button
                  type="submit"
                  className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-bold transition-all shadow-sm"
                >
                  Save Note Entry
                </button>
              </div>
            </form>
          </div>
        )}

        {/* TAB 5: MAINTENANCE REQUESTS */}
        {activeTab === 'maintenance' && (
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-4">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Wrench className="h-5 w-5 text-indigo-600" />
              Maintenance History
            </h2>
            {tenant.maintenanceRequests.length === 0 ? (
              <p className="text-sm text-slate-400 py-6 text-center border border-dashed border-slate-200 rounded-lg">
                No maintenance requests submitted yet.
              </p>
            ) : (
              <div className="space-y-3">
                {tenant.maintenanceRequests.map((req: any) => (
                  <div key={req.id} className="p-4 border border-slate-150 rounded-xl hover:bg-slate-55 transition-colors flex justify-between items-start gap-4">
                    <div>
                      <h4 className="font-semibold text-slate-800 text-sm">{req.title}</h4>
                      <p className="text-xs text-slate-505 mt-1 leading-relaxed">{req.description}</p>
                      <span className="text-[10px] text-slate-400 block mt-2">{new Date(req.createdAt).toLocaleDateString()}</span>
                    </div>
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                        req.status === 'RESOLVED'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                          : req.status === 'IN_PROGRESS'
                          ? 'bg-amber-50 text-amber-700 border border-amber-100'
                          : 'bg-slate-100 text-slate-500 border border-slate-200'
                      }`}
                    >
                      {req.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 6: VIOLATIONS LOG */}
        {activeTab === 'violations' && (
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-6">
            <div>
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-rose-600 animate-pulse" />
                Violations Log
              </h2>
              <p className="text-slate-550 text-xs mt-1">Record of community guidelines, lease, or space violations logged for this tenant.</p>
            </div>

            {(tenant.violations ?? []).length === 0 ? (
              <p className="text-sm text-slate-400 py-6 text-center border border-dashed border-slate-200 rounded-lg">
                No violations logged for this tenant.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-[10px] text-slate-550 uppercase">
                      <th className="px-4 py-2.5">Date & Time</th>
                      <th className="px-4 py-2.5">Infraction Type</th>
                      <th className="px-4 py-2.5">Description</th>
                      <th className="px-4 py-2.5">Action Done</th>
                      <th className="px-4 py-2.5">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {(tenant.violations ?? []).map((v: any) => (
                      <tr key={v.id} className="hover:bg-slate-50/50">
                        <td className="px-4 py-2.5 whitespace-nowrap">{new Date(v.date).toLocaleString()}</td>
                        <td className="px-4 py-2.5 font-bold text-rose-650">{v.type}</td>
                        <td className="px-4 py-2.5 max-w-xs truncate" title={v.description}>{v.description}</td>
                        <td className="px-4 py-2.5">{v.actionDone}</td>
                        <td className="px-4 py-2.5">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              v.status === 'RESOLVED'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                                : v.status === 'FINED'
                                ? 'bg-amber-50 text-amber-700 border border-amber-100'
                                : 'bg-rose-50 text-rose-700 border border-rose-100'
                            }`}
                          >
                            {v.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Log new violation form */}
            <form action={createTenantViolationAction.bind(null, tenant.id)} className="space-y-4 border-t border-slate-100 pt-4">
              <h3 className="text-sm font-bold text-slate-800">Log New Guidelines Infraction</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[10px] text-slate-500 mb-1 uppercase font-bold">Violation Type</label>
                  <select
                    name="type"
                    required
                    className="w-full p-2 border border-slate-200 rounded-lg text-xs font-normal focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white"
                  >
                    <option value="NOISE">Noise Complaint (Loud at Night)</option>
                    <option value="DAMAGE">Property Damage</option>
                    <option value="LEASE_INFRACTION">Lease Infraction / Over occupancy</option>
                    <option value="OTHER">Other Rules Infraction</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] text-slate-500 mb-1 uppercase font-bold">Date & Time of Event</label>
                  <input
                    type="datetime-local"
                    name="date"
                    required
                    className="w-full p-2 border border-slate-200 rounded-lg text-xs font-normal focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-500 mb-1 uppercase font-bold">Resolution Status</label>
                  <select
                    name="status"
                    defaultValue="ACTIVE"
                    className="w-full p-2 border border-slate-200 rounded-lg text-xs font-normal focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white"
                  >
                    <option value="ACTIVE">Active Warning</option>
                    <option value="RESOLVED">Resolved / Dismissed</option>
                    <option value="FINED">Fine Imposed</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] text-slate-550 mb-1 uppercase font-bold">Infraction Details / Description</label>
                <textarea
                  name="description"
                  placeholder="Describe what occurred (e.g. Loud music and party noise after 2:00 AM...)"
                  required
                  rows={3}
                  className="w-full p-2.5 border border-slate-200 rounded-lg text-xs font-normal focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white"
                />
              </div>

              <div>
                <label className="block text-[10px] text-slate-550 mb-1 uppercase font-bold">Action Taken / Resolution Notes</label>
                <input
                  name="actionDone"
                  placeholder="e.g. Issued written warning, tenant advised on guest limits"
                  required
                  className="w-full p-2 border border-slate-200 rounded-lg text-xs font-normal focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white"
                />
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-550 text-white rounded-lg text-xs font-bold transition-all shadow-sm flex items-center gap-1.5"
                >
                  <Plus className="h-4 w-4" /> Log Infraction
                </button>
              </div>
            </form>
          </div>
        )}
      </div>

      {/* Custom Lease Generator Modal */}
      {isLeaseModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[99999] flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto pointer-events-auto">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="text-xl font-bold text-slate-900">Custom Lease Agreement Generator</h3>
              <button onClick={() => setIsLeaseModalOpen(false)} className="text-slate-400 hover:text-slate-655 font-bold text-lg">✕</button>
            </div>

            <form action={async (formData) => {
              await generateCustomLeaseAction(tenant.id, formData);
              setIsLeaseModalOpen(false);
            }} className="space-y-4 text-xs font-semibold text-slate-700">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-500 mb-1">Lease Start Date</label>
                  <input
                    type="date"
                    name="leaseStartDate"
                    required
                    defaultValue={new Date(tenant.leaseStartDate).toISOString().split('T')[0]}
                    className="w-full p-2 border border-slate-200 rounded-lg text-sm font-normal focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-500 mb-1">Monthly Rate (₱)</label>
                  <input
                    type="number"
                    name="monthlyRate"
                    required
                    defaultValue={tenant.unit ? tenant.unit.monthlyRate : 0}
                    className="w-full p-2 border border-slate-200 rounded-lg text-sm font-normal focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-500 mb-1">Security Deposit Paid (₱)</label>
                  <input
                    type="number"
                    name="depositPaid"
                    required
                    defaultValue={tenant.depositPaid}
                    className="w-full p-2 border border-slate-200 rounded-lg text-sm font-normal focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-500 mb-1">Advance Rental Paid (₱)</label>
                  <input
                    type="number"
                    name="advancePaid"
                    required
                    defaultValue={tenant.advancePaid}
                    className="w-full p-2 border border-slate-200 rounded-lg text-sm font-normal focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-500 mb-1">Water Waiver Preference</label>
                  <select
                    name="waterWaived"
                    defaultValue={tenant.unit?.waterWaived ? 'true' : 'false'}
                    className="w-full p-2 border border-slate-200 rounded-lg text-sm font-normal focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white"
                  >
                    <option value="true">Waived (Free)</option>
                    <option value="false">Standard Metered Billing</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-500 mb-1">Electric Waiver Preference</label>
                  <select
                    name="elecWaived"
                    defaultValue={tenant.unit?.elecWaived ? 'true' : 'false'}
                    className="w-full p-2 border border-slate-200 rounded-lg text-sm font-normal focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white"
                  >
                    <option value="true">Waived (Free)</option>
                    <option value="false">Standard Metered Billing</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-500 mb-1">Landlord Signatory Name</label>
                  <input
                    name="landlordSignatory"
                    required
                    defaultValue="SUSI Space Management Representative"
                    className="w-full p-2 border border-slate-200 rounded-lg text-sm font-normal focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-500 mb-1">Tenant Signatory Name</label>
                  <input
                    name="tenantSignatory"
                    required
                    defaultValue={`${tenant.firstName} ${tenant.lastName}`}
                    className="w-full p-2 border border-slate-200 rounded-lg text-sm font-normal focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-500 mb-1">Rules & Regulations Clause</label>
                <textarea
                  name="customRules"
                  required
                  rows={6}
                  defaultValue={`* The leased premises shall be occupied solely as a private residential dwelling.\n* Subleasing, unauthorized guests staying longer than 14 days, and commercial activities are strictly prohibited without written consent from the Landlord.\n* The Tenant shall maintain the unit in a clean, sanitary, and safe condition.`}
                  className="w-full p-2.5 border border-slate-200 rounded-lg text-xs font-normal focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white font-mono leading-relaxed"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsLeaseModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded-lg hover:bg-slate-55 text-slate-700 transition-colors font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-550 text-white rounded-lg shadow-sm transition-colors font-semibold"
                >
                  Generate Lease Contract
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

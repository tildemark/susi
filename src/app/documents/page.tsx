import { FileText } from 'lucide-react';

export default function DocumentsPage() {
  return (
    <div className="p-8 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Documents</h1>
          <p className="text-slate-550 mt-1">Tenant lease agreements, eviction notices, and invoices repository.</p>
        </div>
      </div>
      <div className="bg-white border border-slate-200 rounded-xl p-8 text-center space-y-4 shadow-sm">
        <div className="inline-flex p-4 bg-teal-50 text-teal-600 rounded-2xl mx-auto">
          <FileText className="h-10 w-10" />
        </div>
        <h3 className="text-lg font-semibold text-slate-800">No documents found</h3>
        <p className="text-slate-500 text-sm max-w-sm mx-auto">
          Upload leases and generate notices dynamically in Phase 4.
        </p>
      </div>
    </div>
  );
}

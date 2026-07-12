import { db } from '@/lib/db';
import { FileText, Download, Eye, Search } from 'lucide-react';
import Link from 'next/link';

export const revalidate = 0;

export default async function DocumentsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; type?: string }>;
}) {
  const resolvedSearchParams = await searchParams;
  const q = resolvedSearchParams.q || '';
  const typeFilter = resolvedSearchParams.type || '';

  // Fetch all tenant documents and lease documents to merge into a single view
  const tenantDocs = await db.document.findMany({
    include: {
      tenant: {
        include: {
          unit: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  const leaseDocs = await db.leaseDocument.findMany({
    include: {
      lease: {
        include: {
          tenant: true,
          unit: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  // Map them to a unified document structure
  const mappedTenantDocs = tenantDocs.map((doc) => ({
    id: doc.id,
    type: doc.type,
    label: doc.type === 'LEASE' ? 'Lease Agreement' : doc.type === 'BILL' ? 'Billing Statement' : doc.type,
    fileUrl: doc.fileUrl,
    createdAt: doc.createdAt,
    tenantName: doc.tenant ? `${doc.tenant.firstName} ${doc.tenant.lastName}` : 'N/A',
    tenantId: doc.tenantId,
    roomNumber: doc.tenant?.unit?.roomNumber || 'N/A',
    isUploaded: false,
  }));

  const mappedLeaseDocs = leaseDocs.map((doc) => ({
    id: doc.id,
    type: 'LEASE',
    label: doc.label || 'Lease Agreement',
    fileUrl: doc.fileUrl,
    createdAt: doc.createdAt,
    tenantName: doc.lease?.tenant ? `${doc.lease.tenant.firstName} ${doc.lease.tenant.lastName}` : 'N/A',
    tenantId: doc.lease?.tenantId || '',
    roomNumber: doc.lease?.unit?.roomNumber || 'N/A',
    isUploaded: doc.isUploaded,
  }));

  // Combine and deduplicate if fileUrls match, keeping latest, sorted desc by date
  const seenUrls = new Set<string>();
  const combined = [...mappedLeaseDocs, ...mappedTenantDocs]
    .filter((doc) => {
      if (!doc.fileUrl) return false;
      if (seenUrls.has(doc.fileUrl)) return false;
      seenUrls.add(doc.fileUrl);
      return true;
    })
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  // Filter based on search query or type selector
  const filteredDocs = combined.filter((doc) => {
    const matchesSearch =
      doc.tenantName.toLowerCase().includes(q.toLowerCase()) ||
      doc.roomNumber.toLowerCase().includes(q.toLowerCase()) ||
      doc.label.toLowerCase().includes(q.toLowerCase());
    
    const matchesType = typeFilter ? doc.type === typeFilter : true;
    
    return matchesSearch && matchesType;
  });

  const docTypes = Array.from(new Set(combined.map((d) => d.type)));

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Documents Repository</h1>
        <p className="text-slate-500 mt-1 text-sm">
          A centralized archive of all lease agreements, notices, statements, and tenant uploads.
        </p>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col sm:flex-row gap-4 bg-white border border-slate-200 p-4 rounded-xl shadow-sm">
        <form className="flex-1 flex gap-2" method="GET" action="/documents">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              name="q"
              defaultValue={q}
              placeholder="Search by tenant, unit, or document label..."
              className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          {typeFilter && <input type="hidden" name="type" value={typeFilter} />}
          <button
            type="submit"
            className="px-4 py-2 bg-slate-950 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
          >
            Search
          </button>
        </form>

        <div className="flex gap-2">
          <Link
            href="/documents"
            className={`px-3 py-2 text-xs font-semibold rounded-lg border transition-colors ${
              !typeFilter
                ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            All
          </Link>
          {docTypes.map((type) => (
            <Link
              key={type}
              href={`/documents?type=${type}${q ? `&q=${q}` : ''}`}
              className={`px-3 py-2 text-xs font-semibold rounded-lg border capitalize transition-colors ${
                typeFilter === type
                  ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              {type === 'LEASE' ? 'Leases' : type === 'BILL' ? 'Statements' : type.toLowerCase().replace('_', ' ')}
            </Link>
          ))}
        </div>
      </div>

      {/* Document List */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        {filteredDocs.length === 0 ? (
          <div className="p-12 text-center space-y-4">
            <div className="inline-flex p-4 bg-slate-50 text-slate-400 rounded-2xl mx-auto border border-dashed border-slate-200">
              <FileText className="h-10 w-10 animate-pulse" />
            </div>
            <h3 className="text-lg font-semibold text-slate-800">No documents found</h3>
            <p className="text-slate-500 text-sm max-w-sm mx-auto">
              No records match your filters. Document files are created during lease signing, billing, or tenant uploads.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-[10px] font-bold text-slate-550 uppercase tracking-wider">
                  <th className="px-6 py-4">Document / File</th>
                  <th className="px-6 py-4">Tenant</th>
                  <th className="px-6 py-4">Room / Space</th>
                  <th className="px-6 py-4">Date Added</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredDocs.map((doc) => (
                  <tr key={doc.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <FileText className="h-5 w-5 text-indigo-500 shrink-0" />
                        <div>
                          <p className="font-bold text-slate-800 text-sm">{doc.label}</p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                              doc.type === 'BILL'
                                ? 'bg-cyan-50 text-cyan-700 border-cyan-150'
                                : doc.type === 'LEASE'
                                ? 'bg-indigo-50 text-indigo-700 border-indigo-150'
                                : 'bg-amber-50 text-amber-700 border-amber-150'
                            }`}>
                              {doc.type === 'BILL' ? 'Billing Statement' : doc.type === 'LEASE' ? 'Lease' : doc.type.replace('_', ' ')}
                            </span>
                            {doc.isUploaded && (
                              <span className="text-[9px] text-slate-400 font-semibold uppercase">Uploaded copy</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-semibold text-slate-700">
                      {doc.tenantId ? (
                        <Link href={`/tenants/${doc.tenantId}`} className="hover:text-indigo-600 hover:underline">
                          {doc.tenantName}
                        </Link>
                      ) : (
                        doc.tenantName
                      )}
                    </td>
                    <td className="px-6 py-4 font-semibold text-slate-600">Room {doc.roomNumber}</td>
                    <td className="px-6 py-4 text-slate-500">
                      {new Date(doc.createdAt).toLocaleDateString('en-US', { dateStyle: 'medium' })}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-3">
                        {doc.fileUrl && (
                          <a
                            href={doc.fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 font-semibold text-indigo-650 hover:underline"
                          >
                            <Eye className="h-3.5 w-3.5" /> View
                          </a>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

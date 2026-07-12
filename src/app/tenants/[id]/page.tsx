import { tenantService } from '@/lib/services/tenant.service';
import { unlinkTenantAction, addTenantAddonAction } from '@/app/actions/tenant.actions';
import { generateLeaseAction, generateNoticeAction } from '@/app/actions/document.actions';
import { TenantDetailTabs } from '@/components/tenant-tabs';
import Link from 'next/link';
import { ArrowLeft, Mail, Phone, Calendar } from 'lucide-react';
import { notFound } from 'next/navigation';
import { db } from '@/lib/db';

export default async function TenantDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { id } = await params;
  const resolvedSearchParams = await searchParams;
  const activeTab = (resolvedSearchParams.tab as string) || 'overview';
  const tenant = await tenantService.getTenant(id);

  if (!tenant) {
    notFound();
  }

  // Fetch bill periods for consumption history charting and historical table
  const billPeriods = tenant.unit
    ? await db.billPeriod.findMany({
        where: { unitId: tenant.unit.id },
        orderBy: [{ year: 'desc' }, { month: 'desc' }],
        take: 24,
      })
    : [];

  // Get last 6 months chronologically ascending for the chart
  const chartPeriods = [...billPeriods].slice(0, 6).reverse();

  // Get active lease for deposit/advance display
  const activeLease = await db.lease.findFirst({
    where: { tenantId: id, status: 'ACTIVE' },
    include: { unit: true, leaseDocuments: true },
  });

  // Financial calculations
  const totalPaid = tenant.ledgers
    .filter((l) => l.type === 'PAYMENT')
    .reduce((sum, l) => sum + l.amount, 0);

  const totalCharged = tenant.ledgers
    .filter((l) => l.type === 'CHARGE')
    .reduce((sum, l) => sum + l.amount, 0);

  const outstandingBalance = Math.max(0, totalCharged - totalPaid);

  // Group uploads and documents
  const systemLeaseDocs = activeLease?.leaseDocuments.map((d: any) => ({
    id: d.id,
    type: 'LEASE',
    fileUrl: d.fileUrl,
    createdAt: d.createdAt,
    label: d.label || 'Lease Agreement',
  })) || [];

  const leaseAgreements = [
    ...systemLeaseDocs,
    ...tenant.documents.filter((d: any) => d.type === 'LEASE' || d.type === 'SIGNED_LEASE')
  ];
  const billDocuments = tenant.documents.filter((d: any) => d.type === 'BILL');
  const notices = tenant.documents.filter((d: any) => d.type.startsWith('NOTICE'));
  const idUploads = tenant.documents.filter((d: any) => d.type === 'ID_VERIFICATION' || d.type === 'GOVERNMENT_ID');

  // Filter add-ons from ledger charges (non-rent, non-utility)
  const addOns = tenant.ledgers.filter(
    (l) =>
      l.type === 'CHARGE' &&
      !l.description.toLowerCase().includes('rent') &&
      !l.description.toLowerCase().includes('water') &&
      !l.description.toLowerCase().includes('electr') &&
      !l.description.toLowerCase().includes('late fee')
  );

  // Create unified monthly ledger trail
  const periodKeys = new Set<string>();
  for (const bp of billPeriods) {
    periodKeys.add(`${bp.year}-${bp.month}`);
  }
  for (const l of tenant.ledgers) {
    const d = new Date(l.date);
    periodKeys.add(`${d.getFullYear()}-${d.getMonth() + 1}`);
  }

  const monthlyLedger = Array.from(periodKeys)
    .map((key) => {
      const [year, month] = key.split('-').map(Number);
      const bp = billPeriods.find((x) => x.year === year && x.month === month);

      const chargesForPeriod = tenant.ledgers.filter((l) => {
        const d = new Date(l.date);
        return l.type === 'CHARGE' && d.getFullYear() === year && (d.getMonth() + 1) === month;
      });
      const totalBilled = chargesForPeriod.reduce((sum, l) => sum + l.amount, 0);

      const paymentsForPeriod = tenant.ledgers.filter((l) => {
        const d = new Date(l.date);
        return l.type === 'PAYMENT' && d.getFullYear() === year && (d.getMonth() + 1) === month;
      });
      const totalPaidForPeriod = paymentsForPeriod.reduce((sum, l) => sum + l.amount, 0);

      const proofPayment = paymentsForPeriod.find((l) => l.receiptUrl);
      const receiptUrl = proofPayment?.receiptUrl || null;

      return {
        year,
        month,
        bp,
        totalBilled,
        totalPaidForPeriod,
        receiptUrl,
      };
    })
    .filter((item) => item.totalBilled > 0 || item.totalPaidForPeriod > 0 || item.bp)
    .sort((a, b) => b.year - a.year || b.month - a.month);

  return (
    <div className="p-8 max-w-6xl space-y-8">
      {/* Back button */}
      <div>
        <Link href="/tenants" className="inline-flex items-center gap-2 text-slate-500 hover:text-slate-900 transition-colors text-sm font-medium">
          <ArrowLeft className="h-4 w-4" />
          Back to Tenants
        </Link>
      </div>

      {/* Profile Header */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="flex items-center gap-4">
          <div className="h-20 w-20 bg-indigo-50 border border-indigo-100 rounded-2xl flex items-center justify-center text-indigo-600 text-3xl font-extrabold shadow-sm">
            {tenant.firstName[0]}
            {tenant.lastName[0]}
          </div>
          <div>
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
              {tenant.firstName} {tenant.lastName}
            </h1>
            <div className="flex flex-wrap gap-2 items-center mt-2 text-xs text-slate-550">
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-slate-100 border border-slate-200 text-slate-600">
                ID: {tenant.id.slice(0, 8)}
              </span>
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${
                  tenant.status === 'ACTIVE'
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                    : 'bg-slate-100 text-slate-500 border border-slate-200'
                }`}
              >
                {tenant.status}
              </span>
              <span className="text-slate-400">•</span>
              <span className="font-semibold text-slate-600 flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" /> Lease Started: {new Date(tenant.leaseStartDate).toLocaleDateString('en-US', { dateStyle: 'medium' })}
              </span>
            </div>
          </div>
        </div>

        {/* Contact Quick Details */}
        <div className="flex flex-col md:flex-row gap-4 w-full md:w-auto border-t md:border-t-0 border-slate-100 pt-4 md:pt-0">
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <Mail className="h-4 w-4 text-indigo-500" />
            <span>{tenant.email}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <Phone className="h-4 w-4 text-indigo-500" />
            <span>{tenant.phone}</span>
          </div>
        </div>
      </div>

      {/* Financial Overview stats row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-1">
          <p className="text-xs font-semibold text-slate-550 uppercase">Total Rent Payments</p>
          <h3 className="text-2xl font-bold text-slate-900">₱{totalPaid.toLocaleString()}</h3>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-1">
          <p className="text-xs font-semibold text-slate-550 uppercase">Outstanding Balance</p>
          <h3 className="text-2xl font-bold text-rose-600">₱{outstandingBalance.toLocaleString()}</h3>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-1">
          <p className="text-xs font-semibold text-slate-550 uppercase">Security Deposit</p>
          <h3 className="text-2xl font-bold text-slate-900">₱{(activeLease?.securityDeposit ?? 0).toLocaleString()}</h3>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-1">
          <p className="text-xs font-semibold text-slate-550 uppercase">Advance Payment</p>
          <h3 className="text-2xl font-bold text-slate-900">₱{(activeLease?.advancePaid ?? 0).toLocaleString()}</h3>
        </div>
      </div>

      {/* Mounting the Tabs Navigation client component */}
      <TenantDetailTabs
        tenant={tenant}
        activeLease={activeLease}
        defaultTab={activeTab}
        billPeriods={billPeriods}
        chartPeriods={chartPeriods}
        monthlyLedger={monthlyLedger}
        addOns={addOns}
        leaseAgreements={leaseAgreements}
        billDocuments={billDocuments}
        notices={notices}
        idUploads={idUploads}
        unlinkTenantAction={unlinkTenantAction}
        addTenantAddonAction={addTenantAddonAction}
        generateLeaseAction={generateLeaseAction}
        generateNoticeAction={generateNoticeAction}
      />
    </div>
  );
}




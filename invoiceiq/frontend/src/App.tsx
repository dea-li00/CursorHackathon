import { useEffect, useMemo, useState } from 'react';
import { QueryClient, QueryClientProvider, useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import FileUpload from './components/FileUpload';
import BillList from './components/BillList';
import BillDetail from './components/BillDetail';
import type { BillSummary, APBill } from './types';
import { uploadFiles, extractInvoices, getBills, getBill, updateBill, approveBill, exportExcel, downloadExport, healthCheck } from './api';
import './App.css';

const queryClient = new QueryClient();

function AppContent() {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedBills, setSelectedBills] = useState<string[]>([]);
  const [selectedBill, setSelectedBill] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');

  const queryClient = useQueryClient();

  // Health check
  const { data: health } = useQuery({
    queryKey: ['health'],
    queryFn: healthCheck,
    refetchInterval: 30000
  });

  // Bills query
  const { data: bills = [], isLoading } = useQuery<BillSummary[]>({
    queryKey: ['bills', statusFilter, searchTerm],
    queryFn: () => getBills(statusFilter || undefined, searchTerm || undefined)
  });

  const healthEngines = health?.engines ?? {};

  useEffect(() => {
    // prune selections for invoices that are no longer in view
    setSelectedBills((current) =>
      current.filter((id) => bills.some((bill) => bill.id === id))
    );
  }, [bills]);

  const dashboardStats = useMemo(() => {
    if (!bills.length) {
      return {
        totalInvoices: 0,
        totalValue: 0,
        pendingReviewValue: 0,
        exportedCount: 0,
        averageConfidence: 0,
        newestInvoiceCreatedAt: undefined as string | undefined
      };
    }

    const totals = bills.reduce(
      (acc, bill) => {
        acc.totalInvoices += 1;
        acc.totalValue += bill.total || 0;
        if (bill.status === 'needs_review') {
          acc.pendingReviewValue += bill.total || 0;
        }
        if (bill.status === 'exported') {
          acc.exportedCount += 1;
        }
        acc.averageConfidence += bill.confidence;
        const createdAt = new Date(bill.created_at).getTime();
        if (!acc.newestInvoiceCreatedAt || createdAt > acc.newestInvoiceCreatedAt) {
          acc.newestInvoiceCreatedAt = createdAt;
        }
        return acc;
      },
      {
        totalInvoices: 0,
        totalValue: 0,
        pendingReviewValue: 0,
        exportedCount: 0,
        averageConfidence: 0,
        newestInvoiceCreatedAt: undefined as number | undefined
      }
    );

    return {
      totalInvoices: totals.totalInvoices,
      totalValue: totals.totalValue,
      pendingReviewValue: totals.pendingReviewValue,
      exportedCount: totals.exportedCount,
      averageConfidence: Math.round((totals.averageConfidence / totals.totalInvoices) * 100),
      newestInvoiceCreatedAt: totals.newestInvoiceCreatedAt
        ? new Date(totals.newestInvoiceCreatedAt).toISOString()
        : undefined
    };
  }, [bills]);

  // Selected bill query
  const { data: billDetail } = useQuery({
    queryKey: ['bill', selectedBill],
    queryFn: () => selectedBill ? getBill(selectedBill) : null,
    enabled: !!selectedBill
  });

  // Upload and extract mutation
  const uploadMutation = useMutation({
    mutationFn: async (files: File[]) => {
      setIsUploading(true);
      try {
        const fileIds = await uploadFiles(files);
        const summaries = await extractInvoices(fileIds);
        return summaries;
      } finally {
        setIsUploading(false);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bills'] });
      setSelectedFiles([]);
    }
  });

  // Update bill mutation
  const updateMutation = useMutation({
    mutationFn: ({ billId, updates }: { billId: string; updates: Partial<APBill> }) =>
      updateBill(billId, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bills'] });
      queryClient.invalidateQueries({ queryKey: ['bill', selectedBill] });
    }
  });

  // Approve bill mutation
  const approveMutation = useMutation({
    mutationFn: approveBill,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bills'] });
      queryClient.invalidateQueries({ queryKey: ['bill', selectedBill] });
    }
  });

  // Export mutation
  const exportMutation = useMutation({
    mutationFn: (billIds: string[]) => exportExcel(billIds),
    onSuccess: async (data) => {
      await downloadExport(data.filename);
    }
  });

  const handleFilesSelected = (files: File[]) => {
    setSelectedFiles(files);
  };

  const handleUpload = () => {
    if (selectedFiles.length > 0) {
      uploadMutation.mutate(selectedFiles);
    }
  };

  const handleBillSelect = (billId: string) => {
    setSelectedBill(billId);
  };

  const handleBillUpdate = (updates: Partial<APBill>) => {
    if (selectedBill) {
      updateMutation.mutate({ billId: selectedBill, updates });
    }
  };

  const handleApprove = (billId: string) => {
    approveMutation.mutate(billId);
  };

  const handleExport = (billIds: string[]) => {
    exportMutation.mutate(billIds);
  };

  const handleCloseDetail = () => {
    setSelectedBill(null);
  };

  return (
    <div className="dashboard">
      <header className="dashboard__hero">
        <div className="dashboard__hero-overlay" />
        <div className="dashboard__hero-inner">
          <div className="dashboard__hero-top">
            <div className="dashboard__brand">
              <div className="dashboard__brand-badge">IQ</div>
              <div>
                <h1>InvoiceIQ Command Center</h1>
                <p>
                  Monitor extraction health, review invoices, and keep finance operations in flow with a unified workspace.
                </p>
              </div>
            </div>

            <div className="dashboard__health card">
              <p className="card__label">System health</p>
              <div className="dashboard__health-status">
                <span className={`status-dot ${health?.status === 'healthy' ? 'status-dot--ok' : 'status-dot--warn'}`} />
                <span>{health?.status === 'healthy' ? 'All services operational' : 'Attention required'}</span>
              </div>
              <div className="dashboard__health-engine">
                {['azure_di', 'openai', 'tesseract'].map((engine) => (
                  <span
                    key={engine}
                    className={`engine-pill ${healthEngines?.[engine] ? 'engine-pill--active' : ''}`}
                  >
                    {engine.replace('_', ' ').toUpperCase()}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="dashboard__stats">
            <div className="stat-card card">
              <p className="card__label">Invoices</p>
              <h2>{dashboardStats.totalInvoices}</h2>
              <span>
                {dashboardStats.newestInvoiceCreatedAt
                  ? `Latest upload ${new Date(dashboardStats.newestInvoiceCreatedAt).toLocaleDateString()}`
                  : 'Awaiting your first upload'}
              </span>
            </div>
            <div className="stat-card card">
              <p className="card__label">Total value</p>
              <h2>{dashboardStats.totalValue.toLocaleString(undefined, { style: 'currency', currency: 'USD' })}</h2>
              <span>Aggregated across the active dataset</span>
            </div>
            <div className="stat-card card">
              <p className="card__label">Needs review</p>
              <h2>{dashboardStats.pendingReviewValue.toLocaleString(undefined, { style: 'currency', currency: 'USD' })}</h2>
              <span>Value awaiting action before approval</span>
            </div>
            <div className="stat-card card">
              <p className="card__label">Confidence</p>
              <h2>{dashboardStats.averageConfidence}%</h2>
              <span>{dashboardStats.exportedCount} invoices exported this cycle</span>
            </div>
          </div>
        </div>
      </header>

      <main className="dashboard__main">
        <div className="dashboard__layout">
          <aside className="dashboard__sidebar">
            <section className="card upload-card">
              <div className="card__header">
                <div>
                  <h3>Upload Center</h3>
                  <p>Drop invoices or click to select multiple files. We will process them automatically.</p>
                </div>
                <span className="chip chip--accent">AI Extraction</span>
              </div>
              <div className="upload-card__dropzone">
                <FileUpload onFilesSelected={handleFilesSelected} isUploading={isUploading} />
              </div>
              {selectedFiles.length > 0 && (
                <div className="upload-card__footer">
                  <span>{selectedFiles.length} file(s) staged</span>
                  <button
                    onClick={handleUpload}
                    disabled={isUploading}
                    className="btn btn--primary"
                  >
                    {isUploading ? 'Processing…' : 'Extract data'}
                  </button>
                </div>
              )}
            </section>

            <section className="card filters-card">
              <div className="card__header">
                <div>
                  <h3>Filters</h3>
                  <p>Drill into specific statuses or vendors.</p>
                </div>
              </div>
              <div className="filters-card__control">
                <label htmlFor="filter-status">Status</label>
                <div className="input-shell">
                  <select
                    id="filter-status"
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                  >
                    <option value="">All</option>
                    <option value="new">New</option>
                    <option value="needs_review">Needs Review</option>
                    <option value="approved">Approved</option>
                    <option value="exported">Exported</option>
                  </select>
                </div>
              </div>

              <div className="filters-card__control">
                <label htmlFor="filter-search">Search</label>
                <div className="input-shell input-shell--icon">
                  <svg
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path d="m21 21-4.35-4.35" />
                    <circle cx="11" cy="11" r="7" />
                  </svg>
                  <input
                    id="filter-search"
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Vendor, invoice #, amount…"
                  />
                </div>
              </div>
            </section>
          </aside>

          <section className="dashboard__content">
            {isLoading ? (
              <div className="loading-state">
                <div className="loading-spinner" />
                <p>Loading invoices...</p>
              </div>
            ) : (
              <BillList
                bills={bills}
                onBillSelect={handleBillSelect}
                onApprove={handleApprove}
                onExport={handleExport}
                selectedBills={selectedBills}
                onSelectionChange={setSelectedBills}
              />
            )}
          </section>
        </div>
      </main>

      {selectedBill && billDetail && (
        <BillDetail bill={billDetail} onUpdate={handleBillUpdate} onClose={handleCloseDetail} />
      )}
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppContent />
    </QueryClientProvider>
  );
}

export default App;

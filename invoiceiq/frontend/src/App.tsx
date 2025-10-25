import { useState } from 'react';
import { QueryClient, QueryClientProvider, useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import FileUpload from './components/FileUpload';
import BillList from './components/BillList';
import BillDetail from './components/BillDetail';
import type { BillSummary, APBill } from './types';
import { uploadFiles, extractInvoices, getBills, getBill, updateBill, approveBill, exportExcel, downloadExport, healthCheck } from './api';

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
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="px-4 py-6 sm:px-0">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">InvoiceIQ</h1>
              <p className="mt-1 text-sm text-gray-600">
                Upload invoices and extract data automatically
              </p>
            </div>
            
            {/* Health Status */}
            <div className="flex items-center space-x-2">
              <div className={`w-3 h-3 rounded-full ${health?.status === 'healthy' ? 'bg-green-500' : 'bg-red-500'}`}></div>
              <span className="text-sm text-gray-600">
                {health?.engines?.azure_di ? 'Azure DI' : ''}
                {health?.engines?.openai ? ' OpenAI' : ''}
                {health?.engines?.tesseract ? ' OCR' : ''}
              </span>
            </div>
          </div>
        </div>

        {/* Upload Section */}
        <div className="px-4 py-6 sm:px-0">
          <div className="space-y-4">
            <FileUpload
              onFilesSelected={handleFilesSelected}
              isUploading={isUploading}
            />
            
            {selectedFiles.length > 0 && (
              <div className="flex justify-between items-center">
                <div className="text-sm text-gray-600">
                  {selectedFiles.length} file(s) selected
                </div>
                <button
                  onClick={handleUpload}
                  disabled={isUploading}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                >
                  {isUploading ? 'Processing...' : 'Extract Data'}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Filters */}
        <div className="px-4 py-6 sm:px-0">
          <div className="flex space-x-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              >
                <option value="">All</option>
                <option value="new">New</option>
                <option value="needs_review">Needs Review</option>
                <option value="approved">Approved</option>
                <option value="exported">Exported</option>
              </select>
            </div>
            
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700">Search</label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by vendor or invoice number..."
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Bills List */}
        <div className="px-4 py-6 sm:px-0">
          {isLoading ? (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <p className="mt-2 text-gray-600">Loading invoices...</p>
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
        </div>

        {/* Bill Detail Modal */}
        {selectedBill && billDetail && (
          <BillDetail
            bill={billDetail}
            onUpdate={handleBillUpdate}
            onClose={handleCloseDetail}
          />
        )}
      </div>
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
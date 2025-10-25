import React from 'react';
import type { BillSummary } from '../types';

interface BillListProps {
  bills: BillSummary[];
  onBillSelect: (billId: string) => void;
  onApprove: (billId: string) => void;
  onExport: (billIds: string[]) => void;
  selectedBills: string[];
  onSelectionChange: (billIds: string[]) => void;
}

const BillList: React.FC<BillListProps> = ({
  bills,
  onBillSelect,
  onApprove,
  onExport,
  selectedBills,
  onSelectionChange
}) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'new':
        return 'bg-gray-100 text-gray-800';
      case 'needs_review':
        return 'bg-yellow-100 text-yellow-800';
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'exported':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.9) return 'text-green-600';
    if (confidence >= 0.75) return 'text-yellow-600';
    return 'text-red-600';
  };

  const handleSelectAll = () => {
    if (selectedBills.length === bills.length) {
      onSelectionChange([]);
    } else {
      onSelectionChange(bills.map(bill => bill.id));
    }
  };

  const handleSelectBill = (billId: string) => {
    if (selectedBills.includes(billId)) {
      onSelectionChange(selectedBills.filter(id => id !== billId));
    } else {
      onSelectionChange([...selectedBills, billId]);
    }
  };

  const handleExport = () => {
    onExport(selectedBills);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-gray-900">Invoices</h2>
        <div className="flex space-x-2">
          <button
            onClick={handleSelectAll}
            className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
          >
            {selectedBills.length === bills.length ? 'Deselect All' : 'Select All'}
          </button>
          {selectedBills.length > 0 && (
            <button
              onClick={handleExport}
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
            >
              Export Selected ({selectedBills.length})
            </button>
          )}
        </div>
      </div>

      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <ul className="divide-y divide-gray-200">
          {bills.map((bill) => (
            <li key={bill.id} className="px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <input
                    type="checkbox"
                    checked={selectedBills.includes(bill.id)}
                    onChange={() => handleSelectBill(bill.id)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => onBillSelect(bill.id)}
                        className="text-sm font-medium text-blue-600 hover:text-blue-500 truncate"
                      >
                        {bill.vendor_name}
                      </button>
                      <span className="text-sm text-gray-500">#{bill.invoice_number}</span>
                    </div>
                    
                    <div className="mt-1 flex items-center space-x-4 text-sm text-gray-500">
                      <span>{new Date(bill.invoice_date).toLocaleDateString()}</span>
                      <span className="font-medium">
                        {bill.currency} {bill.total.toLocaleString()}
                      </span>
                      <span className={`font-medium ${getConfidenceColor(bill.confidence)}`}>
                        {Math.round(bill.confidence * 100)}% confidence
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(bill.status)}`}>
                    {bill.status.replace('_', ' ')}
                  </span>
                  
                  {bill.status === 'needs_review' && (
                    <button
                      onClick={() => onApprove(bill.id)}
                      className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700"
                    >
                      Approve
                    </button>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
        
        {bills.length === 0 && (
          <div className="px-6 py-12 text-center text-gray-500">
            No invoices found. Upload some files to get started.
          </div>
        )}
      </div>
    </div>
  );
};

export default BillList;

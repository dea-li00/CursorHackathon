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
        return 'status-pill--new';
      case 'needs_review':
        return 'status-pill--review';
      case 'approved':
        return 'status-pill--approved';
      case 'exported':
        return 'status-pill--exported';
      default:
        return 'status-pill--new';
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.9) return 'confidence--high';
    if (confidence >= 0.75) return 'confidence--medium';
    return 'confidence--low';
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

  const formatCurrency = (amount: number, currency: string) => {
    try {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency,
        minimumFractionDigits: 2
      }).format(amount);
    } catch {
      return `${currency} ${amount.toLocaleString()}`;
    }
  };

  const getInitials = (vendorName: string) => {
    const parts = vendorName.trim().split(/\s+/);
    if (parts.length === 1) {
      return parts[0]?.charAt(0).toUpperCase() ?? '?';
    }
    return `${parts[0]?.charAt(0) ?? ''}${parts[1]?.charAt(0) ?? ''}`.toUpperCase();
  };

  return (
    <div className="bill-list">
      <div className="bill-list__header">
        <div className="bill-list__header-copy">
          <h2>Invoice Stream</h2>
          <p>
            {selectedBills.length > 0
              ? `${selectedBills.length} selected of ${bills.length}`
              : `${bills.length} invoices ready for review`}
          </p>
        </div>
        <div className="bill-list__actions">
          <button
            onClick={handleSelectAll}
            type="button"
            className="btn btn--ghost"
          >
            {selectedBills.length === bills.length && bills.length > 0 ? 'Deselect All' : 'Select All'}
          </button>
          {selectedBills.length > 0 && (
            <button
              onClick={handleExport}
              type="button"
              className="btn btn--success"
            >
              Export Selected ({selectedBills.length})
            </button>
          )}
        </div>
      </div>

      <div className="bill-list__table">
        <div className="bill-list__head">
          <span>Select</span>
          <span>Vendor</span>
          <span>Invoice</span>
          <span>Issued</span>
          <span>Total</span>
          <span className="text-right">Status</span>
        </div>

        <ul>
          {bills.map((bill) => {
            const isSelected = selectedBills.includes(bill.id);
            return (
              <li
                key={bill.id}
                className={`bill-list__row ${isSelected ? 'bill-list__row--selected' : ''}`}
              >
                <div className="bill-list__cell bill-list__cell--checkbox">
                  <label className="checkbox">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => handleSelectBill(bill.id)}
                    />
                    <span />
                  </label>
                </div>

                <div className="bill-list__cell bill-list__cell--vendor">
                  <div className="avatar">{getInitials(bill.vendor_name)}</div>
                  <div>
                    <button
                      onClick={() => onBillSelect(bill.id)}
                      type="button"
                      className="link"
                    >
                      {bill.vendor_name}
                    </button>
                    <div className="bill-list__meta">
                      <span className="badge">{bill.engine}</span>
                      <span className={`confidence ${getConfidenceColor(bill.confidence)}`}>
                        {Math.round(bill.confidence * 100)}% confidence
                      </span>
                    </div>
                  </div>
                </div>

                <div className="bill-list__cell">
                  <p className="bill-list__primary">#{bill.invoice_number}</p>
                  <p className="bill-list__secondary">Created {new Date(bill.created_at).toLocaleDateString()}</p>
                </div>

                <div className="bill-list__cell">
                  <p className="bill-list__primary">{new Date(bill.invoice_date).toLocaleDateString()}</p>
                  <p className="bill-list__secondary">Invoice date</p>
                </div>

                <div className="bill-list__cell">
                  <p className="bill-list__primary">{formatCurrency(bill.total, bill.currency)}</p>
                  <p className="bill-list__secondary">{bill.currency} total</p>
                </div>

                <div className="bill-list__cell bill-list__cell--status">
                  <span className={`status-pill ${getStatusColor(bill.status)}`}>
                    {bill.status.replace('_', ' ')}
                  </span>
                  {bill.status === 'needs_review' && (
                    <button
                      onClick={() => onApprove(bill.id)}
                      type="button"
                      className="btn btn--outline"
                    >
                      Approve
                    </button>
                  )}
                </div>
              </li>
            );
          })}

          {bills.length === 0 && (
            <li className="bill-list__empty">
              <div className="bill-list__empty-icon">+</div>
              <p className="bill-list__empty-title">No invoices yet</p>
              <p className="bill-list__empty-subtitle">Upload PDFs or images to kick off automated extraction.</p>
            </li>
          )}
        </ul>
      </div>
    </div>
  );
};

export default BillList;

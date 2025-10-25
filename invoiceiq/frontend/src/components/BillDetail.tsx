import React, { useMemo, useState } from 'react';
import type { APBill, APBillLine } from '../types';

interface BillDetailProps {
  bill: APBill;
  onUpdate: (updates: Partial<APBill>) => void;
  onClose: () => void;
}

const BillDetail: React.FC<BillDetailProps> = ({ bill, onUpdate, onClose }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<Partial<APBill>>(bill);

  const extractionConfidence = useMemo(() => {
    const scores = Object.values(bill.extraction_meta.confidence_scores ?? {});
    if (!scores.length) {
      return 0;
    }

    return Math.round((scores.reduce((acc, value) => acc + value, 0) / scores.length) * 100);
  }, [bill]);

  const fieldClasses = 'input';
  const tableFieldClasses = 'input input--dense';

  const handleSave = () => {
    onUpdate(formData);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setFormData(bill);
    setIsEditing(false);
  };

  const updateField = (field: keyof APBill, value: unknown) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const updateLineItem = (index: number, field: keyof APBillLine, value: unknown) => {
    const newLines = [...(formData.lines || bill.lines)];
    newLines[index] = { ...newLines[index], [field]: value };
    updateField('lines', newLines);
  };

  const addLineItem = () => {
    const newLine: APBillLine = {
      description: '',
      amount: 0,
      quantity: undefined,
      unit_price: undefined,
      sku: undefined,
      cost_center: undefined,
      gl_account: undefined,
      tax_code: undefined
    };
    updateField('lines', [...(formData.lines || bill.lines), newLine]);
  };

  const removeLineItem = (index: number) => {
    const newLines = (formData.lines || bill.lines).filter((_, i) => i !== index);
    updateField('lines', newLines);
  };

  const currentData = isEditing ? formData : bill;

  return (
    <div className="bill-detail">
      <div className="bill-detail__backdrop" onClick={onClose} />
      <aside className="bill-detail__panel">
        <header className="bill-detail__header">
          <div>
            <span className="bill-detail__subtitle">Invoice #{bill.invoice_number}</span>
            <h2>{bill.vendor_name}</h2>
            <div className="bill-detail__tags">
              <span className="chip chip--muted">{bill.workflow.status.replace('_', ' ')}</span>
              <span className="chip chip--muted">{extractionConfidence}% confidence</span>
              <span className="chip chip--muted">Created {new Date(bill.created_at).toLocaleDateString()}</span>
            </div>
          </div>
          <div className="bill-detail__actions">
            {!isEditing ? (
              <>
                <button type="button" onClick={() => setIsEditing(true)} className="btn btn--primary">
                  Edit
                </button>
                <button type="button" onClick={onClose} className="btn btn--ghost">
                  Close
                </button>
              </>
            ) : (
              <>
                <button type="button" onClick={handleSave} className="btn btn--success">
                  Save
                </button>
                <button type="button" onClick={handleCancel} className="btn btn--ghost">
                  Cancel
                </button>
              </>
            )}
          </div>
        </header>

        <div className="bill-detail__content">
          <section className="bill-detail__section">
            <h3>Vendor &amp; Invoice</h3>
            <div className="bill-detail__grid">
              <div className="form-field">
                <label>Vendor name</label>
                <input
                  type="text"
                  value={currentData.vendor_name || ''}
                  onChange={(e) => updateField('vendor_name', e.target.value)}
                  disabled={!isEditing}
                  className={fieldClasses}
                />
              </div>
              <div className="form-field">
                <label>Invoice number</label>
                <input
                  type="text"
                  value={currentData.invoice_number || ''}
                  onChange={(e) => updateField('invoice_number', e.target.value)}
                  disabled={!isEditing}
                  className={fieldClasses}
                />
              </div>
              <div className="form-field">
                <label>Invoice date</label>
                <input
                  type="date"
                  value={currentData.invoice_date || ''}
                  onChange={(e) => updateField('invoice_date', e.target.value)}
                  disabled={!isEditing}
                  className={fieldClasses}
                />
              </div>
              <div className="form-field">
                <label>Due date</label>
                <input
                  type="date"
                  value={currentData.due_date || ''}
                  onChange={(e) => updateField('due_date', e.target.value)}
                  disabled={!isEditing}
                  className={fieldClasses}
                />
              </div>
              <div className="form-field">
                <label>Currency</label>
                <select
                  value={currentData.currency || 'USD'}
                  onChange={(e) => updateField('currency', e.target.value)}
                  disabled={!isEditing}
                  className={fieldClasses}
                >
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                  <option value="GBP">GBP</option>
                  <option value="JPY">JPY</option>
                </select>
              </div>
              <div className="form-field">
                <label>PO number</label>
                <input
                  type="text"
                  value={currentData.po_number || ''}
                  onChange={(e) => updateField('po_number', e.target.value)}
                  disabled={!isEditing}
                  className={fieldClasses}
                />
              </div>
            </div>
          </section>

          <section className="bill-detail__section">
            <h3>Financials</h3>
            <div className="bill-detail__grid bill-detail__grid--three">
              <div className="form-field">
                <label>Subtotal</label>
                <input
                  type="number"
                  step="0.01"
                  value={currentData.subtotal || 0}
                  onChange={(e) => updateField('subtotal', parseFloat(e.target.value) || 0)}
                  disabled={!isEditing}
                  className={fieldClasses}
                />
              </div>
              <div className="form-field">
                <label>Tax</label>
                <input
                  type="number"
                  step="0.01"
                  value={currentData.tax || 0}
                  onChange={(e) => updateField('tax', parseFloat(e.target.value) || 0)}
                  disabled={!isEditing}
                  className={fieldClasses}
                />
              </div>
              <div className="form-field">
                <label>Total</label>
                <input
                  type="number"
                  step="0.01"
                  value={currentData.total || 0}
                  onChange={(e) => updateField('total', parseFloat(e.target.value) || 0)}
                  disabled={!isEditing}
                  className={fieldClasses}
                />
              </div>
            </div>
          </section>

          <section className="bill-detail__section">
            <div className="bill-detail__section-header">
              <h3>Line items</h3>
              {isEditing && (
                <button type="button" onClick={addLineItem} className="btn btn--outline">
                  Add item
                </button>
              )}
            </div>
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Description</th>
                    <th>Qty</th>
                    <th>Unit price</th>
                    <th>Amount</th>
                    {isEditing && <th>Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {(currentData.lines || []).map((line, index) => (
                    <tr key={index}>
                      <td>
                        <input
                          type="text"
                          value={line.description}
                          onChange={(e) => updateLineItem(index, 'description', e.target.value)}
                          disabled={!isEditing}
                          className={tableFieldClasses}
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          step="0.01"
                          value={line.quantity ?? ''}
                          onChange={(e) =>
                            updateLineItem(index, 'quantity', parseFloat(e.target.value) || undefined)
                          }
                          disabled={!isEditing}
                          className={tableFieldClasses}
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          step="0.01"
                          value={line.unit_price ?? ''}
                          onChange={(e) =>
                            updateLineItem(index, 'unit_price', parseFloat(e.target.value) || undefined)
                          }
                          disabled={!isEditing}
                          className={tableFieldClasses}
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          step="0.01"
                          value={line.amount}
                          onChange={(e) =>
                            updateLineItem(index, 'amount', parseFloat(e.target.value) || 0)
                          }
                          disabled={!isEditing}
                          className={tableFieldClasses}
                        />
                      </td>
                      {isEditing && (
                        <td>
                          <button type="button" onClick={() => removeLineItem(index)} className="btn btn--text">
                            Remove
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {(bill.validation.errors.length > 0 || bill.validation.warnings.length > 0) && (
            <section className="bill-detail__section bill-detail__section--grid">
              {bill.validation.errors.length > 0 && (
                <div className="alert alert--error">
                  <h4>Validation errors</h4>
                  <ul>
                    {bill.validation.errors.map((error, index) => (
                      <li key={index}>{error}</li>
                    ))}
                  </ul>
                </div>
              )}
              {bill.validation.warnings.length > 0 && (
                <div className="alert alert--warning">
                  <h4>Warnings</h4>
                  <ul>
                    {bill.validation.warnings.map((warning, index) => (
                      <li key={index}>{warning}</li>
                    ))}
                  </ul>
                </div>
              )}
            </section>
          )}

          <section className="bill-detail__section">
            <h3>Extraction insights</h3>
            <div className="insights-grid">
              <div className="insight">
                <p>Engine</p>
                <strong>{bill.extraction_meta.engine}</strong>
                <span>v{bill.extraction_meta.version}</span>
              </div>
              <div className="insight">
                <p>Processing time</p>
                <strong>{bill.extraction_meta.processing_time}s</strong>
                <span>{bill.extraction_meta.pages_processed} page(s) processed</span>
              </div>
            </div>
          </section>
        </div>
      </aside>
    </div>
  );
};

export default BillDetail;

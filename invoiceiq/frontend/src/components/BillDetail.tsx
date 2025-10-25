import React, { useState } from 'react';
import type { APBill, APBillLine } from '../types';

interface BillDetailProps {
  bill: APBill;
  onUpdate: (updates: Partial<APBill>) => void;
  onClose: () => void;
}

const BillDetail: React.FC<BillDetailProps> = ({ bill, onUpdate, onClose }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<Partial<APBill>>(bill);


  const handleSave = () => {
    onUpdate(formData);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setFormData(bill);
    setIsEditing(false);
  };

  const updateField = (field: keyof APBill, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const updateLineItem = (index: number, field: keyof APBillLine, value: any) => {
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
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-4xl shadow-lg rounded-md bg-white">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium text-gray-900">Invoice Details</h3>
          <div className="flex space-x-2">
            {!isEditing ? (
              <>
                <button
                  onClick={() => setIsEditing(true)}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Edit
                </button>
                <button
                  onClick={onClose}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
                >
                  Close
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={handleSave}
                  className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                >
                  Save
                </button>
                <button
                  onClick={handleCancel}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
                >
                  Cancel
                </button>
              </>
            )}
          </div>
        </div>

        <div className="space-y-6">
          {/* Header Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Vendor Name</label>
              <input
                type="text"
                value={currentData.vendor_name || ''}
                onChange={(e) => updateField('vendor_name', e.target.value)}
                disabled={!isEditing}
                className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 ${
                  !isEditing ? 'bg-gray-50' : ''
                }`}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Invoice Number</label>
              <input
                type="text"
                value={currentData.invoice_number || ''}
                onChange={(e) => updateField('invoice_number', e.target.value)}
                disabled={!isEditing}
                className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 ${
                  !isEditing ? 'bg-gray-50' : ''
                }`}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Invoice Date</label>
              <input
                type="date"
                value={currentData.invoice_date || ''}
                onChange={(e) => updateField('invoice_date', e.target.value)}
                disabled={!isEditing}
                className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 ${
                  !isEditing ? 'bg-gray-50' : ''
                }`}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Due Date</label>
              <input
                type="date"
                value={currentData.due_date || ''}
                onChange={(e) => updateField('due_date', e.target.value)}
                disabled={!isEditing}
                className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 ${
                  !isEditing ? 'bg-gray-50' : ''
                }`}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Currency</label>
              <select
                value={currentData.currency || 'USD'}
                onChange={(e) => updateField('currency', e.target.value)}
                disabled={!isEditing}
                className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 ${
                  !isEditing ? 'bg-gray-50' : ''
                }`}
              >
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
                <option value="GBP">GBP</option>
                <option value="JPY">JPY</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">PO Number</label>
              <input
                type="text"
                value={currentData.po_number || ''}
                onChange={(e) => updateField('po_number', e.target.value)}
                disabled={!isEditing}
                className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 ${
                  !isEditing ? 'bg-gray-50' : ''
                }`}
              />
            </div>
          </div>

          {/* Financial Information */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Subtotal</label>
              <input
                type="number"
                step="0.01"
                value={currentData.subtotal || 0}
                onChange={(e) => updateField('subtotal', parseFloat(e.target.value) || 0)}
                disabled={!isEditing}
                className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 ${
                  !isEditing ? 'bg-gray-50' : ''
                }`}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Tax</label>
              <input
                type="number"
                step="0.01"
                value={currentData.tax || 0}
                onChange={(e) => updateField('tax', parseFloat(e.target.value) || 0)}
                disabled={!isEditing}
                className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 ${
                  !isEditing ? 'bg-gray-50' : ''
                }`}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Total</label>
              <input
                type="number"
                step="0.01"
                value={currentData.total || 0}
                onChange={(e) => updateField('total', parseFloat(e.target.value) || 0)}
                disabled={!isEditing}
                className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 ${
                  !isEditing ? 'bg-gray-50' : ''
                }`}
              />
            </div>
          </div>

          {/* Line Items */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <h4 className="text-md font-medium text-gray-900">Line Items</h4>
              {isEditing && (
                <button
                  onClick={addLineItem}
                  className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Add Item
                </button>
              )}
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Description
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Qty
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Unit Price
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Amount
                    </th>
                    {isEditing && (
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {(currentData.lines || []).map((line, index) => (
                    <tr key={index}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <input
                          type="text"
                          value={line.description}
                          onChange={(e) => updateLineItem(index, 'description', e.target.value)}
                          disabled={!isEditing}
                          className={`w-full border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500 ${
                            !isEditing ? 'bg-gray-50' : ''
                          }`}
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <input
                          type="number"
                          step="0.01"
                          value={line.quantity || ''}
                          onChange={(e) => updateLineItem(index, 'quantity', parseFloat(e.target.value) || undefined)}
                          disabled={!isEditing}
                          className={`w-full border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500 ${
                            !isEditing ? 'bg-gray-50' : ''
                          }`}
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <input
                          type="number"
                          step="0.01"
                          value={line.unit_price || ''}
                          onChange={(e) => updateLineItem(index, 'unit_price', parseFloat(e.target.value) || undefined)}
                          disabled={!isEditing}
                          className={`w-full border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500 ${
                            !isEditing ? 'bg-gray-50' : ''
                          }`}
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <input
                          type="number"
                          step="0.01"
                          value={line.amount}
                          onChange={(e) => updateLineItem(index, 'amount', parseFloat(e.target.value) || 0)}
                          disabled={!isEditing}
                          className={`w-full border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500 ${
                            !isEditing ? 'bg-gray-50' : ''
                          }`}
                        />
                      </td>
                      {isEditing && (
                        <td className="px-6 py-4 whitespace-nowrap">
                          <button
                            onClick={() => removeLineItem(index)}
                            className="text-red-600 hover:text-red-900"
                          >
                            Remove
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Validation Messages */}
          {bill.validation.errors.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-md p-4">
              <h4 className="text-sm font-medium text-red-800 mb-2">Errors</h4>
              <ul className="text-sm text-red-700 list-disc list-inside">
                {bill.validation.errors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            </div>
          )}

          {bill.validation.warnings.length > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
              <h4 className="text-sm font-medium text-yellow-800 mb-2">Warnings</h4>
              <ul className="text-sm text-yellow-700 list-disc list-inside">
                {bill.validation.warnings.map((warning, index) => (
                  <li key={index}>{warning}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Extraction Metadata */}
          <div className="bg-gray-50 rounded-md p-4">
            <h4 className="text-sm font-medium text-gray-900 mb-2">Extraction Details</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium">Engine:</span> {bill.extraction_meta.engine}
              </div>
              <div>
                <span className="font-medium">Confidence:</span> {Math.round(
                  Object.values(bill.extraction_meta.confidence_scores).reduce((a, b) => a + b, 0) / 
                  Object.keys(bill.extraction_meta.confidence_scores).length * 100
                )}%
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BillDetail;

import React, { useState, useEffect } from 'react';
import { InventoryItem } from '../types';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { AlertTriangle, CheckCircle2, ShieldAlert, X, History, Save } from 'lucide-react';

interface StockEditModalProps {
  item: InventoryItem | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const StockEditModal: React.FC<StockEditModalProps> = ({
  item,
  isOpen,
  onClose,
  onSuccess
}) => {
  const { user, role } = useAuth();
  const [newStock, setNewStock] = useState<number>(0);
  const [reason, setReason] = useState<string>('');
  const [isOverride, setIsOverride] = useState<boolean>(false);
  const [warningMessage, setWarningMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState<boolean>(false);

  useEffect(() => {
    if (item) {
      setNewStock(item.current_stock);
      setReason('');
      setIsOverride(false);
      setWarningMessage(null);
      setErrorMessage(null);
    }
  }, [item, isOpen]);

  if (!isOpen || !item) return null;

  const oldStock = item.current_stock;
  const stockDiff = Math.abs(newStock - oldStock);
  const isLargeChange = stockDiff >= 500 || (oldStock > 10 && (stockDiff / oldStock) >= 1.0);
  const isNegative = newStock < 0;

  const handleStockChange = (val: number) => {
    setNewStock(val);
    setErrorMessage(null);
    setWarningMessage(null);
  };

  const handleSave = async () => {
    if (isNegative) {
      setErrorMessage(`Validation Rejected: Stock cannot be negative (${newStock}).`);
      return;
    }

    if (!reason.trim()) {
      setErrorMessage('A documented operational reason is mandatory for manual stock changes.');
      return;
    }

    setSaving(true);
    setErrorMessage(null);

    try {
      const res = await api.updateStock(item.id, newStock, reason, isOverride);

      if (res?.status === 'WARNING' && !isOverride) {
        setWarningMessage(res.message || 'Large stock change detected. Please confirm verification override.');
        setSaving(false);
        return;
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      const detail = err.response?.data?.detail;
      setErrorMessage(typeof detail === 'string' ? detail : 'Validation error occurred while updating stock.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-3xl max-w-xl w-full border border-[#D9E8E3] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-5 bg-[#004D3A] text-white flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-[#006B4F] border border-white/20 flex items-center justify-center shadow-md">
              <History className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-wide">Operational Stock Reconciliation</h2>
              <p className="text-xs text-[#D9E8E3]/80">Manual entry validation & immutable audit recording</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-4">
          {/* Drug & Ward Card */}
          <div className="bg-[#F3FAF7] border border-[#D9E8E3] rounded-2xl p-4">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#006B4F] bg-[#006B4F]/10 px-2 py-0.5 rounded-full">
                  {item.category}
                </span>
                <h3 className="text-sm font-bold text-[#12332C] mt-1.5">{item.medicine_name}</h3>
                <p className="text-xs text-[#647772]">{item.generic_name} • Code: {item.medicine_code}</p>
              </div>
              <div className="text-right">
                <span className="text-xs font-semibold text-[#12332C]">{item.ward_name}</span>
                <p className="text-[11px] text-[#647772]">{item.department_name}</p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-[#D9E8E3] text-center">
              <div className="bg-white p-2 rounded-xl border border-[#D9E8E3]">
                <div className="text-[10px] text-[#647772] uppercase font-bold">Current Stock</div>
                <div className="text-sm font-extrabold text-[#12332C]">{item.current_stock} {item.unit}</div>
              </div>
              <div className="bg-white p-2 rounded-xl border border-[#D9E8E3]">
                <div className="text-[10px] text-[#647772] uppercase font-bold">Safety Stock</div>
                <div className="text-sm font-extrabold text-[#006B4F]">{item.safety_stock} {item.unit}</div>
              </div>
              <div className="bg-white p-2 rounded-xl border border-[#D9E8E3]">
                <div className="text-[10px] text-[#647772] uppercase font-bold">Reorder Point</div>
                <div className="text-sm font-extrabold text-[#008F83]">{item.reorder_point || 50} {item.unit}</div>
              </div>
            </div>
          </div>

          {/* Validation Errors Banner */}
          {errorMessage && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl flex items-start space-x-2.5 text-xs text-rose-800">
              <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <strong>Data Governance Rejection:</strong>
                <p className="mt-0.5">{errorMessage}</p>
              </div>
            </div>
          )}

          {/* Large Stock Fluctuation Warning */}
          {(isLargeChange || warningMessage) && (
            <div className="p-3.5 bg-amber-50 border border-amber-300 rounded-2xl space-y-2 text-xs text-amber-900">
              <div className="flex items-start space-x-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <strong>Abnormal Stock Fluctuation Detected</strong>
                  <p className="mt-0.5">
                    {warningMessage || `Adjusting from ${oldStock} to ${newStock} represents a change of Δ ${stockDiff} units (${((stockDiff / Math.max(oldStock, 1)) * 100).toFixed(0)}%). Please verify the physical inventory count.`}
                  </p>
                </div>
              </div>

              <label className="flex items-center space-x-2 pt-1 font-semibold text-amber-950 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isOverride}
                  onChange={(e) => setIsOverride(e.target.checked)}
                  className="rounded text-[#006B4F] focus:ring-[#006B4F] w-4 h-4"
                />
                <span>I confirm physical count verification for this large stock change</span>
              </label>
            </div>
          )}

          {/* Stock Input Form */}
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-[#12332C] mb-1">
                New Verified Stock Quantity ({item.unit}) <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                value={newStock}
                onChange={(e) => handleStockChange(parseInt(e.target.value) || 0)}
                className={`w-full px-3.5 py-2.5 rounded-2xl text-sm border focus:outline-none transition-all ${
                  isNegative
                    ? 'border-rose-500 bg-rose-50/50 text-rose-900'
                    : 'border-[#D9E8E3] bg-[#F3FAF7] text-[#12332C] focus:border-[#006B4F] focus:ring-1 focus:ring-[#006B4F]'
                }`}
                placeholder="Enter verified physical count"
              />
              {isNegative && (
                <p className="text-[11px] text-rose-600 mt-1 font-semibold">
                  Negative inventory values violate clinical data integrity rules.
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-[#12332C] mb-1">
                Clinical Reason & Audit Justification <span className="text-rose-500">*</span>
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
                className="w-full px-3.5 py-2 rounded-2xl text-xs border border-[#D9E8E3] bg-[#F3FAF7] text-[#12332C] focus:outline-none focus:border-[#006B4F] focus:ring-1 focus:ring-[#006B4F]"
                placeholder="e.g. Physical inventory count reconciliation, Ward stock discrepancy correction, Inbound emergency replenishment"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-[#F3FAF7] border-t border-[#D9E8E3] flex items-center justify-between">
          <div className="text-[11px] text-[#647772]">
            Actor: <strong>{user?.display_name || 'Data Manager'}</strong> ({role})
          </div>
          <div className="flex space-x-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-full border border-[#D9E8E3] text-xs font-medium text-[#12332C] hover:bg-white transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving || isNegative || (isLargeChange && !isOverride)}
              className={`px-5 py-2 rounded-full text-xs font-bold shadow-sm flex items-center space-x-1.5 transition-all ${
                saving || isNegative || (isLargeChange && !isOverride)
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-[#006B4F] hover:bg-[#004D3A] text-white active:scale-95'
              }`}
            >
              <Save className="w-3.5 h-3.5" />
              <span>{saving ? 'Validating...' : 'Commit Validated Stock'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

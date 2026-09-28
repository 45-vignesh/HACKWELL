import React, { useState, useEffect } from 'react';
import {
  Receipt,
  Plus,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Search,
  ShoppingCart,
  User,
  Building2,
  Layers,
  ArrowRight,
  ShieldCheck,
  Clock,
  Check,
  X
} from 'lucide-react';
import { InventoryItem, Bill, BillCreatePayload } from '../types';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';

interface BillingPageProps {
  onRefreshData?: () => void;
}

interface CartItem {
  medicine_id: number;
  medicine_name: string;
  medicine_code: string;
  category: string;
  unit_price: number;
  available_stock: number;
  quantity: number;
}

export const BillingPage: React.FC<BillingPageProps> = ({ onRefreshData }) => {
  const { user, role } = useAuth();

  // State
  const [inventoryList, setInventoryList] = useState<InventoryItem[]>([]);
  const [recentBills, setRecentBills] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [cancellingId, setCancellingId] = useState<number | null>(null);

  // Cart & Form State
  const [selectedWardId, setSelectedWardId] = useState<number>(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMedId, setSelectedMedId] = useState<number | ''>('');
  const [inputQty, setInputQty] = useState<number>(1);
  const [patientName, setPatientName] = useState('');
  const [notes, setNotes] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);

  // Feedback & Modal State
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [lastCompletedBill, setLastCompletedBill] = useState<Bill | null>(null);
  const [cancelTargetBill, setCancelTargetBill] = useState<Bill | null>(null);

  // Fetch Inventory and Recent Bills
  const loadData = async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const [invData, billsData] = await Promise.all([
        api.getInventory(),
        api.getBills()
      ]);
      setInventoryList(invData);
      setRecentBills(billsData);
    } catch (err: any) {
      console.error('Failed to load billing data:', err);
      setErrorMessage(err.response?.data?.detail || 'Failed to load inventory for billing.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filter medicines by selected ward and search query
  const availableInventory = inventoryList.filter((item) => {
    const matchesWard = item.ward_id === selectedWardId;
    const matchesSearch =
      searchQuery === '' ||
      item.medicine_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.medicine_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.generic_name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesWard && matchesSearch;
  });

  // Selected medicine details for current selection
  const currentSelectedMed = inventoryList.find(
    (item) => item.ward_id === selectedWardId && item.medicine_id === Number(selectedMedId)
  );

  // Cart calculation
  const subtotal = cart.reduce((sum, item) => sum + item.unit_price * item.quantity, 0);
  const totalUnits = cart.reduce((sum, item) => sum + item.quantity, 0);

  // Add item to cart
  const handleAddToCart = () => {
    setErrorMessage(null);
    if (!currentSelectedMed) {
      setErrorMessage('Please select a valid medicine from available stock.');
      return;
    }

    if (inputQty <= 0) {
      setErrorMessage('Quantity must be greater than 0.');
      return;
    }

    // Check existing cart quantity for this medicine
    const existingIndex = cart.findIndex((i) => i.medicine_id === currentSelectedMed.medicine_id);
    const existingQty = existingIndex >= 0 ? cart[existingIndex].quantity : 0;
    const requestedTotal = existingQty + inputQty;

    if (requestedTotal > currentSelectedMed.current_stock) {
      setErrorMessage(
        `Insufficient stock for ${currentSelectedMed.medicine_name}. Available: ${currentSelectedMed.current_stock}, Requested: ${requestedTotal}`
      );
      return;
    }

    if (existingIndex >= 0) {
      const updated = [...cart];
      updated[existingIndex].quantity += inputQty;
      setCart(updated);
    } else {
      setCart([
        ...cart,
        {
          medicine_id: currentSelectedMed.medicine_id,
          medicine_name: currentSelectedMed.medicine_name,
          medicine_code: currentSelectedMed.medicine_code,
          category: currentSelectedMed.category,
          unit_price: currentSelectedMed.unit_cost || 10.0,
          available_stock: currentSelectedMed.current_stock,
          quantity: inputQty
        }
      ]);
    }

    setSelectedMedId('');
    setInputQty(1);
    setSearchQuery('');
  };

  // Remove item from cart
  const handleRemoveItem = (medId: number) => {
    setCart(cart.filter((item) => item.medicine_id !== medId));
  };

  // Clear cart
  const handleClearCart = () => {
    setCart([]);
    setPatientName('');
    setNotes('');
    setErrorMessage(null);
  };

  // Submit Bill
  const handleConfirmBill = async () => {
    if (cart.length === 0) return;
    setSubmitting(true);
    setErrorMessage(null);
    setShowConfirmModal(false);

    try {
      const payload: BillCreatePayload = {
        ward_id: selectedWardId,
        patient_name: patientName.trim() || undefined,
        notes: notes.trim() || undefined,
        items: cart.map((c) => ({
          medicine_id: c.medicine_id,
          quantity: c.quantity
        }))
      };

      const completed = await api.createBill(payload);
      setLastCompletedBill(completed);
      handleClearCart();

      // Refresh inventory and bills
      await loadData();
      if (onRefreshData) {
        onRefreshData();
      }
    } catch (err: any) {
      console.error('Bill creation failed:', err);
      setErrorMessage(
        err.response?.data?.detail || 'Billing transaction failed. Inventory remained unchanged.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  // Cancel & Reverse Bill
  const handleExecuteCancel = async () => {
    if (!cancelTargetBill) return;
    setCancellingId(cancelTargetBill.id);
    setErrorMessage(null);

    try {
      await api.cancelBill(cancelTargetBill.id);
      setCancelTargetBill(null);
      await loadData();
      if (onRefreshData) {
        onRefreshData();
      }
    } catch (err: any) {
      console.error('Cancellation failed:', err);
      setErrorMessage(err.response?.data?.detail || 'Failed to cancel bill.');
    } finally {
      setCancellingId(null);
    }
  };

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto text-[#12332C]">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-[#006B4F]/15 border border-[#006B4F]/30 flex items-center justify-center text-[#006B4F] shadow-sm">
              <Receipt className="w-5 h-5 text-[#006B4F]" />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-bold tracking-tight text-[#12332C]">
                Pharmacy Billing
              </h1>
              <p className="text-xs text-[#12332C]/70">
                Dispense medicines & record consumption with atomic real-time inventory deduction
              </p>
            </div>
          </div>
        </div>

        {/* Status Badge & Ward Selector */}
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2 bg-white/80 border border-[#D9E8E3] rounded-2xl px-3 py-1.5 shadow-xs">
            <Building2 className="w-4 h-4 text-[#006B4F]" />
            <span className="text-xs font-semibold text-[#12332C]/80">Ward:</span>
            <select
              value={selectedWardId}
              onChange={(e) => {
                setSelectedWardId(Number(e.target.value));
                setCart([]);
                setSelectedMedId('');
              }}
              className="text-xs font-bold text-[#006B4F] bg-transparent outline-none cursor-pointer"
            >
              {Array.from(new Map(inventoryList.map((i) => [i.ward_id, i.ward_name || `Ward ${i.ward_id}`])).entries()).map(([id, name]) => (
                <option key={id} value={id}>
                  Ward {id} ({name})
                </option>
              ))}
            </select>

          </div>

          <div className="bg-[#006B4F]/10 border border-[#006B4F]/30 rounded-2xl px-3 py-1.5 flex items-center space-x-2">
            <ShieldCheck className="w-4 h-4 text-[#006B4F]" />
            <span className="text-xs font-semibold text-[#006B4F]">FEFO Protocol Active</span>
          </div>
        </div>
      </div>

      {/* Jury-Friendly Explanation Banner */}
      <div className="bg-gradient-to-r from-[#006B4F]/10 to-[#008F83]/10 border border-[#006B4F]/25 rounded-2xl p-3.5 flex items-start space-x-3 shadow-xs">
        <ShieldCheck className="w-5 h-5 text-[#006B4F] shrink-0 mt-0.5" />
        <p className="text-xs leading-relaxed text-[#12332C]/85">
          <span className="font-semibold text-[#006B4F]">Real Operational Consumption: </span>
          Billing represents a real medicine dispensing/consumption event. Once a bill is successfully completed,
          the backend atomically reduces the corresponding operational inventory using <strong>FEFO (First-Expired, First-Out)</strong>.
          This keeps the displayed stock synchronized with actual pharmacy transactions.
        </p>
      </div>

      {/* Post-Bill Success Summary Banner */}
      {lastCompletedBill && (
        <div className="bg-emerald-50 border-2 border-emerald-500/40 rounded-3xl p-5 space-y-4 shadow-md animate-in fade-in duration-300">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center font-bold">
                <Check className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-emerald-900">
                  Bill completed successfully. Inventory updated successfully.
                </h3>
                <p className="text-xs text-emerald-700 font-mono">
                  Bill #{lastCompletedBill.bill_number} • Total: ₹{lastCompletedBill.total_amount.toFixed(2)} • Dispensed by {lastCompletedBill.created_by}
                </p>
              </div>
            </div>
            <button
              onClick={() => setLastCompletedBill(null)}
              className="text-xs text-emerald-700 hover:text-emerald-900 font-medium px-2.5 py-1 rounded-xl bg-white/60 hover:bg-white"
            >
              Dismiss
            </button>
          </div>

          {/* Stock Impact Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-1">
            {lastCompletedBill.items.map((item) => (
              <div
                key={item.id}
                className="bg-white/90 border border-emerald-200 rounded-2xl p-3 shadow-xs space-y-1.5"
              >
                <div className="flex justify-between items-start">
                  <span className="text-xs font-bold text-[#12332C] truncate max-w-[170px]">
                    {item.medicine_name}
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold">
                    Billed: {item.quantity}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs pt-1 border-t border-emerald-100">
                  <span className="text-gray-500 text-[11px]">Previous Stock:</span>
                  <span className="font-semibold text-gray-700">{item.previous_stock ?? '—'}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-emerald-700 font-medium text-[11px]">Updated Stock:</span>
                  <span className="font-bold text-emerald-800 text-sm">{item.updated_stock ?? '—'}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Error Message */}
      {errorMessage && (
        <div className="bg-rose-50 border border-rose-300 rounded-2xl p-3.5 flex items-center justify-between text-xs text-rose-800 shadow-xs">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button
            onClick={() => setErrorMessage(null)}
            className="text-rose-600 hover:text-rose-800 font-bold ml-2"
          >
            ×
          </button>
        </div>
      )}

      {/* Main Billing Interface: Left (Form & Selection) + Right (Cart & Checkout) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Medicine Search & Item Form */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white/85 backdrop-blur-md border border-[#D9E8E3] rounded-3xl p-6 shadow-sm space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-[#D9E8E3]">
              <div className="flex items-center space-x-2">
                <ShoppingCart className="w-4 h-4 text-[#006B4F]" />
                <h2 className="text-sm font-bold text-[#12332C]">Select Medicine & Dispense</h2>
              </div>
              <span className="text-[11px] text-[#12332C]/60 font-mono">
                {availableInventory.length} Medicines in Ward {selectedWardId}
              </span>
            </div>

            {/* Medicine Selector Dropdown */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-[#12332C]/80">Choose Medicine</label>
              <select
                value={selectedMedId}
                onChange={(e) => {
                  setSelectedMedId(e.target.value ? Number(e.target.value) : '');
                  setInputQty(1);
                  setErrorMessage(null);
                }}
                className="w-full bg-[#F3FAF7] border border-[#D9E8E3] rounded-2xl px-3.5 py-2.5 text-xs text-[#12332C] font-medium focus:outline-none focus:ring-2 focus:ring-[#006B4F]"
              >
                <option value="">-- Choose a medicine from operational stock --</option>
                {availableInventory.map((item) => (
                  <option key={item.id} value={item.medicine_id}>
                    {item.medicine_name} ({item.medicine_code}) — Stock: {item.current_stock} {item.unit} | ₹{(item.unit_cost || 10).toFixed(2)}
                  </option>
                ))}
              </select>
            </div>

            {/* Selected Medicine Info Banner */}
            {currentSelectedMed && (
              <div className="bg-[#006B4F]/5 border border-[#006B4F]/20 rounded-2xl p-4 space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-sm font-bold text-[#006B4F]">{currentSelectedMed.medicine_name}</h3>
                    <p className="text-[11px] text-[#12332C]/70">
                      Generic: {currentSelectedMed.generic_name} • Category: {currentSelectedMed.category}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                      Available: {currentSelectedMed.current_stock}
                    </span>
                    <p className="text-xs font-bold text-[#12332C] mt-1 font-mono">
                      Unit Price: ₹{(currentSelectedMed.unit_cost || 10).toFixed(2)}
                    </p>
                  </div>
                </div>

                {/* Quantity and Add Button */}
                <div className="flex items-center space-x-4 pt-2">
                  <div className="flex-1">
                    <label className="text-[11px] font-semibold text-[#12332C]/70 block mb-1">
                      Dispense Quantity
                    </label>
                    <div className="flex items-center space-x-2">
                      <input
                        type="number"
                        min="1"
                        max={currentSelectedMed.current_stock}
                        value={inputQty}
                        onChange={(e) => setInputQty(Math.max(1, parseInt(e.target.value) || 1))}
                        className="w-24 bg-white border border-[#D9E8E3] rounded-xl px-3 py-2 text-xs font-bold text-center text-[#12332C] focus:outline-none focus:ring-2 focus:ring-[#006B4F]"
                      />
                      <span className="text-xs text-[#12332C]/60">
                        Line Total: <strong className="text-[#006B4F] font-mono">₹{((currentSelectedMed.unit_cost || 10) * inputQty).toFixed(2)}</strong>
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={handleAddToCart}
                    disabled={currentSelectedMed.current_stock < 1}
                    className="mt-4 px-4 py-2 bg-[#006B4F] hover:bg-[#00523C] text-white text-xs font-semibold rounded-2xl flex items-center space-x-2 shadow-xs transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add to Bill</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Patient Details & Clinical Prescription Metadata */}
          <div className="bg-white/85 backdrop-blur-md border border-[#D9E8E3] rounded-3xl p-6 shadow-sm space-y-4">
            <div className="flex items-center space-x-2 pb-2 border-b border-[#D9E8E3]">
              <User className="w-4 h-4 text-[#006B4F]" />
              <h2 className="text-sm font-bold text-[#12332C]">Patient & Prescription Details (Optional)</h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-[#12332C]/80 block mb-1">
                  Patient Name / Registration ID
                </label>
                <input
                  type="text"
                  placeholder="e.g. John Doe (PID-4029)"
                  value={patientName}
                  onChange={(e) => setPatientName(e.target.value)}
                  className="w-full bg-[#F3FAF7] border border-[#D9E8E3] rounded-2xl px-3.5 py-2 text-xs text-[#12332C] focus:outline-none focus:ring-2 focus:ring-[#006B4F]"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-[#12332C]/80 block mb-1">
                  Notes / Doctor Ref
                </label>
                <input
                  type="text"
                  placeholder="e.g. Outpatient Emergency Dispense"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full bg-[#F3FAF7] border border-[#D9E8E3] rounded-2xl px-3.5 py-2 text-xs text-[#12332C] focus:outline-none focus:ring-2 focus:ring-[#006B4F]"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Active Bill Cart & Confirmation */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white/90 backdrop-blur-md border border-[#D9E8E3] rounded-3xl p-6 shadow-sm flex flex-col justify-between min-h-[460px]">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-[#D9E8E3]">
                <div className="flex items-center space-x-2">
                  <Receipt className="w-4 h-4 text-[#006B4F]" />
                  <h2 className="text-sm font-bold text-[#12332C]">Current Bill Items</h2>
                </div>
                {cart.length > 0 && (
                  <button
                    onClick={handleClearCart}
                    className="text-[11px] text-rose-600 hover:text-rose-800 font-semibold flex items-center space-x-1"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Clear</span>
                  </button>
                )}
              </div>

              {/* Cart Table */}
              {cart.length === 0 ? (
                <div className="py-14 text-center space-y-3">
                  <ShoppingCart className="w-10 h-10 text-[#006B4F]/30 mx-auto" />
                  <p className="text-xs text-[#12332C]/60 font-medium">
                    No items in current bill cart.
                  </p>
                  <p className="text-[11px] text-[#12332C]/40">
                    Select a medicine from the left panel to begin dispensing.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100 max-h-[280px] overflow-y-auto mt-2 pr-1">
                  {cart.map((item) => (
                    <div key={item.medicine_id} className="py-3 flex items-center justify-between">
                      <div className="space-y-0.5 max-w-[180px]">
                        <h4 className="text-xs font-bold text-[#12332C] truncate">{item.medicine_name}</h4>
                        <p className="text-[10px] text-gray-500 font-mono">
                          ₹{item.unit_price.toFixed(2)} × {item.quantity} units
                        </p>
                      </div>

                      <div className="flex items-center space-x-3">
                        <span className="text-xs font-bold text-[#006B4F] font-mono">
                          ₹{(item.unit_price * item.quantity).toFixed(2)}
                        </span>
                        <button
                          onClick={() => handleRemoveItem(item.medicine_id)}
                          className="text-gray-400 hover:text-rose-600 transition-colors p-1"
                          title="Remove item"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Bill Financial Summary */}
            <div className="pt-4 border-t border-[#D9E8E3] space-y-3">
              <div className="flex justify-between text-xs text-gray-600">
                <span>Items Count:</span>
                <span className="font-semibold">{cart.length} items ({totalUnits} units)</span>
              </div>
              <div className="flex justify-between text-xs text-gray-600">
                <span>Tax / Duty:</span>
                <span className="font-semibold">₹0.00 (Exempt)</span>
              </div>
              <div className="flex justify-between text-base font-extrabold text-[#12332C] pt-2 border-t border-gray-100">
                <span>Grand Total:</span>
                <span className="text-[#006B4F] font-mono">₹{subtotal.toFixed(2)}</span>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex items-center space-x-3">
                <button
                  onClick={handleClearCart}
                  disabled={cart.length === 0 || submitting}
                  className="flex-1 py-2.5 px-3 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold rounded-2xl transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Reset / Clear
                </button>
                <button
                  onClick={() => setShowConfirmModal(true)}
                  disabled={cart.length === 0 || submitting}
                  className="flex-2 py-2.5 px-4 bg-[#006B4F] hover:bg-[#00523C] text-white text-xs font-bold rounded-2xl flex items-center justify-center space-x-2 shadow-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Receipt className="w-4 h-4" />
                  <span>{submitting ? 'Processing Transaction...' : 'Confirm Bill'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Completed Bills Section */}
      <div className="bg-white/85 backdrop-blur-md border border-[#D9E8E3] rounded-3xl p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-[#D9E8E3]">
          <div className="flex items-center space-x-2">
            <Clock className="w-4 h-4 text-[#006B4F]" />
            <h2 className="text-sm font-bold text-[#12332C]">Recent Bills Ledger</h2>
          </div>
          <span className="text-[11px] text-[#12332C]/60 font-mono">
            {recentBills.length} Transactions Recorded
          </span>
        </div>

        {recentBills.length === 0 ? (
          <div className="py-8 text-center text-xs text-gray-500">
            No bills recorded yet. Create a bill above to record real-time dispensing.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-gray-200 text-gray-500 font-semibold">
                  <th className="py-2.5 px-3">Bill Number</th>
                  <th className="py-2.5 px-3">Date & Time</th>
                  <th className="py-2.5 px-3">Ward</th>
                  <th className="py-2.5 px-3">Patient</th>
                  <th className="py-2.5 px-3">Medicines Dispensed</th>
                  <th className="py-2.5 px-3 text-right">Total Amount</th>
                  <th className="py-2.5 px-3 text-center">Status</th>
                  <th className="py-2.5 px-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {recentBills.map((b) => (
                  <tr key={b.id} className="hover:bg-gray-50/60 transition-colors">
                    <td className="py-3 px-3 font-mono font-bold text-[#006B4F]">
                      {b.bill_number}
                    </td>
                    <td className="py-3 px-3 text-gray-600">
                      {new Date(b.created_at).toLocaleString()}
                    </td>
                    <td className="py-3 px-3 text-gray-700">
                      {b.ward_name || `Ward ${b.ward_id}`}
                    </td>
                    <td className="py-3 px-3 text-gray-700">
                      {b.patient_name || <span className="text-gray-400 italic">Outpatient</span>}
                    </td>
                    <td className="py-3 px-3">
                      <div className="space-y-0.5">
                        {b.items.map((it) => (
                          <div key={it.id} className="text-[11px] text-gray-700">
                            • {it.medicine_name} <span className="font-semibold">({it.quantity})</span>
                          </div>
                        ))}
                      </div>
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-bold text-[#12332C]">
                      ₹{b.total_amount.toFixed(2)}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          b.status === 'SUCCESS'
                            ? 'bg-emerald-100 text-emerald-800'
                            : b.status === 'CANCELLED'
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {b.status}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center">
                      {b.status === 'SUCCESS' && (
                        <button
                          onClick={() => setCancelTargetBill(b)}
                          disabled={cancellingId === b.id}
                          className="px-2.5 py-1 text-[11px] font-semibold text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded-xl transition-colors disabled:opacity-50"
                        >
                          {cancellingId === b.id ? 'Reversing...' : 'Cancel & Reverse'}
                        </button>
                      )}
                      {b.status === 'CANCELLED' && (
                        <span className="text-[10px] text-gray-400 italic">Reversed</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Confirmation Modal Before Submission */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-5 shadow-2xl border border-gray-200 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-2xl bg-[#006B4F]/15 text-[#006B4F] flex items-center justify-center">
                <Receipt className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-[#12332C]">Confirm Pharmacy Dispensing</h3>
                <p className="text-xs text-gray-500">Atomic real-time inventory deduction</p>
              </div>
            </div>

            <div className="bg-gray-50 rounded-2xl p-4 space-y-2 text-xs">
              <div className="font-semibold text-gray-700 pb-1 border-b border-gray-200">
                Summary of Items ({cart.length} items, {totalUnits} total units):
              </div>
              <div className="max-h-36 overflow-y-auto space-y-1 divide-y divide-gray-100 pr-1">
                {cart.map((c) => (
                  <div key={c.medicine_id} className="pt-1 flex justify-between">
                    <span className="truncate max-w-[200px] text-gray-700">{c.medicine_name}</span>
                    <span className="font-mono font-semibold text-[#006B4F]">
                      {c.quantity} × ₹{c.unit_price.toFixed(2)} = ₹{(c.quantity * c.unit_price).toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
              <div className="flex justify-between font-bold text-sm text-[#12332C] pt-2 border-t border-gray-200">
                <span>Grand Total:</span>
                <span className="text-[#006B4F] font-mono">₹{subtotal.toFixed(2)}</span>
              </div>
            </div>

            <p className="text-[11px] text-gray-500 leading-relaxed">
              Confirming will atomically reduce stock across active batches in PostgreSQL via FEFO protocol.
              An audit entry will be created in the ledger.
            </p>

            <div className="flex items-center justify-end space-x-3 pt-2">
              <button
                onClick={() => setShowConfirmModal(false)}
                className="px-4 py-2 text-xs font-semibold text-gray-600 hover:text-gray-900 rounded-xl"
              >
                Back to Editing
              </button>
              <button
                onClick={handleConfirmBill}
                disabled={submitting}
                className="px-5 py-2 bg-[#006B4F] hover:bg-[#00523C] text-white text-xs font-bold rounded-2xl shadow-sm transition-colors"
              >
                {submitting ? 'Deducting Stock...' : 'Confirm & Dispense'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cancellation Confirmation Modal */}
      {cancelTargetBill && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-5 shadow-2xl border border-gray-200 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-[#12332C]">Cancel Bill #{cancelTargetBill.bill_number}</h3>
                <p className="text-xs text-gray-500">Atomic inventory reversal</p>
              </div>
            </div>

            <p className="text-xs text-gray-600 leading-relaxed">
              Are you sure you want to cancel this bill? This will reverse the stock deduction for all items and
              restore quantities back into operational inventory. This action can only be executed once.
            </p>

            <div className="flex items-center justify-end space-x-3 pt-2">
              <button
                onClick={() => setCancelTargetBill(null)}
                className="px-4 py-2 text-xs font-semibold text-gray-600 hover:text-gray-900 rounded-xl"
              >
                Keep Bill
              </button>
              <button
                onClick={handleExecuteCancel}
                disabled={cancellingId !== null}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-2xl shadow-sm transition-colors"
              >
                {cancellingId !== null ? 'Reversing...' : 'Confirm Reversal'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default BillingPage;

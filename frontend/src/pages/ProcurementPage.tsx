import React, { useState, useEffect } from 'react';
import { ShoppingCart, Truck, RefreshCw, Send, ArrowRight } from 'lucide-react';
import { PurchaseOrderItem } from '../types';
import { api } from '../services/api';

interface ProcurementPageProps {
  onRefreshData: () => void;
}

export const ProcurementPage: React.FC<ProcurementPageProps> = ({ onRefreshData }) => {
  const [orders, setOrders] = useState<PurchaseOrderItem[]>([]);
  const [loading, setLoading] = useState(true);

  const loadOrders = async () => {
    setLoading(true);
    try {
      const data = await api.getPurchaseOrders();
      setOrders(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, []);

  const handleDispatch = async (id: number) => {
    try {
      await api.executePurchaseOrder(id);
      await loadOrders();
      onRefreshData();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-2xl bg-[#7c5cfc]/15 border border-[#7c5cfc]/30 flex items-center justify-center text-[#9484f7]">
              <ShoppingCart className="w-4 h-4" />
            </div>
            <h1 className="text-xl font-bold text-white tracking-tight">
              Autonomous Procurement & Supplier Optimization
            </h1>
          </div>
          <p className="text-xs text-slate-400 mt-1 pl-11">
            Supplier multi-attribute evaluation (reliability, lead time & price) with automated PO generation
          </p>
        </div>

        <button
          onClick={loadOrders}
          className="w-9 h-9 rounded-full bg-[#1c1d25] border border-white/[0.07] text-slate-300 hover:text-white hover:border-white/20 flex items-center justify-center transition-all self-start"
          title="Refresh orders"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-[#9484f7]' : ''}`} />
        </button>
      </div>

      {/* Supplier Evaluation Matrix */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { name: 'Apex Lifesciences Ltd.', lead: '1-2 Days', reliability: '98%', rank: 'Preferred Partner', badge: 'Tier 1' },
          { name: 'Vanguard Emergency Logistics', lead: '1 Day Express', reliability: '99%', rank: 'Emergency Outbreak Vendor', badge: 'Urgent' },
          { name: 'Bharat Healthcare Distributors', lead: '2-3 Days', reliability: '94%', rank: 'High Volume Cost-Effective', badge: 'Tier 2' },
          { name: 'MediSource Pharma Supplies', lead: '3-4 Days', reliability: '89%', rank: 'Standard Planned Orders', badge: 'Economy' },
        ].map((sup, i) => (
          <div key={i} className="bg-[#1c1d25] border border-white/[0.07] rounded-3xl p-5 space-y-3 hover:border-white/20 transition-all shadow-md">
            <div className="flex items-center justify-between">
              <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-[#7c5cfc]/20 text-[#a890fe] border border-[#7c5cfc]/30 font-bold uppercase tracking-wider">
                {sup.badge}
              </span>
              <Truck className="w-4 h-4 text-slate-400" />
            </div>
            <div>
              <div className="text-xs font-bold text-white leading-tight">{sup.name}</div>
              <div className="text-[11px] text-slate-400 mt-0.5">{sup.rank}</div>
            </div>
            <div className="pt-3 border-t border-white/[0.05] flex items-center justify-between text-xs">
              <span className="text-emerald-400 font-semibold">{sup.reliability} On-Time</span>
              <span className="text-slate-400">{sup.lead}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Purchase Orders Table */}
      <div className="bg-[#1c1d25] border border-white/[0.07] rounded-3xl overflow-hidden shadow-lg">
        <div className="p-5 border-b border-white/[0.07] flex items-center justify-between">
          <h3 className="text-sm font-bold text-white tracking-tight">Purchase Orders Ledger</h3>
          <span className="text-xs px-3 py-1 rounded-full bg-white/[0.04] border border-white/[0.06] text-slate-400">
            {orders.length} orders on record
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-white/[0.07] bg-white/[0.02] text-slate-400 text-[11px] uppercase tracking-wider">
                <th className="py-3.5 px-5 font-semibold">PO #</th>
                <th className="py-3.5 px-5 font-semibold">Supplier</th>
                <th className="py-3.5 px-5 font-semibold">Items / Medicine</th>
                <th className="py-3.5 px-5 font-semibold">Total Amount</th>
                <th className="py-3.5 px-5 font-semibold">Priority</th>
                <th className="py-3.5 px-5 font-semibold">Status</th>
                <th className="py-3.5 px-5 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.05] text-slate-300">
              {loading ? (
                [...Array(3)].map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={7} className="py-4 px-5 h-12 bg-white/[0.01]"></td>
                  </tr>
                ))
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    No active purchase orders.
                  </td>
                </tr>
              ) : (
                orders.map((po) => (
                  <tr key={po.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="py-3.5 px-5 font-mono text-[#a890fe] font-bold">{po.po_number}</td>
                    <td className="py-3.5 px-5">
                      <div className="font-semibold text-white">{po.supplier_name}</div>
                      <div className="text-[10px] text-slate-400">Lead: {po.supplier_lead_time_days}d</div>
                    </td>
                    <td className="py-3.5 px-5">
                      {po.items.map((it, idx) => (
                        <div key={idx} className="text-slate-200">
                          {it.medicine_name} <span className="text-[#9484f7]">({it.quantity} units)</span>
                        </div>
                      ))}
                    </td>
                    <td className="py-3.5 px-5 font-bold text-white">
                      ₹{po.total_amount.toLocaleString()}
                    </td>
                    <td className="py-3.5 px-5">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        po.priority === 'EMERGENCY'
                          ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                          : 'bg-white/[0.05] text-slate-300 border border-white/[0.07]'
                      }`}>
                        {po.priority}
                      </span>
                    </td>
                    <td className="py-3.5 px-5">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        po.status === 'ORDERED' || po.status === 'APPROVED'
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : po.status === 'PENDING_APPROVAL'
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          : 'bg-white/[0.05] text-slate-300 border border-white/[0.07]'
                      }`}>
                        {po.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-5 text-right">
                      {po.status === 'PROPOSED' && (
                        <button
                          onClick={() => handleDispatch(po.id)}
                          className="ref-pill-btn px-4 py-1.5 bg-[#7c5cfc] hover:bg-[#8c6eff] text-white font-semibold rounded-full text-[11px] shadow-lg shadow-[#7c5cfc]/20 transition-all"
                        >
                          Dispatch
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

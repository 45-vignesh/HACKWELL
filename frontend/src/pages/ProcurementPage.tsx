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
    <div className="p-8 space-y-6 max-w-7xl mx-auto text-[#12332C]">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-2xl bg-[#006B4F]/15 border border-[#006B4F]/30 flex items-center justify-center text-[#006B4F]">
              <ShoppingCart className="w-4 h-4" />
            </div>
            <h1 className="text-xl font-bold text-[#12332C] tracking-tight">
              Autonomous Procurement & Supplier Optimization
            </h1>
          </div>
          <p className="text-xs text-[#647772] mt-1 pl-11">
            Supplier multi-attribute evaluation (reliability, lead time & price) with automated PO generation
          </p>
        </div>

        <button
          onClick={loadOrders}
          className="w-9 h-9 rounded-full bg-white border border-[#D9E8E3] text-[#647772] hover:text-[#006B4F] hover:border-[#008F83] flex items-center justify-center transition-all self-start shadow-sm"
          title="Refresh orders"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-[#006B4F]' : ''}`} />
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
          <div key={i} className="bg-white border border-[#D9E8E3] rounded-3xl p-5 space-y-3 hover:border-[#008F83] transition-all shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-[#008F83]/15 text-[#008F83] border border-[#008F83]/30 font-bold uppercase tracking-wider">
                {sup.badge}
              </span>
              <Truck className="w-4 h-4 text-[#006B4F]" />
            </div>
            <div>
              <div className="text-xs font-bold text-[#12332C] leading-tight">{sup.name}</div>
              <div className="text-[11px] text-[#647772] mt-0.5">{sup.rank}</div>
            </div>
            <div className="pt-3 border-t border-[#D9E8E3] flex items-center justify-between text-xs">
              <span className="text-[#16A34A] font-semibold">{sup.reliability} On-Time</span>
              <span className="text-[#647772]">{sup.lead}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Purchase Orders Table */}
      <div className="bg-white border border-[#D9E8E3] rounded-3xl overflow-hidden shadow-sm">
        <div className="p-5 border-b border-[#D9E8E3] flex items-center justify-between bg-[#F3FAF7]">
          <h3 className="text-sm font-bold text-[#12332C] tracking-tight">Purchase Orders Ledger</h3>
          <span className="text-xs px-3 py-1 rounded-full bg-white border border-[#D9E8E3] text-[#647772]">
            {orders.length} orders on record
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#D9E8E3] bg-[#F3FAF7]/70 text-[#647772] text-[11px] uppercase tracking-wider">
                <th className="py-3.5 px-5 font-semibold">PO #</th>
                <th className="py-3.5 px-5 font-semibold">Supplier</th>
                <th className="py-3.5 px-5 font-semibold">Items / Medicine</th>
                <th className="py-3.5 px-5 font-semibold">Total Amount</th>
                <th className="py-3.5 px-5 font-semibold">Priority</th>
                <th className="py-3.5 px-5 font-semibold">Status</th>
                <th className="py-3.5 px-5 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#D9E8E3] text-[#12332C]">
              {loading ? (
                [...Array(3)].map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={7} className="py-4 px-5 h-12 bg-[#F3FAF7]/50"></td>
                  </tr>
                ))
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-[#647772]">
                    No active purchase orders.
                  </td>
                </tr>
              ) : (
                orders.map((po) => (
                  <tr key={po.id} className="hover:bg-[#F3FAF7]/70 transition-colors">
                    <td className="py-3.5 px-5 font-mono text-[#006B4F] font-bold">{po.po_number}</td>
                    <td className="py-3.5 px-5">
                      <div className="font-semibold text-[#12332C]">{po.supplier_name}</div>
                      <div className="text-[10px] text-[#647772]">Lead: {po.supplier_lead_time_days}d</div>
                    </td>
                    <td className="py-3.5 px-5">
                      {po.items.map((it, idx) => (
                        <div key={idx} className="text-[#12332C]">
                          {it.medicine_name} <span className="text-[#008F83] font-semibold">({it.quantity} units)</span>
                        </div>
                      ))}
                    </td>
                    <td className="py-3.5 px-5 font-bold text-[#12332C]">
                      ₹{po.total_amount.toLocaleString()}
                    </td>
                    <td className="py-3.5 px-5">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        po.priority === 'EMERGENCY'
                          ? 'bg-[#DC2626]/15 text-[#DC2626] border border-[#DC2626]/30'
                          : 'bg-[#F3FAF7] text-[#12332C] border border-[#D9E8E3]'
                      }`}>
                        {po.priority}
                      </span>
                    </td>
                    <td className="py-3.5 px-5">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        po.status === 'ORDERED' || po.status === 'APPROVED'
                          ? 'bg-[#16A34A]/15 text-[#16A34A] border border-[#16A34A]/30'
                          : po.status === 'PENDING_APPROVAL'
                          ? 'bg-[#F59E0B]/15 text-[#B45309] border border-[#F59E0B]/30'
                          : 'bg-[#F3FAF7] text-[#12332C] border border-[#D9E8E3]'
                      }`}>
                        {po.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-5 text-right">
                      {po.status === 'PROPOSED' && (
                        <button
                          onClick={() => handleDispatch(po.id)}
                          className="ref-pill-btn px-4 py-1.5 bg-[#006B4F] hover:bg-[#004D3A] text-white font-semibold rounded-full text-[11px] shadow-sm transition-all"
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

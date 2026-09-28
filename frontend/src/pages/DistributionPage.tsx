import React, { useState, useEffect } from 'react';
import { ArrowLeftRight, CheckCircle2, RefreshCw, ArrowRight } from 'lucide-react';
import { StockTransferItem } from '../types';
import { api } from '../services/api';

interface DistributionPageProps {
  onRefreshData: () => void;
}

export const DistributionPage: React.FC<DistributionPageProps> = ({ onRefreshData }) => {
  const [transfers, setTransfers] = useState<StockTransferItem[]>([]);
  const [loading, setLoading] = useState(true);

  const loadTransfers = async () => {
    setLoading(true);
    try {
      const data = await api.getTransfers();
      setTransfers(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTransfers();
  }, []);

  const handleExecute = async (id: number) => {
    try {
      await api.executeTransfer(id);
      await loadTransfers();
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
              <ArrowLeftRight className="w-4 h-4" />
            </div>
            <h1 className="text-xl font-bold text-white tracking-tight">
              Inter-Department Inventory Distribution & Rebalancing
            </h1>
          </div>
          <p className="text-xs text-slate-400 mt-1 pl-11">
            Autonomous harvesting of ward surplus headroom to buffer critical shortages without violating safety stock
          </p>
        </div>

        <button
          onClick={loadTransfers}
          className="w-9 h-9 rounded-full bg-[#1c1d25] border border-white/[0.07] text-slate-300 hover:text-white hover:border-white/20 flex items-center justify-center transition-all self-start"
          title="Refresh transfers"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-[#9484f7]' : ''}`} />
        </button>
      </div>

      {/* Hero Visual: Rebalance Flow Card */}
      <div className="bg-[#1c1d25] border border-white/[0.07] rounded-3xl p-6 shadow-xl space-y-4">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-[#9484f7]">
          Active Multi-Echelon Rebalancing Topology
        </h3>

        <div className="flex flex-col md:flex-row items-center justify-between max-w-3xl mx-auto py-2 gap-4">
          {/* Source Ward */}
          <div className="bg-[#232430] border border-white/[0.07] rounded-2xl p-5 text-center w-full md:w-60 shadow-md">
            <span className="text-[10px] px-3 py-1 rounded-full bg-[#7c5cfc]/20 text-[#a890fe] border border-[#7c5cfc]/30 uppercase font-bold tracking-wider">
              Surplus Source
            </span>
            <div className="text-sm font-bold text-white mt-3">OPD Satellite Pharmacy</div>
            <div className="text-xs text-[#9484f7] font-semibold mt-1">175 Units in Stock</div>
            <div className="text-[11px] text-slate-400 mt-0.5">Headroom: +70 units</div>
          </div>

          {/* Transfer Channel Arrow */}
          <div className="flex flex-col items-center space-y-1.5 py-2">
            <div className="text-xs font-bold text-[#c4b5fd]">50 Units Transfer</div>
            <div className="flex items-center space-x-1 text-[#9484f7]">
              <span className="w-16 h-0.5 bg-gradient-to-r from-[#7c5cfc] to-[#9484f7]"></span>
              <ArrowRight className="w-4 h-4" />
            </div>
            <div className="text-[10px] text-slate-400">Safety Buffer Preserved</div>
          </div>

          {/* Destination Ward */}
          <div className="bg-[#232430] border border-rose-500/30 rounded-2xl p-5 text-center w-full md:w-60 shadow-md">
            <span className="text-[10px] px-3 py-1 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 uppercase font-bold tracking-wider">
              Deficit Destination
            </span>
            <div className="text-sm font-bold text-white mt-3">Emergency Acute Ward</div>
            <div className="text-xs text-rose-400 font-semibold mt-1">Critical Low: 35 Units</div>
            <div className="text-[10px] text-slate-400 mt-0.5">Stockout in 1.5 Days</div>
          </div>
        </div>
      </div>

      {/* Transfers Ledger Table */}
      <div className="bg-[#1c1d25] border border-white/[0.07] rounded-3xl overflow-hidden shadow-lg">
        <div className="p-5 border-b border-white/[0.07] flex items-center justify-between">
          <h3 className="text-sm font-bold text-white tracking-tight">Stock Transfer Proposals & Executions</h3>
          <span className="text-xs px-3 py-1 rounded-full bg-white/[0.04] border border-white/[0.06] text-slate-400">
            {transfers.length} registered transfers
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-white/[0.07] bg-white/[0.02] text-slate-400 text-[11px] uppercase tracking-wider">
                <th className="py-3.5 px-5 font-semibold">Transfer #</th>
                <th className="py-3.5 px-5 font-semibold">Medicine</th>
                <th className="py-3.5 px-5 font-semibold">From (Source)</th>
                <th className="py-3.5 px-5 font-semibold">To (Destination)</th>
                <th className="py-3.5 px-5 font-semibold">Quantity</th>
                <th className="py-3.5 px-5 font-semibold">Status</th>
                <th className="py-3.5 px-5 font-semibold">Initiated By</th>
                <th className="py-3.5 px-5 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.05] text-slate-300">
              {loading ? (
                [...Array(3)].map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={8} className="py-4 px-5 h-12 bg-white/[0.01]"></td>
                  </tr>
                ))
              ) : transfers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    No active stock transfers recorded.
                  </td>
                </tr>
              ) : (
                transfers.map((t) => (
                  <tr key={t.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="py-3.5 px-5 font-mono text-[#a890fe] font-bold">{t.transfer_number}</td>
                    <td className="py-3.5 px-5 font-semibold text-white">{t.medicine_name}</td>
                    <td className="py-3.5 px-5 text-slate-300">{t.from_ward_name}</td>
                    <td className="py-3.5 px-5 text-slate-300">{t.to_ward_name}</td>
                    <td className="py-3.5 px-5 font-bold text-[#9484f7]">{t.quantity} units</td>
                    <td className="py-3.5 px-5">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        t.status === 'COMPLETED'
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      }`}>
                        {t.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-5 text-slate-400">{t.initiated_by_agent}</td>
                    <td className="py-3.5 px-5 text-right">
                      {t.status !== 'COMPLETED' && (
                        <button
                          onClick={() => handleExecute(t.id)}
                          className="ref-pill-btn px-4 py-1.5 bg-[#7c5cfc] hover:bg-[#8c6eff] text-white font-semibold rounded-full text-[11px] shadow-lg shadow-[#7c5cfc]/20 transition-all"
                        >
                          Execute
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

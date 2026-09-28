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
    <div className="p-8 space-y-6 max-w-7xl mx-auto text-[#12332C]">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-2xl bg-[#006B4F]/15 border border-[#006B4F]/30 flex items-center justify-center text-[#006B4F]">
              <ArrowLeftRight className="w-4 h-4" />
            </div>
            <h1 className="text-xl font-bold text-[#12332C] tracking-tight">
              Inter-Department Inventory Distribution & Rebalancing
            </h1>
          </div>
          <p className="text-xs text-[#647772] mt-1 pl-11">
            Autonomous harvesting of ward surplus headroom to buffer critical shortages without violating safety stock
          </p>
        </div>

        <button
          onClick={loadTransfers}
          className="w-9 h-9 rounded-full bg-white border border-[#D9E8E3] text-[#647772] hover:text-[#006B4F] hover:border-[#008F83] flex items-center justify-center transition-all self-start shadow-sm"
          title="Refresh transfers"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-[#006B4F]' : ''}`} />
        </button>
      </div>

      {/* Hero Visual: Rebalance Flow Card */}
      <div className="bg-white border border-[#D9E8E3] rounded-3xl p-6 shadow-sm space-y-4">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-[#006B4F]">
          Active Multi-Echelon Rebalancing Topology
        </h3>

        <div className="flex flex-col md:flex-row items-center justify-between max-w-3xl mx-auto py-2 gap-4">
          {/* Source Ward */}
          <div className="bg-[#F3FAF7] border border-[#D9E8E3] rounded-2xl p-5 text-center w-full md:w-60 shadow-sm">
            <span className="text-[10px] px-3 py-1 rounded-full bg-[#008F83]/15 text-[#008F83] border border-[#008F83]/30 uppercase font-bold tracking-wider">
              Surplus Source
            </span>
            <div className="text-sm font-bold text-[#12332C] mt-3">OPD Satellite Pharmacy</div>
            <div className="text-xs text-[#006B4F] font-semibold mt-1">175 Units in Stock</div>
            <div className="text-[11px] text-[#647772] mt-0.5">Headroom: +70 units</div>
          </div>

          {/* Transfer Channel Arrow */}
          <div className="flex flex-col items-center space-y-1.5 py-2">
            <div className="text-xs font-bold text-[#006B4F]">50 Units Transfer</div>
            <div className="flex items-center space-x-1 text-[#008F83]">
              <span className="w-16 h-0.5 bg-gradient-to-r from-[#006B4F] to-[#008F83]"></span>
              <ArrowRight className="w-4 h-4" />
            </div>
            <div className="text-[10px] text-[#647772]">Safety Buffer Preserved</div>
          </div>

          {/* Destination Ward */}
          <div className="bg-[#F3FAF7] border border-[#DC2626]/30 rounded-2xl p-5 text-center w-full md:w-60 shadow-sm">
            <span className="text-[10px] px-3 py-1 rounded-full bg-[#DC2626]/15 text-[#DC2626] border border-[#DC2626]/30 uppercase font-bold tracking-wider">
              Deficit Destination
            </span>
            <div className="text-sm font-bold text-[#12332C] mt-3">Emergency Acute Ward</div>
            <div className="text-xs text-[#DC2626] font-semibold mt-1">Critical Low: 35 Units</div>
            <div className="text-[10px] text-[#647772] mt-0.5">Stockout in 1.5 Days</div>
          </div>
        </div>
      </div>

      {/* Transfers Ledger Table */}
      <div className="bg-white border border-[#D9E8E3] rounded-3xl overflow-hidden shadow-sm">
        <div className="p-5 border-b border-[#D9E8E3] flex items-center justify-between bg-[#F3FAF7]">
          <h3 className="text-sm font-bold text-[#12332C] tracking-tight">Stock Transfer Proposals & Executions</h3>
          <span className="text-xs px-3 py-1 rounded-full bg-white border border-[#D9E8E3] text-[#647772]">
            {transfers.length} registered transfers
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#D9E8E3] bg-[#F3FAF7]/70 text-[#647772] text-[11px] uppercase tracking-wider">
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
            <tbody className="divide-y divide-[#D9E8E3] text-[#12332C]">
              {loading ? (
                [...Array(3)].map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={8} className="py-4 px-5 h-12 bg-[#F3FAF7]/50"></td>
                  </tr>
                ))
              ) : transfers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-[#647772]">
                    No active stock transfers recorded.
                  </td>
                </tr>
              ) : (
                transfers.map((t) => (
                  <tr key={t.id} className="hover:bg-[#F3FAF7]/70 transition-colors">
                    <td className="py-3.5 px-5 font-mono text-[#006B4F] font-bold">{t.transfer_number}</td>
                    <td className="py-3.5 px-5 font-semibold text-[#12332C]">{t.medicine_name}</td>
                    <td className="py-3.5 px-5 text-[#647772]">{t.from_ward_name}</td>
                    <td className="py-3.5 px-5 text-[#647772]">{t.to_ward_name}</td>
                    <td className="py-3.5 px-5 font-bold text-[#008F83]">{t.quantity} units</td>
                    <td className="py-3.5 px-5">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        t.status === 'COMPLETED'
                          ? 'bg-[#16A34A]/15 text-[#16A34A] border border-[#16A34A]/30'
                          : 'bg-[#F59E0B]/15 text-[#B45309] border border-[#F59E0B]/30'
                      }`}>
                        {t.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-5 text-[#647772]">{t.initiated_by_agent}</td>
                    <td className="py-3.5 px-5 text-right">
                      {t.status !== 'COMPLETED' && (
                        <button
                          onClick={() => handleExecute(t.id)}
                          className="ref-pill-btn px-4 py-1.5 bg-[#006B4F] hover:bg-[#004D3A] text-white font-semibold rounded-full text-[11px] shadow-sm transition-all"
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

import React, { useState, useEffect } from 'react';
import { Trash2, AlertTriangle, Clock, RefreshCw, ShieldAlert } from 'lucide-react';
import { api } from '../services/api';

export const WasteGuardPage: React.FC = () => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const loadWasteData = async () => {
    setLoading(true);
    try {
      const res = await api.getExpiringBatches(90);
      setData(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWasteData();
  }, []);

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-2xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400">
              <Trash2 className="w-4 h-4" />
            </div>
            <h1 className="text-xl font-bold text-white tracking-tight">
              Waste Guard & FEFO Expiry Minimization
            </h1>
          </div>
          <p className="text-xs text-slate-400 mt-1 pl-11">
            Proactive shelf-life tracking, First-Expiry-First-Out prioritization, and value-at-risk monitoring
          </p>
        </div>

        <button
          onClick={loadWasteData}
          className="w-9 h-9 rounded-full bg-[#1c1d25] border border-white/[0.07] text-slate-300 hover:text-white hover:border-white/20 flex items-center justify-center transition-all self-start"
          title="Refresh waste metrics"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-[#9484f7]' : ''}`} />
        </button>
      </div>

      {loading || !data ? (
        <div className="h-64 flex items-center justify-center text-slate-400 text-sm">
          Auditing active inventory batches against expiration boundaries...
        </div>
      ) : (
        <>
          {/* Summary Metric Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="bg-[#1c1d25] border border-rose-500/30 p-6 rounded-3xl shadow-lg relative overflow-hidden">
              <div className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold">Total Potential Loss</div>
              <div className="text-3xl font-extrabold text-rose-400 mt-2 tracking-tight">
                ₹{data.total_value_at_risk.toLocaleString()}
              </div>
              <div className="text-xs text-rose-300/80 mt-1">Value at risk across {data.total_batches_at_risk} near-expiry batches</div>
            </div>

            <div className="bg-[#1c1d25] border border-amber-500/30 p-6 rounded-3xl shadow-lg">
              <div className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold">Critical &lt; 30 Days</div>
              <div className="text-3xl font-extrabold text-amber-400 mt-2 tracking-tight">
                {data.batches.filter((b: any) => b.days_to_expiry <= 30).length} Batches
              </div>
              <div className="text-xs text-amber-300/80 mt-1">Requires immediate clinical redistribution</div>
            </div>

            <div className="bg-[#1c1d25] border border-emerald-500/30 p-6 rounded-3xl shadow-lg">
              <div className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold">FEFO Protocol Status</div>
              <div className="text-3xl font-extrabold text-emerald-400 mt-2 tracking-tight flex items-center space-x-2">
                <span>ENFORCED</span>
              </div>
              <div className="text-xs text-emerald-300/80 mt-1">Dispensing queues ordered by shortest shelf-life</div>
            </div>
          </div>

          {/* Expiring Batches Table */}
          <div className="bg-[#1c1d25] border border-white/[0.07] rounded-3xl overflow-hidden shadow-lg">
            <div className="p-5 border-b border-white/[0.07] flex items-center justify-between">
              <h3 className="text-sm font-bold text-white tracking-tight">Batches Expiring in Next 90 Days</h3>
              <span className="text-xs px-3 py-1 rounded-full bg-white/[0.04] border border-white/[0.06] text-slate-400">
                {data.batches.length} batches detected
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-white/[0.07] bg-white/[0.02] text-slate-400 text-[11px] uppercase tracking-wider">
                    <th className="py-3.5 px-5 font-semibold">Batch Number</th>
                    <th className="py-3.5 px-5 font-semibold">Medicine</th>
                    <th className="py-3.5 px-5 font-semibold">Ward</th>
                    <th className="py-3.5 px-5 font-semibold">Quantity at Risk</th>
                    <th className="py-3.5 px-5 font-semibold">Expiry Date</th>
                    <th className="py-3.5 px-5 font-semibold">Days Left</th>
                    <th className="py-3.5 px-5 font-semibold">Value (INR)</th>
                    <th className="py-3.5 px-5 font-semibold">FEFO Directive</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.05] text-slate-300">
                  {data.batches.map((b: any, idx: number) => (
                    <tr key={idx} className="hover:bg-white/[0.02] transition-colors">
                      <td className="py-3.5 px-5 font-mono text-[#a890fe] font-bold">{b.batch_number}</td>
                      <td className="py-3.5 px-5 font-semibold text-white">{b.medicine_name}</td>
                      <td className="py-3.5 px-5 text-slate-300">{b.ward_name}</td>
                      <td className="py-3.5 px-5 font-bold text-white">{b.quantity} units</td>
                      <td className="py-3.5 px-5 text-slate-300">{b.expiry_date}</td>
                      <td className="py-3.5 px-5">
                        <span className={`px-2.5 py-0.5 rounded-full font-bold text-[11px] uppercase tracking-wider ${
                          b.days_to_expiry <= 30
                            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                            : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                        }`}>
                          {b.days_to_expiry} days
                        </span>
                      </td>
                      <td className="py-3.5 px-5 font-bold text-rose-400">
                        ₹{b.value_at_risk.toLocaleString()}
                      </td>
                      <td className="py-3.5 px-5 text-slate-300 max-w-xs text-[11px]">
                        {b.fefo_recommendation}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

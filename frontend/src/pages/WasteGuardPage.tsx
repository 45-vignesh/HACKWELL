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
    <div className="p-8 space-y-6 max-w-7xl mx-auto text-[#12332C]">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-2xl bg-[#DC2626]/15 border border-[#DC2626]/30 flex items-center justify-center text-[#DC2626]">
              <Trash2 className="w-4 h-4" />
            </div>
            <h1 className="text-xl font-bold text-[#12332C] tracking-tight">
              Waste Guard & FEFO Expiry Minimization
            </h1>
          </div>
          <p className="text-xs text-[#647772] mt-1 pl-11">
            Proactive shelf-life tracking, First-Expiry-First-Out prioritization, and value-at-risk monitoring
          </p>
        </div>

        <button
          onClick={loadWasteData}
          className="w-9 h-9 rounded-full bg-white border border-[#D9E8E3] text-[#647772] hover:text-[#006B4F] hover:border-[#008F83] flex items-center justify-center transition-all self-start shadow-sm"
          title="Refresh waste metrics"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-[#006B4F]' : ''}`} />
        </button>
      </div>

      {loading || !data ? (
        <div className="h-64 flex items-center justify-center text-[#647772] text-sm">
          Auditing active inventory batches against expiration boundaries...
        </div>
      ) : (
        <>
          {/* Summary Metric Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="bg-white border border-[#DC2626]/30 p-6 rounded-3xl shadow-sm relative overflow-hidden">
              <div className="text-[11px] text-[#647772] uppercase tracking-wider font-semibold">Total Potential Loss</div>
              <div className="text-3xl font-extrabold text-[#DC2626] mt-2 tracking-tight">
                ₹{data.total_value_at_risk.toLocaleString()}
              </div>
              <div className="text-xs text-[#DC2626]/90 mt-1 font-medium">Value at risk across {data.total_batches_at_risk} near-expiry batches</div>
            </div>

            <div className="bg-white border border-[#F59E0B]/30 p-6 rounded-3xl shadow-sm">
              <div className="text-[11px] text-[#647772] uppercase tracking-wider font-semibold">Critical &lt; 30 Days</div>
              <div className="text-3xl font-extrabold text-[#B45309] mt-2 tracking-tight">
                {data.batches.filter((b: any) => b.days_to_expiry <= 30).length} Batches
              </div>
              <div className="text-xs text-[#B45309]/90 mt-1 font-medium">Requires immediate clinical redistribution</div>
            </div>

            <div className="bg-white border border-[#16A34A]/30 p-6 rounded-3xl shadow-sm">
              <div className="text-[11px] text-[#647772] uppercase tracking-wider font-semibold">FEFO Protocol Status</div>
              <div className="text-3xl font-extrabold text-[#16A34A] mt-2 tracking-tight flex items-center space-x-2">
                <span>ENFORCED</span>
              </div>
              <div className="text-xs text-[#16A34A]/90 mt-1 font-medium">Dispensing queues ordered by shortest shelf-life</div>
            </div>
          </div>

          {/* Expiring Batches Table */}
          <div className="bg-white border border-[#D9E8E3] rounded-3xl overflow-hidden shadow-sm">
            <div className="p-5 border-b border-[#D9E8E3] flex items-center justify-between bg-[#F3FAF7]">
              <h3 className="text-sm font-bold text-[#12332C] tracking-tight">Batches Expiring in Next 90 Days</h3>
              <span className="text-xs px-3 py-1 rounded-full bg-white border border-[#D9E8E3] text-[#647772]">
                {data.batches.length} batches detected
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#D9E8E3] bg-[#F3FAF7]/70 text-[#647772] text-[11px] uppercase tracking-wider">
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
                <tbody className="divide-y divide-[#D9E8E3] text-[#12332C]">
                  {data.batches.map((b: any, idx: number) => (
                    <tr key={idx} className="hover:bg-[#F3FAF7]/70 transition-colors">
                      <td className="py-3.5 px-5 font-mono text-[#006B4F] font-bold">{b.batch_number}</td>
                      <td className="py-3.5 px-5 font-semibold text-[#12332C]">{b.medicine_name}</td>
                      <td className="py-3.5 px-5 text-[#647772]">{b.ward_name}</td>
                      <td className="py-3.5 px-5 font-bold text-[#12332C]">{b.quantity} units</td>
                      <td className="py-3.5 px-5 text-[#647772] font-mono">{b.expiry_date}</td>
                      <td className="py-3.5 px-5">
                        <span className={`px-2.5 py-0.5 rounded-full font-bold text-[11px] uppercase tracking-wider ${
                          b.days_to_expiry <= 30
                            ? 'bg-[#DC2626]/15 text-[#DC2626] border border-[#DC2626]/30'
                            : 'bg-[#F59E0B]/15 text-[#B45309] border border-[#F59E0B]/30'
                        }`}>
                          {b.days_to_expiry} days
                        </span>
                      </td>
                      <td className="py-3.5 px-5 font-bold text-[#DC2626]">
                        ₹{b.value_at_risk.toLocaleString()}
                      </td>
                      <td className="py-3.5 px-5 text-[#12332C] max-w-xs text-[11px]">
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

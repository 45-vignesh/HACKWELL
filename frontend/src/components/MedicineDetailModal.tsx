import React, { useEffect, useState } from 'react';
import { X, Calendar, DollarSign, Package, AlertTriangle, ArrowRight, ShieldCheck, Truck } from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { api } from '../services/api';

interface MedicineDetailModalProps {
  inventoryId: number | null;
  onClose: () => void;
  onNavigateToForecast: (medicineId: number) => void;
}

export const MedicineDetailModal: React.FC<MedicineDetailModalProps> = ({
  inventoryId,
  onClose,
  onNavigateToForecast
}) => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (inventoryId) {
      setLoading(true);
      api.getInventoryDetail(inventoryId)
        .then((res) => setData(res))
        .catch((err) => console.error(err))
        .finally(() => setLoading(false));
    } else {
      setData(null);
    }
  }, [inventoryId]);

  if (!inventoryId) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-[#16171d] border border-white/[0.1] rounded-[28px] w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="p-6 border-b border-white/[0.07] flex items-center justify-between bg-[#1c1d25]">
          {data ? (
            <div>
              <div className="flex items-center space-x-3">
                <h2 className="text-lg font-bold text-white tracking-tight">{data.medicine.name}</h2>
                <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                  data.medicine.criticality === 'CRITICAL'
                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                    : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                }`}>
                  {data.medicine.criticality}
                </span>
                <span className="text-xs text-slate-400 font-mono">Code: {data.medicine.code}</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-mono font-medium bg-emerald-500/15 text-emerald-400 border border-emerald-500/25">
                  Usage: {data.usage_source || 'MIMIC-Derived'}
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-mono font-medium bg-amber-500/15 text-amber-300 border border-amber-500/25">
                  Stock: Synthetic
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Generic: <span className="text-slate-300 font-medium">{data.medicine.generic_name}</span> | Ward: <span className="text-[#9484f7] font-semibold">{data.ward.name}</span>
              </p>
            </div>
          ) : (
            <div className="h-10 w-48 bg-white/[0.05] animate-pulse rounded-full"></div>
          )}

          <div className="flex items-center space-x-2">
            {data && (
              <button
                onClick={() => {
                  onClose();
                  onNavigateToForecast(data.medicine.id);
                }}
                className="ref-pill-btn flex items-center space-x-1.5 px-4 py-1.5 rounded-full bg-[#7c5cfc]/20 text-[#a890fe] hover:bg-[#7c5cfc]/30 text-xs font-semibold border border-[#7c5cfc]/40 transition-all"
              >
                <span>View Full Forecast</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/[0.05] hover:bg-white/10 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {loading || !data ? (
            <div className="flex items-center justify-center h-64 text-slate-400 text-sm">
              Loading inventory telemetry...
            </div>
          ) : (
            <>
              {/* Metric Highlights */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-[#1c1d25] border border-white/[0.07] rounded-2xl p-4">
                  <div className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold">Current Stock</div>
                  <div className="text-xl font-bold text-white mt-1">
                    {data.current_stock}{' '}
                    <span className="text-xs font-normal text-slate-400">{data.medicine.unit}</span>
                  </div>
                  <div className="text-[10px] text-slate-400 mt-1">
                    Min: {data.min_level} | Max: {data.max_level}
                  </div>
                </div>

                <div className="bg-[#1c1d25] border border-white/[0.07] rounded-2xl p-4">
                  <div className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold">Safety Buffer</div>
                  <div className="text-xl font-bold text-[#9484f7] mt-1">
                    {data.medicine.safety_stock}{' '}
                    <span className="text-xs font-normal text-slate-400">{data.medicine.unit}</span>
                  </div>
                  <div className="text-[10px] text-slate-400 mt-1">Required buffer</div>
                </div>

                <div className="bg-[#1c1d25] border border-white/[0.07] rounded-2xl p-4">
                  <div className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold">Unit Cost</div>
                  <div className="text-xl font-bold text-white mt-1">
                    ₹{data.medicine.unit_cost.toFixed(2)}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-1">Hospital contract rate</div>
                </div>

                <div className="bg-[#1c1d25] border border-white/[0.07] rounded-2xl p-4">
                  <div className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold">Hospital Total</div>
                  <div className="text-xl font-bold text-[#a890fe] mt-1">
                    {data.hospital_distribution.reduce((acc: number, curr: any) => acc + curr.current_stock, 0)}{' '}
                    <span className="text-xs font-normal text-slate-400">{data.medicine.unit}</span>
                  </div>
                  <div className="text-[10px] text-slate-400 mt-1">Across all 5 wards</div>
                </div>
              </div>

              {/* Usage History Chart */}
              <div className="bg-[#1c1d25] border border-white/[0.07] rounded-3xl p-5 shadow-md">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                    30-Day Dispensing History ({data.ward.name})
                  </h3>
                  <span className="text-[11px] text-slate-400">Daily usage logs</span>
                </div>
                <div className="h-48 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data.usage_history}>
                      <defs>
                        <linearGradient id="usageGradientRef" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#7c5cfc" stopOpacity={0.4} />
                          <stop offset="95%" stopColor="#7c5cfc" stopOpacity={0.0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                      <XAxis dataKey="date" stroke="#64748b" tick={{ fontSize: 10 }} />
                      <YAxis stroke="#64748b" tick={{ fontSize: 10 }} />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#1c1d25', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '14px', fontSize: '11px', color: '#fff' }}
                      />
                      <Area type="monotone" dataKey="quantity_used" stroke="#7c5cfc" strokeWidth={2.5} fillOpacity={1} fill="url(#usageGradientRef)" name="Daily Usage" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Batches Table & FEFO Status */}
              <div className="bg-[#1c1d25] border border-white/[0.07] rounded-3xl p-5 shadow-md">
                <h3 className="text-xs font-bold text-white mb-3 flex items-center space-x-2 uppercase tracking-wider">
                  <Package className="w-4 h-4 text-[#9484f7]" />
                  <span>Ward Batches & Expiry (FEFO Order)</span>
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-white/[0.07] text-slate-400 text-[11px] uppercase tracking-wider">
                        <th className="pb-3 px-3 font-semibold">Batch #</th>
                        <th className="pb-3 px-3 font-semibold">Remaining Qty</th>
                        <th className="pb-3 px-3 font-semibold">Expiry Date</th>
                        <th className="pb-3 px-3 font-semibold">Days Left</th>
                        <th className="pb-3 px-3 font-semibold">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.05] text-slate-300">
                      {data.batches.map((b: any) => (
                        <tr key={b.id} className="hover:bg-white/[0.02] transition-colors">
                          <td className="py-3 px-3 font-mono text-[#a890fe] font-semibold">{b.batch_number}</td>
                          <td className="py-3 px-3 font-semibold text-white">{b.current_quantity} {data.medicine.unit}</td>
                          <td className="py-3 px-3 text-slate-300">{b.expiry_date}</td>
                          <td className="py-3 px-3">
                            <span className={b.days_to_expiry <= 30 ? 'text-rose-400 font-bold' : b.days_to_expiry <= 90 ? 'text-amber-400 font-semibold' : 'text-slate-300'}>
                              {b.days_to_expiry} days
                            </span>
                          </td>
                          <td className="py-3 px-3">
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                              b.status === 'NEAR_EXPIRY'
                                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            }`}>
                              {b.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Cross-Ward Distribution & Qualified Suppliers */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Cross-Ward */}
                <div className="bg-[#1c1d25] border border-white/[0.07] rounded-3xl p-5 shadow-md">
                  <h3 className="text-xs font-bold text-white mb-3 uppercase tracking-wider">Hospital Cross-Ward Stock</h3>
                  <div className="space-y-2">
                    {data.hospital_distribution.map((d: any) => (
                      <div key={d.ward_id} className="flex items-center justify-between text-xs py-2 border-b border-white/[0.04]">
                        <span className="text-slate-300">{d.ward_name}</span>
                        <div className="flex items-center space-x-2">
                          <span className="font-semibold text-white">{d.current_stock} {data.medicine.unit}</span>
                          {d.current_stock > d.max_level ? (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#7c5cfc]/20 text-[#a890fe] border border-[#7c5cfc]/30 font-semibold">Surplus</span>
                          ) : d.current_stock <= d.min_level ? (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 font-semibold">Low</span>
                          ) : null}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Suppliers */}
                <div className="bg-[#1c1d25] border border-white/[0.07] rounded-3xl p-5 shadow-md">
                  <h3 className="text-xs font-bold text-white mb-3 flex items-center space-x-2 uppercase tracking-wider">
                    <Truck className="w-3.5 h-3.5 text-[#9484f7]" />
                    <span>Qualified Suppliers</span>
                  </h3>
                  <div className="space-y-2">
                    {data.suppliers.map((s: any) => (
                      <div key={s.supplier_id} className="flex items-center justify-between text-xs py-2 border-b border-white/[0.04]">
                        <div>
                          <div className="text-slate-200 font-semibold">{s.supplier_name}</div>
                          <div className="text-[10px] text-slate-400">Lead: {s.lead_time_days}d | Score: {(s.reliability_score * 100).toFixed(0)}%</div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-white">₹{s.unit_price.toFixed(2)}</div>
                          <div className="text-[10px] text-slate-400">per unit</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

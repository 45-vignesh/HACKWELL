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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white border border-[#D9E8E3] rounded-[28px] w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden text-[#12332C]">
        {/* Modal Header */}
        <div className="p-6 border-b border-[#D9E8E3] flex items-center justify-between bg-[#F3FAF7]">
          {data ? (
            <div>
              <div className="flex items-center space-x-3 flex-wrap gap-y-1">
                <h2 className="text-lg font-bold text-[#12332C] tracking-tight">{data.medicine.name}</h2>
                <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                  data.medicine.criticality === 'CRITICAL'
                    ? 'bg-[#DC2626]/15 text-[#DC2626] border border-[#DC2626]/30'
                    : 'bg-[#F59E0B]/15 text-[#B45309] border border-[#F59E0B]/30'
                }`}>
                  {data.medicine.criticality}
                </span>
                <span className="text-xs text-[#647772] font-mono">Code: {data.medicine.code}</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-mono font-medium bg-[#008F83]/15 text-[#008F83] border border-[#008F83]/25">
                  Usage: {data.usage_source || 'MIMIC-Derived'}
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-mono font-medium bg-[#F59E0B]/15 text-[#B45309] border border-[#F59E0B]/25">
                  Stock: Synthetic
                </span>
                {data.risk_scenario && data.risk_scenario !== 'NORMAL' && (
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-bold ${
                    data.risk_scenario === 'LOW_STOCK'
                      ? 'bg-[#DC2626]/15 text-[#DC2626] border border-[#DC2626]/30'
                      : data.risk_scenario === 'EXPIRY_RISK'
                      ? 'bg-[#F59E0B]/15 text-[#B45309] border border-[#F59E0B]/30'
                      : 'bg-[#008F83]/15 text-[#008F83] border border-[#008F83]/30'
                  }`}>
                    Scenario: {data.risk_scenario}
                  </span>
                )}
              </div>
              <p className="text-xs text-[#647772] mt-1">
                Generic: <span className="text-[#12332C] font-medium">{data.medicine.generic_name}</span> | Ward: <span className="text-[#006B4F] font-semibold">{data.ward.name}</span>
              </p>
            </div>
          ) : (
            <div className="h-10 w-48 bg-[#D9E8E3]/50 animate-pulse rounded-full"></div>
          )}

          <div className="flex items-center space-x-2">
            {data && (
              <button
                onClick={() => {
                  onClose();
                  onNavigateToForecast(data.medicine.id);
                }}
                className="ref-pill-btn flex items-center space-x-1.5 px-4 py-1.5 rounded-full bg-[#006B4F] text-white hover:bg-[#004D3A] text-xs font-semibold shadow-sm transition-all"
              >
                <span>View Full Forecast</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-[#D9E8E3]/60 hover:bg-[#D9E8E3] text-[#647772] hover:text-[#12332C] flex items-center justify-center transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-[#F3FAF7]">
          {loading || !data ? (
            <div className="flex items-center justify-center h-64 text-[#647772] text-sm">
              Loading inventory telemetry...
            </div>
          ) : (
            <>
              {/* Metric Highlights */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white border border-[#D9E8E3] rounded-2xl p-4 shadow-sm">
                  <div className="text-[11px] text-[#647772] uppercase tracking-wider font-semibold">Current Stock</div>
                  <div className="text-xl font-bold text-[#12332C] mt-1">
                    {data.current_stock}{' '}
                    <span className="text-xs font-normal text-[#647772]">{data.medicine.unit}</span>
                  </div>
                  <div className="text-[10px] text-[#647772] mt-1">
                    Min: {data.min_level} | Max: {data.max_level}
                  </div>
                </div>

                <div className="bg-white border border-[#D9E8E3] rounded-2xl p-4 shadow-sm">
                  <div className="text-[11px] text-[#647772] uppercase tracking-wider font-semibold">Safety Buffer</div>
                  <div className="text-xl font-bold text-[#006B4F] mt-1">
                    {data.safety_stock || data.medicine.safety_stock}{' '}
                    <span className="text-xs font-normal text-[#647772]">{data.medicine.unit}</span>
                  </div>
                  <div className="text-[10px] text-[#647772] mt-1">
                    Reorder: {data.reorder_point || data.medicine.reorder_threshold} {data.medicine.unit}
                  </div>
                </div>

                <div className="bg-white border border-[#D9E8E3] rounded-2xl p-4 shadow-sm">
                  <div className="text-[11px] text-[#647772] uppercase tracking-wider font-semibold">Unit Cost</div>
                  <div className="text-xl font-bold text-[#12332C] mt-1">
                    ₹{data.medicine.unit_cost.toFixed(2)}
                  </div>
                  <div className="text-[10px] text-[#647772] mt-1">Hospital contract rate</div>
                </div>

                <div className="bg-white border border-[#D9E8E3] rounded-2xl p-4 shadow-sm">
                  <div className="text-[11px] text-[#647772] uppercase tracking-wider font-semibold">Hospital Total</div>
                  <div className="text-xl font-bold text-[#008F83] mt-1">
                    {data.hospital_distribution.reduce((acc: number, curr: any) => acc + curr.current_stock, 0)}{' '}
                    <span className="text-xs font-normal text-[#647772]">{data.medicine.unit}</span>
                  </div>
                  <div className="text-[10px] text-[#647772] mt-1">Across all 5 wards</div>
                </div>
              </div>

              {/* Usage History Chart */}
              <div className="bg-white border border-[#D9E8E3] rounded-3xl p-5 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xs font-bold text-[#12332C] uppercase tracking-wider">
                    30-Day Dispensing History ({data.ward.name})
                  </h3>
                  <span className="text-[11px] text-[#647772]">Daily usage logs</span>
                </div>
                <div className="h-48 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data.usage_history}>
                      <defs>
                        <linearGradient id="usageGradientRef" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#008F83" stopOpacity={0.35} />
                          <stop offset="95%" stopColor="#008F83" stopOpacity={0.0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#D9E8E3" />
                      <XAxis dataKey="date" stroke="#647772" tick={{ fontSize: 10 }} />
                      <YAxis stroke="#647772" tick={{ fontSize: 10 }} />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#FFFFFF', borderColor: '#D9E8E3', borderRadius: '14px', fontSize: '11px', color: '#12332C' }}
                      />
                      <Area type="monotone" dataKey="quantity_used" stroke="#006B4F" strokeWidth={2.5} fillOpacity={1} fill="url(#usageGradientRef)" name="Daily Usage" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Batches Table & FEFO Status */}
              <div className="bg-white border border-[#D9E8E3] rounded-3xl p-5 shadow-sm">
                <h3 className="text-xs font-bold text-[#12332C] mb-3 flex items-center space-x-2 uppercase tracking-wider">
                  <Package className="w-4 h-4 text-[#006B4F]" />
                  <span>Ward Batches & Expiry (FEFO Order)</span>
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-[#D9E8E3] text-[#647772] text-[11px] uppercase tracking-wider bg-[#F3FAF7]/50">
                        <th className="py-2.5 px-3 font-semibold">Batch #</th>
                        <th className="py-2.5 px-3 font-semibold">Remaining Qty</th>
                        <th className="py-2.5 px-3 font-semibold">Expiry Date</th>
                        <th className="py-2.5 px-3 font-semibold">Days Left</th>
                        <th className="py-2.5 px-3 font-semibold">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#D9E8E3] text-[#12332C]">
                      {data.batches.map((b: any) => (
                        <tr key={b.id} className="hover:bg-[#F3FAF7]/80 transition-colors">
                          <td className="py-3 px-3 font-mono text-[#006B4F] font-semibold">{b.batch_number}</td>
                          <td className="py-3 px-3 font-semibold text-[#12332C]">{b.current_quantity} {data.medicine.unit}</td>
                          <td className="py-3 px-3 text-[#647772] font-mono">{b.expiry_date}</td>
                          <td className="py-3 px-3">
                            <span className={b.days_to_expiry <= 30 ? 'text-[#DC2626] font-bold' : b.days_to_expiry <= 90 ? 'text-[#B45309] font-semibold' : 'text-[#12332C]'}>
                              {b.days_to_expiry} days
                            </span>
                          </td>
                          <td className="py-3 px-3">
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                              b.status === 'NEAR_EXPIRY'
                                ? 'bg-[#F59E0B]/15 text-[#B45309] border border-[#F59E0B]/30'
                                : 'bg-[#16A34A]/15 text-[#16A34A] border border-[#16A34A]/30'
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
                <div className="bg-white border border-[#D9E8E3] rounded-3xl p-5 shadow-sm">
                  <h3 className="text-xs font-bold text-[#12332C] mb-3 uppercase tracking-wider">Hospital Cross-Ward Stock</h3>
                  <div className="space-y-2">
                    {data.hospital_distribution.map((d: any) => (
                      <div key={d.ward_id} className="flex items-center justify-between text-xs py-2 border-b border-[#D9E8E3]">
                        <span className="text-[#647772]">{d.ward_name}</span>
                        <div className="flex items-center space-x-2">
                          <span className="font-semibold text-[#12332C]">{d.current_stock} {data.medicine.unit}</span>
                          {d.current_stock > d.max_level ? (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#008F83]/15 text-[#008F83] border border-[#008F83]/30 font-semibold">Surplus</span>
                          ) : d.current_stock <= d.min_level ? (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#DC2626]/15 text-[#DC2626] border border-[#DC2626]/30 font-semibold">Low</span>
                          ) : null}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Suppliers */}
                <div className="bg-white border border-[#D9E8E3] rounded-3xl p-5 shadow-sm">
                  <h3 className="text-xs font-bold text-[#12332C] mb-3 flex items-center space-x-2 uppercase tracking-wider">
                    <Truck className="w-3.5 h-3.5 text-[#006B4F]" />
                    <span>Qualified Suppliers</span>
                  </h3>
                  <div className="space-y-2">
                    {data.suppliers.map((s: any) => (
                      <div key={s.supplier_id} className="flex items-center justify-between text-xs py-2 border-b border-[#D9E8E3]">
                        <div>
                          <div className="text-[#12332C] font-semibold">{s.supplier_name}</div>
                          <div className="text-[10px] text-[#647772]">Lead: {s.lead_time_days}d | Score: {(s.reliability_score * 100).toFixed(0)}%</div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-[#006B4F]">₹{s.unit_price.toFixed(2)}</div>
                          <div className="text-[10px] text-[#647772]">per unit</div>
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

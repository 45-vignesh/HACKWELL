import React, { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, ShieldCheck, DollarSign, Clock, RefreshCw } from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  LineChart,
  Line,
  Legend
} from 'recharts';
import { api } from '../services/api';

export const AnalyticsPage: React.FC = () => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getAnalytics()
      .then((res) => setData(res))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto text-[#12332C]">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-2xl bg-[#006B4F]/15 border border-[#006B4F]/30 flex items-center justify-center text-[#006B4F]">
              <BarChart3 className="w-4 h-4" />
            </div>
            <h1 className="text-xl font-bold text-[#12332C] tracking-tight">
              Pilot Performance Targets & System Analytics
            </h1>
          </div>
          <p className="text-xs text-[#647772] mt-1 pl-11">
            Empirical validation against Hackwell 2.0 MediSentinel specification targets
          </p>
        </div>
      </div>

      {loading || !data ? (
        <div className="h-64 flex items-center justify-center text-[#647772] text-sm">
          Loading analytics telemetry...
        </div>
      ) : (
        <>
          {/* Target Pilot KPIs */}
          <div className="bg-white border border-[#D9E8E3] rounded-3xl p-6 shadow-sm space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <div className="flex items-center space-x-2.5">
                  <h3 className="text-sm font-bold text-[#12332C]">Pilot Targets (To Be Validated)</h3>
                  <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-[#006B4F]/15 text-[#006B4F] border border-[#006B4F]/30 uppercase font-bold tracking-wider">
                    Specification Benchmarks
                  </span>
                </div>
                <p className="text-xs text-[#647772] mt-0.5">
                  Extracted directly from Section 05 of the primary MediSentinel product specification
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-[#F3FAF7] border border-[#D9E8E3] rounded-2xl p-5 shadow-sm">
                <div className="text-[11px] text-[#647772] uppercase tracking-wider font-semibold">Fewer Critical Stock-Outs</div>
                <div className="text-3xl font-extrabold text-[#006B4F] mt-2 tracking-tight">
                  {data.pilot_targets.stockout_reduction.target}
                </div>
                <div className="text-xs text-[#16A34A] mt-1 font-semibold">
                  Simulation Current: {data.pilot_targets.stockout_reduction.current_model}
                </div>
              </div>

              <div className="bg-[#F3FAF7] border border-[#D9E8E3] rounded-2xl p-5 shadow-sm">
                <div className="text-[11px] text-[#647772] uppercase tracking-wider font-semibold">Less Expiry Wastage</div>
                <div className="text-3xl font-extrabold text-[#008F83] mt-2 tracking-tight">
                  {data.pilot_targets.waste_reduction.target}
                </div>
                <div className="text-xs text-[#16A34A] mt-1 font-semibold">
                  Simulation Current: {data.pilot_targets.waste_reduction.current_model}
                </div>
              </div>

              <div className="bg-[#F3FAF7] border border-[#D9E8E3] rounded-2xl p-5 shadow-sm">
                <div className="text-[11px] text-[#647772] uppercase tracking-wider font-semibold">Forecast Error (MAPE)</div>
                <div className="text-3xl font-extrabold text-[#16A34A] mt-2 tracking-tight">
                  {data.pilot_targets.forecast_mape.target}
                </div>
                <div className="text-xs text-[#16A34A] mt-1 font-semibold">
                  Simulation Current: {data.pilot_targets.forecast_mape.current_model} (Achieved)
                </div>
              </div>

              <div className="bg-[#F3FAF7] border border-[#D9E8E3] rounded-2xl p-5 shadow-sm">
                <div className="text-[11px] text-[#647772] uppercase tracking-wider font-semibold">Less Manual Ordering Time</div>
                <div className="text-3xl font-extrabold text-[#006B4F] mt-2 tracking-tight">
                  {data.pilot_targets.manual_ordering_time_saved.target}
                </div>
                <div className="text-xs text-[#16A34A] mt-1 font-semibold">
                  Simulation Current: {data.pilot_targets.manual_ordering_time_saved.current_model} (Achieved)
                </div>
              </div>
            </div>
          </div>

          {/* Monthly Trajectory Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white border border-[#D9E8E3] rounded-3xl p-6 shadow-sm">
              <h3 className="text-sm font-bold text-[#12332C] tracking-tight">Prevented Shortages & Autonomous Transfers</h3>
              <p className="text-[11px] text-[#647772] mb-4">Cumulative monthly operational milestones</p>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.monthly_trend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#D9E8E3" />
                    <XAxis dataKey="month" stroke="#647772" tick={{ fontSize: 11 }} />
                    <YAxis stroke="#647772" tick={{ fontSize: 11 }} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#FFFFFF', borderColor: '#D9E8E3', borderRadius: '16px', fontSize: '11px', color: '#12332C' }}
                    />
                    <Legend wrapperStyle={{ fontSize: '11px' }} />
                    <Bar dataKey="prevented_stockouts" fill="#006B4F" name="Prevented Stock-Outs" radius={[6, 6, 0, 0]} />
                    <Bar dataKey="transfers" fill="#008F83" name="Inter-Ward Transfers" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white border border-[#D9E8E3] rounded-3xl p-6 shadow-sm">
              <h3 className="text-sm font-bold text-[#12332C] tracking-tight">Expiry Loss Mitigated (₹ INR)</h3>
              <p className="text-[11px] text-[#647772] mb-4">Financial value saved via FEFO redistribution</p>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data.monthly_trend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#D9E8E3" />
                    <XAxis dataKey="month" stroke="#647772" tick={{ fontSize: 11 }} />
                    <YAxis stroke="#647772" tick={{ fontSize: 11 }} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#FFFFFF', borderColor: '#D9E8E3', borderRadius: '16px', fontSize: '11px', color: '#12332C' }}
                    />
                    <Line type="monotone" dataKey="waste_saved_inr" stroke="#16A34A" strokeWidth={3} dot={{ r: 4, fill: '#16A34A' }} name="Waste Value Saved (₹)" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { TrendingUp, Info, Activity, AlertCircle, Database } from 'lucide-react';
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid
} from 'recharts';
import { ForecastData } from '../types';
import { api } from '../services/api';

interface ForecastPageProps {
  initialMedicineId?: number;
}

export const ForecastPage: React.FC<ForecastPageProps> = ({ initialMedicineId }) => {
  const [data, setData] = useState<ForecastData | null>(null);
  const [loading, setLoading] = useState(true);
  const [horizon, setHorizon] = useState<number>(14);
  const [medicineId, setMedicineId] = useState<number>(initialMedicineId || 1);
  const [allMedicines, setAllMedicines] = useState<Array<{ id: number; name: string; code: string; ward: string }>>([]);

  // Fetch available medicines dynamically from inventory
  useEffect(() => {
    api.getInventory().then((items) => {
      if (items && items.length > 0) {
        // Unique medicines by ID
        const seen = new Set<number>();
        const list: Array<{ id: number; name: string; code: string; ward: string }> = [];
        for (const item of items) {
          if (!seen.has(item.medicine_id)) {
            seen.add(item.medicine_id);
            list.push({
              id: item.medicine_id,
              name: item.medicine_name,
              code: item.medicine_code,
              ward: item.ward_name
            });
          }
        }
        setAllMedicines(list);
      }
    }).catch((err) => console.error('Failed to load medicines list:', err));
  }, []);

  const loadForecast = async () => {
    setLoading(true);
    try {
      const res = await api.getForecast(medicineId, undefined, horizon);
      setData(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadForecast();
  }, [medicineId, horizon]);

  return (
    <div className="p-6 space-y-5">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center space-x-2">
            <TrendingUp className="w-5 h-5 text-ref-purple" />
            <span>Demand Forecasting & Stock-Out Projection</span>
          </h1>
          <p className="text-xs text-zinc-400 mt-0.5 flex items-center space-x-2">
            <span>Machine Learning Time-Series Engine (Prophet / Holt-Winters Seasonal Model)</span>
            <span className="text-zinc-600">•</span>
            <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-mono text-[10px] border border-emerald-500/20">
              Usage: {data?.usage_source || 'MIMIC-Derived (Historical)'}
            </span>
          </p>
        </div>

        {/* Controls */}
        <div className="flex items-center space-x-3">
          <select
            value={medicineId}
            onChange={(e) => setMedicineId(Number(e.target.value))}
            className="bg-[#1c1d25] border border-white/[0.08] text-zinc-200 text-xs rounded-full px-4 py-2 focus:outline-none focus:border-ref-purple font-medium cursor-pointer max-w-[320px] truncate"
          >
            {allMedicines.length > 0 ? (
              allMedicines.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} ({m.code})
                </option>
              ))
            ) : (
              <option value={1}>Normal Saline 0.9% (500ml)</option>
            )}
          </select>

          <div className="bg-[#1c1d25] border border-white/[0.06] rounded-full p-1 flex space-x-1 text-xs">
            {[7, 14, 30].map((h) => (
              <button
                key={h}
                onClick={() => setHorizon(h)}
                className={`px-3.5 py-1 rounded-full font-mono text-xs transition-all ${
                  horizon === h
                    ? 'bg-ref-purple text-white font-bold shadow-glow-purple-sm'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                {h}D
              </button>
            ))}
          </div>
        </div>
      </div>

      {loading || !data ? (
        <div className="h-96 flex items-center justify-center text-zinc-500 text-sm">
          Computing ML forecasting curves and confidence bands...
        </div>
      ) : data.data_status === 'insufficient_historical_data' ? (
        <div className="ref-card p-8 text-center space-y-3 border-amber-500/30">
          <div className="w-12 h-12 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mx-auto">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-white">Insufficient Historical Data</h3>
          <p className="text-xs text-zinc-400 max-w-md mx-auto">
            Fewer than 7 observed historical medication administration records are available for this formulary.
            To maintain medical accuracy, no fabricated predictions are generated.
          </p>
          <div className="text-[11px] font-mono text-zinc-500 pt-2">
            Status: Insufficient historical data • Model accuracy: Not available
          </div>
        </div>
      ) : (
        <>
          {/* Key Metric Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className={`ref-card p-4.5 ${
              data.risk_level === 'HIGH' ? 'border-rose-500/30' : 'border-white/[0.06]'
            }`}>
              <div className="text-[11px] text-zinc-400 uppercase tracking-wider font-mono">Estimated Stockout</div>
              <div className={`text-2xl font-bold mt-1 ${
                data.risk_level === 'HIGH' ? 'text-rose-400' : data.risk_level === 'MEDIUM' ? 'text-amber-400' : 'text-emerald-400'
              }`}>
                {data.estimated_stockout_days ? `${data.estimated_stockout_days} Days` : 'Healthy Buffer'}
              </div>
              <div className="text-[10px] text-zinc-400 mt-1 font-mono">
                Projected Exhaustion: {data.estimated_stockout_date || 'Stable'}
              </div>
            </div>

            <div className="ref-card p-4.5 border-white/[0.06]">
              <div className="text-[11px] text-zinc-400 uppercase tracking-wider font-mono">Expected Daily Burn</div>
              <div className="text-2xl font-bold text-white mt-1">
                {data.expected_daily_demand} <span className="text-xs font-normal text-zinc-400">units/day</span>
              </div>
              <div className="text-[10px] text-zinc-400 mt-1 font-mono">
                Total {horizon}d Demand: {data.total_predicted_demand} units
              </div>
            </div>

            <div className="ref-card p-4.5 border-white/[0.06]">
              <div className="text-[11px] text-zinc-400 uppercase tracking-wider font-mono">Current Reserve</div>
              <div className="text-2xl font-bold text-ref-purpleLight mt-1">
                {data.current_stock} <span className="text-xs font-normal text-zinc-400">units</span>
              </div>
              <div className="text-[10px] text-zinc-400 mt-1 font-mono">
                Location: {data.ward_name} (Synthetic Stock)
              </div>
            </div>

            <div className="ref-card p-4.5 border-white/[0.06]">
              <div className="text-[11px] text-zinc-400 uppercase tracking-wider font-mono">Model Accuracy & Validation</div>
              <div className="text-2xl font-bold text-emerald-400 mt-1">
                {data.mape_score !== null && data.mape_score !== undefined
                  ? `${(100 - Math.min(40, data.mape_score)).toFixed(0)}%`
                  : 'Not available'}
              </div>
              <div className="text-[10px] text-zinc-400 mt-1 font-mono">
                MAPE: {data.mape_score !== null && data.mape_score !== undefined ? `${data.mape_score}%` : 'Not available'}
                {data.mae_score !== null && data.mae_score !== undefined && ` • MAE: ${data.mae_score}`}
                {data.rmse_score !== null && data.rmse_score !== undefined && ` • RMSE: ${data.rmse_score}`}
              </div>
            </div>
          </div>

          {/* Main Visual Chart Card */}
          <div className="ref-card p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                  <Activity className="w-4 h-4 text-ref-purple" />
                  <span>Demand Trajectory & Depletion Curve ({data.medicine_name})</span>
                </h3>
                <p className="text-[11px] text-zinc-400 mt-0.5">
                  Historical burn &rarr; ML predicted demand envelope &rarr; Depletion timeline
                </p>
              </div>

              <div className="flex items-center space-x-4 text-xs font-mono">
                <span className="flex items-center space-x-1.5 text-ref-purple">
                  <span className="w-3 h-0.5 bg-ref-purple"></span>
                  <span>Predicted Demand</span>
                </span>
                <span className="flex items-center space-x-1.5 text-cyan-400">
                  <span className="w-3 h-0.5 bg-cyan-400"></span>
                  <span>Projected Stock</span>
                </span>
                <span className="flex items-center space-x-1.5 text-zinc-500">
                  <span className="w-3 h-2 bg-ref-purple/20"></span>
                  <span>Confidence Envelope</span>
                </span>
              </div>
            </div>

            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={data.forecast_points}>
                  <defs>
                    <linearGradient id="forecastPurpleGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#7c5cfc" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#7c5cfc" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#282936" />
                  <XAxis dataKey="date" stroke="#64748b" tick={{ fontSize: 10 }} />
                  <YAxis yAxisId="left" stroke="#64748b" tick={{ fontSize: 10 }} />
                  <YAxis yAxisId="right" orientation="right" stroke="#64748b" tick={{ fontSize: 10 }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1c1d25', borderColor: '#334155', borderRadius: '12px', fontSize: '11px', color: '#fff' }}
                  />
                  <Area yAxisId="left" type="monotone" dataKey="upper_bound" stroke="none" fill="url(#forecastPurpleGrad)" name="Upper Bound" />
                  <Line yAxisId="left" type="monotone" dataKey="predicted" stroke="#7c5cfc" strokeWidth={2.5} dot={{ r: 3 }} name="Predicted Demand" />
                  <Line yAxisId="right" type="monotone" dataKey="projected_stock" stroke="#06b6d4" strokeWidth={2} strokeDasharray="4 4" dot={{ r: 2 }} name="Projected Stock" />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Explainability Breakdown Card */}
          <div className="ref-card p-5 flex items-start space-x-4">
            <div className="w-8 h-8 rounded-full bg-ref-purple/20 border border-ref-purple/30 flex items-center justify-center text-ref-purpleLight shrink-0 mt-0.5">
              <Info className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono">Agent Reasoning & Empirical Validation</h4>
              <p className="text-xs text-zinc-300 mt-1 leading-relaxed">{data.reasoning}</p>
              <div className="flex flex-wrap items-center gap-3 mt-2.5 text-[11px] font-mono text-zinc-400">
                <span>Model: <strong className="text-ref-purpleLight">{data.model_used}</strong></span>
                <span>•</span>
                <span>MAPE: <strong className="text-emerald-400">{data.mape_score !== null && data.mape_score !== undefined ? `${data.mape_score}%` : 'Not available'}</strong></span>
                <span>•</span>
                <span>MAE: <strong className="text-cyan-400">{data.mae_score !== null && data.mae_score !== undefined ? `${data.mae_score}` : 'Not available'}</strong></span>
                <span>•</span>
                <span>RMSE: <strong className="text-cyan-400">{data.rmse_score !== null && data.rmse_score !== undefined ? `${data.rmse_score}` : 'Not available'}</strong></span>
                <span>•</span>
                <span>Source: <strong className="text-emerald-400">{data.usage_source || 'MIMIC-Derived'}</strong></span>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

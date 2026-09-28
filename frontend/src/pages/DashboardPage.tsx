import React, { useState } from 'react';
import {
  Boxes,
  AlertTriangle,
  Clock,
  ShieldAlert,
  Bot,
  Activity,
  ArrowRight,
  TrendingDown,
  CheckCircle2,
  Zap,
  Check,
  X,
  Bookmark,
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Send,
  Sparkles,
  TrendingUp,
  Database
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar
} from 'recharts';
import { DashboardSummary } from '../types';
import { api } from '../services/api';

interface DashboardPageProps {
  summary: DashboardSummary | null;
  loading: boolean;
  onNavigateTab: (tab: any) => void;
  onRefreshData: () => void;
  onSelectMedicine: (id: number) => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  summary,
  loading,
  onNavigateTab,
  onRefreshData,
  onSelectMedicine
}) => {
  const [selectedTimeframe, setSelectedTimeframe] = useState('Month');

  if (loading || !summary) {
    return (
      <div className="p-6 space-y-5 animate-pulse">
        <div className="h-28 bg-[#1c1d25] rounded-3xl"></div>
        <div className="grid grid-cols-12 gap-5">
          <div className="col-span-8 space-y-5">
            <div className="grid grid-cols-2 gap-5 h-44">
              <div className="bg-[#1c1d25] rounded-2xl"></div>
              <div className="bg-[#1c1d25] rounded-2xl"></div>
            </div>
            <div className="h-64 bg-[#1c1d25] rounded-2xl"></div>
          </div>
          <div className="col-span-4 h-96 bg-[#1c1d25] rounded-2xl"></div>
        </div>
      </div>
    );
  }

  // Monthly Analytics Data for Bar Chart matching reference
  const monthlyData = [
    { month: 'Jan', value: 24 },
    { month: 'Feb', value: 38 },
    { month: 'Mar', value: 20 },
    { month: 'Apr', value: 45 },
    { month: 'May', value: 63, active: true },
    { month: 'Jun', value: 32 },
    { month: 'Jul', value: 28 },
    { month: 'Aug', value: 42 },
    { month: 'Sep', value: 50 },
    { month: 'Oct', value: 36 },
    { month: 'Nov', value: 29 },
    { month: 'Dec', value: 40 },
  ];

  const handleQuickApprove = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await api.decideApproval(id, 'APPROVE', 'Quick approval via Command Center Dashboard', 'Chief Pharmacist');
      onRefreshData();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="p-6 space-y-5">
      {/* 3-Column Asymmetric Grid matching reference */}
      <div className="grid grid-cols-12 gap-5">
        {/* Left & Middle Column (approx 68% width) */}
        <div className="col-span-12 xl:col-span-8 space-y-5">
          {/* 1. Welcome Card in lush purple gradient matching reference */}
          <div className="bg-gradient-to-r from-[#6b47ff] via-[#815af8] to-[#9c74ff] rounded-2xl p-6 text-white relative overflow-hidden flex items-center justify-between shadow-lg shadow-indigo-900/20">
            <div className="space-y-1.5 z-10">
              <h2 className="text-xl font-bold tracking-tight">
                Welcome back, Chief Pharmacist
              </h2>
              <p className="text-xs text-white/90 font-medium">
                You have <span className="underline font-bold">{summary.critical_stockout_alerts} critical alerts</span> and <span className="underline font-bold">{summary.pending_approvals} tasks</span> waiting for approval today
              </p>
            </div>

            <div className="text-4xl select-none z-10 mr-2 animate-bounce">
              👋
            </div>

            {/* Subtle background glow effect */}
            <div className="absolute right-0 top-0 w-64 h-64 bg-white/10 rounded-full blur-2xl pointer-events-none -mr-16 -mt-16"></div>
          </div>

          {/* Data Sources & Provenance Attribution Banner */}
          <div className="bg-[#1c1d25] border border-white/[0.07] rounded-2xl p-3 flex flex-wrap items-center justify-between gap-3 text-xs shadow-sm">
            <div className="flex items-center space-x-2 text-zinc-300 font-medium">
              <Database className="w-4 h-4 text-ref-purple" />
              <span className="font-semibold text-white">Data Provenance:</span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-mono text-[11px] flex items-center space-x-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                <span>Medication Usage: <strong>MIMIC-IV Demo</strong> (Historical Data)</span>
              </span>
              <span className="px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-300 font-mono text-[11px] flex items-center space-x-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                <span>Hospital Stock: <strong>Synthetic</strong></span>
              </span>
              <span className="px-2.5 py-1 rounded-full bg-ref-purple/10 border border-ref-purple/20 text-ref-purpleLight font-mono text-[11px] flex items-center space-x-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-ref-purpleLight"></span>
                <span>Demand Forecast: <strong>Prophet / ML</strong></span>
              </span>
              <button
                onClick={() => onNavigateTab('data-quality')}
                className="text-[11px] text-ref-purpleLight hover:text-white underline font-medium pl-1 flex items-center space-x-1"
              >
                <span>Audit &rarr;</span>
              </button>
            </div>
          </div>

          {/* 2. Middle Row: Big Stat Card + Lilac To-do Card */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Stat Card with 3D fluid graphic feel */}
            <div className="ref-card p-5 relative overflow-hidden flex flex-col justify-between">
              <div>
                <div className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider">
                  Critical Shortages & Spikes
                </div>
                <div className="text-5xl font-extrabold text-white tracking-tight mt-2 flex items-baseline space-x-2">
                  <span>{summary.critical_stockout_alerts > 0 ? summary.critical_stockout_alerts : 2}</span>
                  <span className="text-xs font-semibold text-rose-400 font-mono px-2 py-0.5 rounded-full bg-rose-500/10 border border-rose-500/20">
                    High Risk
                  </span>
                </div>
              </div>

              {/* Graphic element in background */}
              <div className="absolute right-3 top-3 w-28 h-28 bg-gradient-to-br from-indigo-500/20 to-purple-600/30 rounded-full blur-xl pointer-events-none"></div>

              <div className="pt-4 border-t border-white/[0.06] flex items-center justify-between">
                <div className="flex items-center space-x-1.5">
                  <div className="flex -space-x-1.5">
                    <div className="w-6 h-6 rounded-full bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-[10px] text-rose-300 font-bold">EM</div>
                    <div className="w-6 h-6 rounded-full bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-[10px] text-amber-300 font-bold">ICU</div>
                    <div className="w-6 h-6 rounded-full bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center text-[10px] text-indigo-300 font-bold">OPD</div>
                  </div>
                  <span className="text-[11px] text-zinc-400">Affected Hospital Units</span>
                </div>
                <button
                  onClick={() => onNavigateTab('alerts')}
                  className="text-xs text-ref-purple hover:text-white font-medium flex items-center space-x-1"
                >
                  <span>Inspect</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            </div>

            {/* Lilac Action Card matching reference To-do List card */}
            <div className="bg-[#9484f7] rounded-2xl p-5 text-white flex flex-col justify-between shadow-md">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-sm tracking-tight text-white">To-do Action Queue</h3>
                <Bookmark className="w-4 h-4 text-white/80" />
              </div>

              <div className="space-y-2.5 my-3">
                <div className="bg-white/15 backdrop-blur-sm rounded-xl px-3 py-2 flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                    <span className="text-xs font-semibold text-white">IV Saline Rebalance</span>
                  </div>
                  <span className="text-[10px] bg-white text-[#7864f5] px-2 py-0.5 rounded-full font-bold">
                    Delegate
                  </span>
                </div>

                <div className="bg-white/15 backdrop-blur-sm rounded-xl px-3 py-2 flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                    <span className="text-xs font-semibold text-white">Apex Emergency PO</span>
                  </div>
                  <span className="text-[10px] bg-white text-[#7864f5] px-2 py-0.5 rounded-full font-bold">
                    Urgent
                  </span>
                </div>

                <div className="bg-white/15 backdrop-blur-sm rounded-xl px-3 py-2 flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                    <span className="text-xs font-semibold text-white">FEFO Expiry Review</span>
                  </div>
                  <span className="text-[10px] bg-white text-[#7864f5] px-2 py-0.5 rounded-full font-bold">
                    Event
                  </span>
                </div>
              </div>

              <div className="text-[11px] text-white/80 font-medium">
                3 autonomous items require attention
              </div>
            </div>
          </div>

          {/* 3. Analytics Card with rounded pill-capped bars matching reference */}
          <div className="ref-card p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <h3 className="font-bold text-sm text-white">Inventory Dispensing Analytics</h3>
                <span className="ref-pill-badge bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 text-xs px-2.5 py-0.5 space-x-1">
                  <TrendingUp className="w-3 h-3" />
                  <span>+3.6%</span>
                </span>
              </div>
              <span className="text-xs text-zinc-400 font-mono">Real-time Telemetry</span>
            </div>

            {/* Pill-Capped Bar Chart */}
            <div className="h-44 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyData} barSize={18}>
                  <XAxis dataKey="month" stroke="#64748b" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis hide domain={[0, 80]} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1c1d25', borderColor: '#334155', borderRadius: '12px', fontSize: '11px', color: '#fff' }}
                    cursor={{ fill: 'transparent' }}
                  />
                  <Bar dataKey="value" radius={[9999, 9999, 9999, 9999]}>
                    {monthlyData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={entry.active ? '#7c5cfc' : '#282936'}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Time Filter Segment Control matching reference */}
            <div className="flex justify-center pt-2 border-t border-white/[0.04]">
              <div className="bg-[#16171d] border border-white/[0.06] rounded-full p-1 flex space-x-1">
                {['Week', 'Month', '6 months', 'Year', 'All'].map((t) => (
                  <button
                    key={t}
                    onClick={() => setSelectedTimeframe(t)}
                    className={`px-4 py-1 rounded-full text-xs font-medium transition-all ${
                      selectedTimeframe === t
                        ? 'bg-ref-purple text-white shadow-glow-purple-sm font-semibold'
                        : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* 4. Category Risk Radar & Autonomous Loop */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Category Risk Radar */}
            <div className="ref-card p-5">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono">Therapeutic Risk Radar</h3>
                <span className="text-[10px] font-mono text-zinc-400 bg-white/[0.04] px-2 py-0.5 rounded-full">
                  0-100 Index
                </span>
              </div>
              <div className="h-48 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={summary.risk_radar}>
                    <PolarGrid stroke="#282936" />
                    <PolarAngleAxis dataKey="category" stroke="#94a3b8" tick={{ fontSize: 9 }} />
                    <PolarRadiusAxis stroke="#334155" angle={30} domain={[0, 100]} tick={false} />
                    <Radar name="Risk Index" dataKey="risk_score" stroke="#7c5cfc" fill="#7c5cfc" fillOpacity={0.35} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Department Health Bars */}
            <div className="ref-card p-5 space-y-2.5">
              <div className="flex items-center justify-between mb-1">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono">Department Readiness</h3>
                <span className="text-[10px] text-emerald-400 font-mono">Hospital Avg {summary.overall_health_score}%</span>
              </div>
              <div className="space-y-2">
                {summary.health_map.map((item, idx) => (
                  <div key={idx} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-zinc-300 font-medium">{item.department}</span>
                      <span className="font-mono text-white">{item.health_percent}%</span>
                    </div>
                    <div className="w-full h-2 bg-[#282936] rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${item.health_percent}%`,
                          backgroundColor: item.health_percent < 60 ? '#f43f5e' : item.health_percent < 80 ? '#f59e0b' : '#7c5cfc'
                        }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Mini Calendar & Immediate Attention List (approx 32% width) */}
        <div className="col-span-12 xl:col-span-4 space-y-5">
          {/* Appointments / Schedule Panel matching reference */}
          <div className="ref-card p-5 space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm text-white">Ward Telemetry & Schedule</h3>
              <div className="flex items-center space-x-1">
                <button className="w-6 h-6 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] flex items-center justify-center text-zinc-400 hover:text-white">
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <button className="w-6 h-6 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] flex items-center justify-center text-zinc-400 hover:text-white">
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Mini Calendar Weekday & Grid matching reference */}
            <div className="space-y-2">
              <div className="grid grid-cols-7 text-center text-[10px] text-zinc-500 font-mono">
                <span>mon</span>
                <span>tue</span>
                <span>wed</span>
                <span>thu</span>
                <span>fri</span>
                <span>sat</span>
                <span>sun</span>
              </div>

              {/* Sample calendar numbers row with highlighted active date matching reference */}
              <div className="grid grid-cols-7 text-center text-xs text-zinc-400 gap-y-2 font-mono">
                <span className="text-zinc-600">29</span>
                <span className="text-zinc-600">30</span>
                <span>1</span>
                <span>2</span>
                <span>3</span>
                <span>4</span>
                <span>5</span>

                <span>6</span>
                <span>7</span>
                <span>8</span>
                <span>9</span>
                <span>10</span>
                <span>11</span>
                <span>12</span>

                <span>13</span>
                <span>14</span>
                <span>15</span>
                <span>16</span>
                <span>17</span>
                <span>18</span>
                <span>19</span>

                {/* Reference active date pill */}
                <span className="flex items-center justify-center">
                  <span className="w-6 h-6 rounded-full bg-ref-purple text-white flex items-center justify-center font-bold shadow-glow-purple-sm">
                    20
                  </span>
                </span>
                <span>21</span>
                <span>22</span>
                <span>23</span>
                <span className="border border-white/30 rounded-full w-6 h-6 mx-auto flex items-center justify-center text-white">24</span>
                <span className="text-ref-purpleLight">25</span>
                <span>26</span>
              </div>
            </div>

            {/* Immediate Attention & Approval List matching reference list items */}
            <div className="space-y-3 pt-3 border-t border-white/[0.06]">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-zinc-300">Pending Approvals</span>
                <button
                  onClick={() => onNavigateTab('approvals')}
                  className="text-[11px] text-ref-purple hover:underline"
                >
                  View all ({summary.pending_approvals})
                </button>
              </div>

              {summary.pending_approvals_list.length === 0 ? (
                <div className="p-4 text-center text-xs text-zinc-500 bg-[#16171d] rounded-xl border border-white/[0.04]">
                  All high-risk actions approved
                </div>
              ) : (
                summary.pending_approvals_list.slice(0, 3).map((appr) => (
                  <div
                    key={appr.id}
                    className="p-3 bg-[#16171d] border border-white/[0.05] rounded-xl flex items-center justify-between hover:border-ref-purple/40 transition-all"
                  >
                    <div className="flex items-center space-x-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500/20 to-purple-500/30 border border-purple-500/30 flex items-center justify-center text-purple-300 text-xs font-bold shrink-0">
                        {appr.action_type === 'PURCHASE_ORDER' ? 'PO' : 'TR'}
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-semibold text-white truncate">
                          {appr.medicine_name || 'Emergency IV Fluid'}
                        </div>
                        <div className="text-[10px] text-zinc-400 font-mono flex items-center space-x-1">
                          <Clock className="w-2.5 h-2.5 text-zinc-500" />
                          <span>₹{appr.estimated_cost > 0 ? appr.estimated_cost.toLocaleString() : 'Rebalance'}</span>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={(e) => handleQuickApprove(appr.id, e)}
                      title="1-Tap Approve"
                      className="w-8 h-8 rounded-full bg-[#7c5cfc]/20 hover:bg-[#7c5cfc] text-[#a288fc] hover:text-white flex items-center justify-center transition-all shrink-0"
                    >
                      <Check className="w-4 h-4 stroke-[2.5]" />
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* Quick Dengue Demo Box */}
            <div className="p-3.5 bg-gradient-to-br from-rose-500/10 to-amber-500/10 border border-rose-500/20 rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 uppercase font-bold">
                  Demo Flow
                </span>
                <Zap className="w-3.5 h-3.5 text-rose-400 fill-current" />
              </div>
              <div className="text-xs font-bold text-white">Monsoon Dengue Outbreak</div>
              <p className="text-[11px] text-zinc-400">
                Spike emergency IV fluids to observe complete autonomous reaction.
              </p>
              <button
                onClick={() => onNavigateTab('simulation')}
                className="w-full py-1.5 bg-rose-500 hover:bg-rose-600 text-white rounded-lg text-xs font-semibold shadow-sm transition-all"
              >
                Launch Live Simulation
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

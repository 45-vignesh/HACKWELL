import React, { useState, useEffect } from 'react';
import { History, ShieldCheck, RefreshCw } from 'lucide-react';
import { api } from '../services/api';

export const AuditLogPage: React.FC = () => {
  const [runs, setRuns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadRuns = async () => {
    setLoading(true);
    try {
      const data = await api.getAgentRuns();
      setRuns(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRuns();
  }, []);

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-2xl bg-[#7c5cfc]/15 border border-[#7c5cfc]/30 flex items-center justify-center text-[#9484f7]">
              <History className="w-4 h-4" />
            </div>
            <h1 className="text-xl font-bold text-white tracking-tight">
              Autonomous System Audit Trail & Governance Ledger
            </h1>
          </div>
          <p className="text-xs text-slate-400 mt-1 pl-11">
            Immutable log of all autonomous agent decisions, pharmacist approvals, and physical stock transfers
          </p>
        </div>

        <button
          onClick={loadRuns}
          className="w-9 h-9 rounded-full bg-[#1c1d25] border border-white/[0.07] text-slate-300 hover:text-white hover:border-white/20 flex items-center justify-center transition-all self-start"
          title="Refresh audit log"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-[#9484f7]' : ''}`} />
        </button>
      </div>

      {/* Audit Log Table */}
      <div className="bg-[#1c1d25] border border-white/[0.07] rounded-3xl overflow-hidden shadow-lg">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-white/[0.07] bg-white/[0.02] text-slate-400 text-[11px] uppercase tracking-wider">
                <th className="py-3.5 px-5 font-semibold">Cycle ID</th>
                <th className="py-3.5 px-5 font-semibold">Trigger Event</th>
                <th className="py-3.5 px-5 font-semibold">Agents Involved</th>
                <th className="py-3.5 px-5 font-semibold">Outcome Status</th>
                <th className="py-3.5 px-5 font-semibold">Timestamp</th>
                <th className="py-3.5 px-5 font-semibold">Action Summary</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.05] text-slate-300">
              {loading ? (
                [...Array(4)].map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={6} className="py-4 px-5 h-12 bg-white/[0.01]"></td>
                  </tr>
                ))
              ) : runs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    No system audit logs found.
                  </td>
                </tr>
              ) : (
                runs.map((r) => (
                  <tr key={r.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="py-3.5 px-5 font-mono text-[#a890fe] font-bold">{r.run_id}</td>
                    <td className="py-3.5 px-5 text-white font-medium">{r.trigger_event}</td>
                    <td className="py-3.5 px-5">
                      <div className="flex flex-wrap gap-1">
                        {r.agents_involved?.map((a: string, i: number) => (
                          <span
                            key={i}
                            className="text-[9px] px-2 py-0.5 rounded-full bg-white/[0.04] text-slate-300 border border-white/[0.06]"
                          >
                            {a.replace(' Agent', '')}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="py-3.5 px-5">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        r.status === 'COMPLETED'
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      }`}>
                        {r.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-5 text-slate-400">
                      {new Date(r.start_time).toLocaleString()}
                    </td>
                    <td className="py-3.5 px-5 text-slate-200 max-w-md text-[11px] leading-relaxed">
                      {r.summary || 'Audit telemetry cycle finalized without anomalies.'}
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

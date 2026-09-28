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
    <div className="p-8 space-y-6 max-w-7xl mx-auto text-[#12332C]">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-2xl bg-[#006B4F]/15 border border-[#006B4F]/30 flex items-center justify-center text-[#006B4F]">
              <History className="w-4 h-4" />
            </div>
            <h1 className="text-xl font-bold text-[#12332C] tracking-tight">
              Autonomous System Audit Trail & Governance Ledger
            </h1>
          </div>
          <p className="text-xs text-[#647772] mt-1 pl-11">
            Immutable log of all autonomous agent decisions, pharmacist approvals, and physical stock transfers
          </p>
        </div>

        <button
          onClick={loadRuns}
          className="w-9 h-9 rounded-full bg-white border border-[#D9E8E3] text-[#647772] hover:text-[#006B4F] hover:border-[#008F83] flex items-center justify-center transition-all self-start shadow-sm"
          title="Refresh audit log"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-[#006B4F]' : ''}`} />
        </button>
      </div>

      {/* Audit Log Table */}
      <div className="bg-white border border-[#D9E8E3] rounded-3xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#D9E8E3] bg-[#F3FAF7] text-[#647772] text-[11px] uppercase tracking-wider">
                <th className="py-3.5 px-5 font-semibold">Cycle ID</th>
                <th className="py-3.5 px-5 font-semibold">Trigger Event</th>
                <th className="py-3.5 px-5 font-semibold">Agents Involved</th>
                <th className="py-3.5 px-5 font-semibold">Outcome Status</th>
                <th className="py-3.5 px-5 font-semibold">Timestamp</th>
                <th className="py-3.5 px-5 font-semibold">Action Summary</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#D9E8E3] text-[#12332C]">
              {loading ? (
                [...Array(4)].map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={6} className="py-4 px-5 h-12 bg-[#F3FAF7]/50"></td>
                  </tr>
                ))
              ) : runs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-[#647772]">
                    No system audit logs found.
                  </td>
                </tr>
              ) : (
                runs.map((r) => (
                  <tr key={r.id} className="hover:bg-[#F3FAF7]/70 transition-colors">
                    <td className="py-3.5 px-5 font-mono text-[#006B4F] font-bold">{r.run_id}</td>
                    <td className="py-3.5 px-5 text-[#12332C] font-semibold">{r.trigger_event}</td>
                    <td className="py-3.5 px-5">
                      <div className="flex flex-wrap gap-1">
                        {r.agents_involved?.map((a: string, i: number) => (
                          <span
                            key={i}
                            className="text-[9px] px-2 py-0.5 rounded-full bg-[#F3FAF7] text-[#006B4F] border border-[#D9E8E3] font-mono font-medium"
                          >
                            {a.replace(' Agent', '')}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="py-3.5 px-5">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        r.status === 'COMPLETED'
                          ? 'bg-[#16A34A]/15 text-[#16A34A] border border-[#16A34A]/30'
                          : 'bg-[#F59E0B]/15 text-[#B45309] border border-[#F59E0B]/30'
                      }`}>
                        {r.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-5 text-[#647772]">
                      {new Date(r.start_time).toLocaleString()}
                    </td>
                    <td className="py-3.5 px-5 text-[#12332C] max-w-md text-[11px] leading-relaxed">
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

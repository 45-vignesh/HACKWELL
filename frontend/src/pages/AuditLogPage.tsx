import React, { useState, useEffect } from 'react';
import { History, ShieldCheck, RefreshCw, FileText, CheckCircle2, XCircle, AlertTriangle, User, Database } from 'lucide-react';
import { api } from '../services/api';
import { DataAuditRecord } from '../types';

export const AuditLogPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'agents' | 'governance'>('governance');
  const [runs, setRuns] = useState<any[]>([]);
  const [governanceLogs, setGovernanceLogs] = useState<DataAuditRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'agents') {
        const data = await api.getAgentRuns();
        setRuns(data);
      } else {
        const data = await api.getDataAuditTrail();
        setGovernanceLogs(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [activeTab]);

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
              Hospital Governance & Audit Ledger
            </h1>
          </div>
          <p className="text-xs text-[#647772] mt-1 pl-11">
            Immutable log of manual operational data changes, validation outcomes, and autonomous agent cycles
          </p>
        </div>

        <div className="flex items-center space-x-3">
          {/* Sub-tab pills */}
          <div className="bg-[#F3FAF7] border border-[#D9E8E3] rounded-full p-1 flex space-x-1 text-xs self-start">
            <button
              onClick={() => setActiveTab('governance')}
              className={`px-4 py-1.5 rounded-full font-semibold transition-all flex items-center space-x-1.5 ${
                activeTab === 'governance'
                  ? 'bg-[#006B4F] text-white shadow-sm'
                  : 'text-[#647772] hover:text-[#12332C]'
              }`}
            >
              <Database className="w-3.5 h-3.5" />
              <span>Data Governance Trail</span>
            </button>
            <button
              onClick={() => setActiveTab('agents')}
              className={`px-4 py-1.5 rounded-full font-semibold transition-all flex items-center space-x-1.5 ${
                activeTab === 'agents'
                  ? 'bg-[#006B4F] text-white shadow-sm'
                  : 'text-[#647772] hover:text-[#12332C]'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Autonomous Agent Cycles</span>
            </button>
          </div>

          <button
            onClick={loadData}
            className="w-9 h-9 rounded-full bg-white border border-[#D9E8E3] text-[#647772] hover:text-[#006B4F] hover:border-[#008F83] flex items-center justify-center transition-all self-start shadow-sm"
            title="Refresh audit log"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-[#006B4F]' : ''}`} />
          </button>
        </div>
      </div>

      {/* Main Audit Tables */}
      <div className="bg-white border border-[#D9E8E3] rounded-3xl overflow-hidden shadow-sm">
        {activeTab === 'governance' ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#D9E8E3] bg-[#F3FAF7] text-[#647772] text-[11px] uppercase tracking-wider font-mono">
                  <th className="py-3.5 px-5 font-semibold">Actor / User</th>
                  <th className="py-3.5 px-5 font-semibold">Action</th>
                  <th className="py-3.5 px-5 font-semibold">Medicine & Ward</th>
                  <th className="py-3.5 px-5 font-semibold">Value Before / After</th>
                  <th className="py-3.5 px-5 font-semibold">Validation Result</th>
                  <th className="py-3.5 px-5 font-semibold">Reason & Source</th>
                  <th className="py-3.5 px-5 font-semibold">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#D9E8E3] text-[#12332C]">
                {loading ? (
                  [...Array(4)].map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td colSpan={7} className="py-4 px-5 h-12 bg-[#F3FAF7]/50"></td>
                    </tr>
                  ))
                ) : governanceLogs.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-[#647772]">
                      No data governance modification records found.
                    </td>
                  </tr>
                ) : (
                  governanceLogs.map((log) => {
                    const isRejected = log.validation_result === 'REJECTED';
                    const isWarning = log.validation_result === 'WARNING';

                    return (
                      <tr key={log.id} className="hover:bg-[#F3FAF7]/70 transition-colors">
                        <td className="py-3.5 px-5">
                          <div className="flex items-center space-x-2">
                            <span className="font-bold text-[#12332C]">{log.user}</span>
                            <span className={`text-[9px] px-1.5 py-0.2 rounded-full font-bold uppercase ${
                              log.role === 'DATA_MANAGER'
                                ? 'bg-emerald-100 text-emerald-800'
                                : log.role === 'ADMIN'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-teal-100 text-teal-800'
                            }`}>
                              {log.role}
                            </span>
                          </div>
                        </td>
                        <td className="py-3.5 px-5 font-mono text-[#006B4F] font-semibold">
                          {log.action}
                        </td>
                        <td className="py-3.5 px-5">
                          <div className="font-semibold text-[#12332C]">{log.medicine_name || 'N/A'}</div>
                          <div className="text-[10px] text-[#647772]">{log.ward_name || log.entity_type}</div>
                        </td>
                        <td className="py-3.5 px-5 font-mono text-xs">
                          {log.old_value && log.new_value ? (
                            <div className="flex items-center space-x-1.5">
                              <span className="text-[#647772] line-through">{log.old_value.current_stock ?? JSON.stringify(log.old_value)}</span>
                              <span>&rarr;</span>
                              <span className="font-bold text-[#006B4F]">{log.new_value.current_stock ?? JSON.stringify(log.new_value)}</span>
                            </div>
                          ) : (
                            <span className="text-[#647772]">-</span>
                          )}
                        </td>
                        <td className="py-3.5 px-5">
                          <span className={`inline-flex items-center space-x-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            isRejected
                              ? 'bg-rose-100 text-rose-800 border border-rose-300'
                              : isWarning
                              ? 'bg-amber-100 text-amber-800 border border-amber-300'
                              : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                          }`}>
                            {isRejected ? <XCircle className="w-3 h-3 text-rose-600" /> : <CheckCircle2 className="w-3 h-3 text-emerald-600" />}
                            <span>{log.validation_result}</span>
                          </span>
                        </td>
                        <td className="py-3.5 px-5 max-w-xs">
                          <div className="text-xs text-[#12332C] leading-snug">{log.reason}</div>
                          <div className="text-[10px] text-[#647772] font-mono mt-0.5">Source: {log.source}</div>
                        </td>
                        <td className="py-3.5 px-5 text-[#647772] font-mono text-[11px] whitespace-nowrap">
                          {new Date(log.timestamp).toLocaleString()}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#D9E8E3] bg-[#F3FAF7] text-[#647772] text-[11px] uppercase tracking-wider font-mono">
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
        )}
      </div>
    </div>
  );
};

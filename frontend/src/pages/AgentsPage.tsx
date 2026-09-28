import React, { useState, useEffect } from 'react';
import { Bot, Play, RefreshCw, CheckCircle2 } from 'lucide-react';
import { api } from '../services/api';

export const AgentsPage: React.FC = () => {
  const [agents, setAgents] = useState<any[]>([]);
  const [runs, setRuns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [selectedRun, setSelectedRun] = useState<any>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [agentsData, runsData] = await Promise.all([
        api.getAgents(),
        api.getAgentRuns()
      ]);
      setAgents(agentsData);
      setRuns(runsData);
      if (runsData.length > 0 && !selectedRun) {
        setSelectedRun(runsData[0]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleRunScan = async () => {
    setAnalyzing(true);
    try {
      await api.triggerAgentAnalyze();
      await loadData();
    } catch (err) {
      console.error(err);
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-2xl bg-[#7c5cfc]/15 border border-[#7c5cfc]/30 flex items-center justify-center text-[#9484f7]">
              <Bot className="w-4 h-4" />
            </div>
            <h1 className="text-xl font-bold text-white tracking-tight">
              Autonomous Multi-Agent Telemetry Network
            </h1>
          </div>
          <p className="text-xs text-slate-400 mt-1 pl-11">
            Six specialized AI agents orchestrated via stateful LangGraph workflow graphs
          </p>
        </div>

        <button
          onClick={handleRunScan}
          disabled={analyzing}
          className="ref-pill-btn flex items-center space-x-2 px-5 py-2.5 rounded-full bg-[#7c5cfc] hover:bg-[#8c6eff] text-white font-bold text-xs shadow-lg shadow-[#7c5cfc]/25 transition-all disabled:opacity-50 self-start"
        >
          <Play className={`w-3.5 h-3.5 fill-current ${analyzing ? 'animate-spin' : ''}`} />
          <span>{analyzing ? 'Executing LangGraph...' : 'Trigger System Audit Scan'}</span>
        </button>
      </div>

      {/* 6 Agent Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {agents.map((agent) => (
          <div
            key={agent.id}
            className="bg-[#1c1d25] border border-white/[0.07] rounded-3xl p-6 space-y-3.5 hover:border-white/20 transition-all shadow-md"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-2xl bg-[#7c5cfc]/15 border border-[#7c5cfc]/30 flex items-center justify-center text-[#9484f7]">
                  <Bot className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">{agent.name}</h3>
                  <div className="text-[11px] text-slate-400">{agent.role}</div>
                </div>
              </div>
              <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold uppercase tracking-wider">
                {agent.status}
              </span>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed min-h-[36px]">
              {agent.description}
            </p>

            <div className="pt-3 border-t border-white/[0.05]">
              <div className="text-[10px] uppercase tracking-wider font-semibold text-slate-400 mb-2">Registered Tools</div>
              <div className="flex flex-wrap gap-1.5">
                {agent.capabilities.map((c: string, idx: number) => (
                  <span
                    key={idx}
                    className="text-[10px] px-2.5 py-0.5 rounded-full bg-white/[0.04] text-slate-300 border border-white/[0.06]"
                  >
                    {c}
                  </span>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Historical Agent Runs & Telemetry Stepper */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Runs List */}
        <div className="lg:col-span-5 bg-[#1c1d25] border border-white/[0.07] rounded-3xl p-6 space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center justify-between">
            <span>Historical Orchestration Cycles</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-white/[0.04] border border-white/[0.06] text-slate-400">
              {runs.length} runs
            </span>
          </h3>

          <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1">
            {runs.map((r) => (
              <div
                key={r.id}
                onClick={() => setSelectedRun(r)}
                className={`p-3.5 rounded-2xl border cursor-pointer transition-all ${
                  selectedRun?.id === r.id
                    ? 'bg-[#7c5cfc]/15 border-[#7c5cfc]/50 shadow-md shadow-[#7c5cfc]/10'
                    : 'bg-[#232430] border-white/[0.05] hover:border-white/15'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold text-[#a890fe]">{r.run_id}</span>
                  <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                    r.status === 'COMPLETED' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                  }`}>
                    {r.status}
                  </span>
                </div>
                <div className="text-xs font-semibold text-slate-200 mt-1">{r.trigger_event}</div>
                <div className="text-[10px] text-slate-400 mt-1">
                  {new Date(r.start_time).toLocaleTimeString()} • {r.execution_log?.length || 0} steps
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Selected Run Telemetry Timeline */}
        <div className="lg:col-span-7 bg-[#1c1d25] border border-white/[0.07] rounded-3xl p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-white/[0.07] pb-3">
            <div>
              <h3 className="text-sm font-bold text-white tracking-tight">Execution Timeline</h3>
              <p className="text-[11px] text-slate-400">
                Run ID: <span className="text-[#a890fe] font-mono">{selectedRun?.run_id || 'None selected'}</span>
              </p>
            </div>
            {selectedRun && (
              <span className="text-xs text-slate-300 bg-white/[0.04] border border-white/[0.06] px-3 py-1 rounded-full">
                Status: {selectedRun.status}
              </span>
            )}
          </div>

          <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
            {selectedRun?.execution_log?.map((log: any, idx: number) => (
              <div key={idx} className="flex items-start space-x-3 text-xs">
                <div className="w-2.5 h-2.5 rounded-full bg-[#7c5cfc] mt-2 shrink-0"></div>
                <div className="bg-[#232430] border border-white/[0.05] rounded-2xl p-4 flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[#a890fe]">{log.agent}</span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </span>
                  </div>
                  <div className="text-[11px] text-[#9484f7] uppercase font-semibold mt-0.5">{log.action}</div>
                  <p className="text-slate-200 mt-1 leading-relaxed text-xs">{log.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

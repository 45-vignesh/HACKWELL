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
    <div className="p-8 space-y-6 max-w-7xl mx-auto text-[#12332C]">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-2xl bg-[#006B4F]/15 border border-[#006B4F]/30 flex items-center justify-center text-[#006B4F]">
              <Bot className="w-4 h-4" />
            </div>
            <h1 className="text-xl font-bold text-[#12332C] tracking-tight">
              Autonomous Multi-Agent Telemetry Network
            </h1>
          </div>
          <p className="text-xs text-[#647772] mt-1 pl-11">
            Six specialized AI agents orchestrated via stateful LangGraph workflow graphs
          </p>
        </div>

        <button
          onClick={handleRunScan}
          disabled={analyzing}
          className="ref-pill-btn flex items-center space-x-2 px-5 py-2.5 rounded-full bg-[#006B4F] hover:bg-[#004D3A] text-white font-bold text-xs shadow-sm transition-all disabled:opacity-50 self-start"
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
            className="bg-white border border-[#D9E8E3] rounded-3xl p-6 space-y-3.5 hover:border-[#008F83] transition-all shadow-sm"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-2xl bg-[#008F83]/15 border border-[#008F83]/30 flex items-center justify-center text-[#006B4F]">
                  <Bot className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#12332C]">{agent.name}</h3>
                  <div className="text-[11px] text-[#647772]">{agent.role}</div>
                </div>
              </div>
              <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-[#16A34A]/15 text-[#16A34A] border border-[#16A34A]/30 font-bold uppercase tracking-wider">
                {agent.status}
              </span>
            </div>

            <p className="text-xs text-[#12332C] leading-relaxed min-h-[36px]">
              {agent.description}
            </p>

            <div className="pt-3 border-t border-[#D9E8E3]">
              <div className="text-[10px] uppercase tracking-wider font-semibold text-[#647772] mb-2">Registered Tools</div>
              <div className="flex flex-wrap gap-1.5">
                {agent.capabilities.map((c: string, idx: number) => (
                  <span
                    key={idx}
                    className="text-[10px] px-2.5 py-0.5 rounded-full bg-[#F3FAF7] text-[#006B4F] border border-[#D9E8E3]"
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
        <div className="lg:col-span-5 bg-white border border-[#D9E8E3] rounded-3xl p-6 space-y-4 shadow-sm">
          <h3 className="text-sm font-bold text-[#12332C] flex items-center justify-between">
            <span>Historical Orchestration Cycles</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-[#F3FAF7] border border-[#D9E8E3] text-[#647772]">
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
                    ? 'bg-[#006B4F]/10 border-[#006B4F] shadow-sm'
                    : 'bg-[#F3FAF7] border-[#D9E8E3] hover:border-[#008F83]'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold text-[#006B4F]">{r.run_id}</span>
                  <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                    r.status === 'COMPLETED' ? 'bg-[#16A34A]/15 text-[#16A34A] border border-[#16A34A]/30' : 'bg-[#F59E0B]/15 text-[#B45309] border border-[#F59E0B]/30'
                  }`}>
                    {r.status}
                  </span>
                </div>
                <div className="text-xs font-semibold text-[#12332C] mt-1">{r.trigger_event}</div>
                <div className="text-[10px] text-[#647772] mt-1">
                  {new Date(r.start_time).toLocaleTimeString()} • {r.execution_log?.length || 0} steps
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Selected Run Telemetry Timeline */}
        <div className="lg:col-span-7 bg-white border border-[#D9E8E3] rounded-3xl p-6 space-y-4 shadow-sm">
          <div className="flex items-center justify-between border-b border-[#D9E8E3] pb-3">
            <div>
              <h3 className="text-sm font-bold text-[#12332C] tracking-tight">Execution Timeline</h3>
              <p className="text-[11px] text-[#647772]">
                Run ID: <span className="text-[#006B4F] font-mono">{selectedRun?.run_id || 'None selected'}</span>
              </p>
            </div>
            {selectedRun && (
              <span className="text-xs text-[#12332C] bg-[#F3FAF7] border border-[#D9E8E3] px-3 py-1 rounded-full">
                Status: {selectedRun.status}
              </span>
            )}
          </div>

          <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
            {selectedRun?.execution_log?.map((log: any, idx: number) => (
              <div key={idx} className="flex items-start space-x-3 text-xs">
                <div className="w-2.5 h-2.5 rounded-full bg-[#006B4F] mt-2 shrink-0"></div>
                <div className="bg-[#F3FAF7] border border-[#D9E8E3] rounded-2xl p-4 flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[#006B4F]">{log.agent}</span>
                    <span className="text-[10px] text-[#647772] font-mono">
                      {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </span>
                  </div>
                  <div className="text-[11px] text-[#008F83] uppercase font-semibold mt-0.5">{log.action}</div>
                  <p className="text-[#12332C] mt-1 leading-relaxed text-xs">{log.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

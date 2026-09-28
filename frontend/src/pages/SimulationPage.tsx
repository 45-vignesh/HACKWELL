import React, { useState } from 'react';
import { Zap, Play, CheckCircle2, RefreshCw, Check, ShieldCheck } from 'lucide-react';
import { SimulationResponse } from '../types';
import { api } from '../services/api';

interface SimulationPageProps {
  onRefreshData: () => void;
  onNavigateToApprovals: () => void;
}

export const SimulationPage: React.FC<SimulationPageProps> = ({
  onRefreshData,
  onNavigateToApprovals
}) => {
  const [loading, setLoading] = useState(false);
  const [simulationResult, setSimulationResult] = useState<SimulationResponse | null>(null);
  const [approvedInDemo, setApprovedInDemo] = useState(false);
  const [resetting, setResetting] = useState(false);

  const handleRunSimulation = async () => {
    setLoading(true);
    setApprovedInDemo(false);
    try {
      const res = await api.runDengueSimulation();
      setSimulationResult(res);
      onRefreshData();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDemoApproval = async () => {
    try {
      const pending = await api.getApprovals('PENDING');
      if (pending.length > 0) {
        await api.decideApproval(
          pending[0].id,
          'APPROVE',
          'Demo Outbreak Emergency Protocol Authorized',
          'Chief Pharmacist (Hackathon Demo)'
        );
        setApprovedInDemo(true);
        onRefreshData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleReset = async () => {
    setResetting(true);
    try {
      await api.resetSimulation();
      setSimulationResult(null);
      setApprovedInDemo(false);
      onRefreshData();
    } catch (err) {
      console.error(err);
    } finally {
      setResetting(false);
    }
  };

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-2xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400">
              <Zap className="w-4 h-4 fill-current" />
            </div>
            <h1 className="text-xl font-bold text-white tracking-tight">
              Monsoon Dengue Epidemic Outbreak Simulation
            </h1>
            <span className="text-[10px] px-3 py-1 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 uppercase font-bold tracking-wider">
              PRIMARY HERO SCENARIO
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1 pl-11">
            Simulates acute spike in hospital IV fluid admissions, triggering the complete autonomous loop from detection to approval & execution
          </p>
        </div>

        <div className="flex items-center space-x-3 self-start">
          <button
            onClick={handleReset}
            disabled={resetting || loading}
            className="ref-pill-btn flex items-center space-x-1.5 px-4 py-2 rounded-full bg-[#1c1d25] border border-white/[0.07] text-slate-300 hover:text-white hover:border-white/20 text-xs font-medium transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${resetting ? 'animate-spin' : ''}`} />
            <span>Reset Baseline</span>
          </button>

          <button
            onClick={handleRunSimulation}
            disabled={loading}
            className="ref-pill-btn flex items-center space-x-2 px-6 py-2.5 rounded-full bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-400 text-white font-bold text-xs shadow-lg shadow-rose-950/40 transition-all active:scale-95 disabled:opacity-50"
          >
            <Play className={`w-3.5 h-3.5 fill-current ${loading ? 'animate-spin' : ''}`} />
            <span>{loading ? 'Running Multi-Agent Simulation...' : 'Run Dengue Surge Simulation'}</span>
          </button>
        </div>
      </div>

      {/* Scenario Context Card */}
      <div className="bg-[#1c1d25] border border-white/[0.07] rounded-3xl p-6 shadow-xl space-y-4">
        <h3 className="text-xs uppercase tracking-wider text-[#9484f7] font-semibold">
          Presentation Storyline
        </h3>
        <p className="text-xs text-slate-300 leading-relaxed max-w-4xl">
          Monsoon seasonal rains cause a sudden Dengue fever outbreak in the city. The Emergency Ward experiences a <strong className="text-white">400% surge</strong> in dehydration admissions, causing daily consumption of IV Fluids (Normal Saline 0.9%) to spike to <strong className="text-rose-400">62 bottles/day</strong>. Stock drops to 35 bottles—exhaustion in <strong className="text-rose-400">1.5 days</strong>.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
          <div className="bg-[#232430] border border-white/[0.05] rounded-2xl p-4">
            <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Medicine In Demand</div>
            <div className="text-xs font-bold text-white mt-1">Normal Saline 0.9% (500ml)</div>
          </div>
          <div className="bg-[#232430] border border-white/[0.05] rounded-2xl p-4">
            <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Affected Department</div>
            <div className="text-xs font-bold text-white mt-1">Emergency Acute Ward</div>
          </div>
          <div className="bg-[#232430] border border-white/[0.05] rounded-2xl p-4">
            <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Consumption Spike</div>
            <div className="text-xs font-bold text-rose-400 mt-1">62.0 units/day (400%)</div>
          </div>
          <div className="bg-[#232430] border border-white/[0.05] rounded-2xl p-4">
            <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Autonomous Resolution</div>
            <div className="text-xs font-bold text-[#9484f7] mt-1">OPD Transfer + PO</div>
          </div>
        </div>
      </div>

      {/* Live Simulation Steps Telemetry Timeline */}
      {simulationResult && (
        <div className="bg-[#1c1d25] border border-rose-500/30 rounded-3xl p-6 shadow-2xl space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-white/[0.07] pb-4">
            <div>
              <span className="text-[10px] px-3 py-1 rounded-full bg-rose-500/20 text-rose-300 font-bold uppercase tracking-wider">
                {simulationResult.scenario}
              </span>
              <h3 className="text-base font-bold text-white mt-2">Multi-Agent Response Telemetry</h3>
              <p className="text-xs text-slate-400">{simulationResult.message}</p>
            </div>

            <div className="text-left sm:text-right">
              <div className="text-xs text-slate-400">Stockout Clock</div>
              <div className="text-2xl font-bold text-rose-400 font-mono tracking-tight">
                {simulationResult.days_to_stockout} Days Left
              </div>
            </div>
          </div>

          {/* Stepper Timeline */}
          <div className="space-y-3.5">
            {simulationResult.steps.map((step, idx) => (
              <div key={idx} className="flex items-start space-x-3.5 text-xs">
                <div className="w-7 h-7 rounded-full bg-[#232430] border border-white/10 flex items-center justify-center font-bold text-[#9484f7] shrink-0 mt-1 shadow-sm">
                  {idx + 1}
                </div>
                <div className="bg-[#232430] border border-white/[0.05] rounded-2xl p-4 flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[#a890fe]">{step.agent}</span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {new Date(step.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </span>
                  </div>
                  <div className="text-[11px] text-[#9484f7] uppercase font-semibold mt-0.5">{step.action}</div>
                  <p className="text-slate-200 mt-1 leading-relaxed text-xs">{step.detail}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Pharmacist 1-Tap Sign-off inside Demo */}
          <div className="p-5 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/30 rounded-2xl flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <div className="flex items-center space-x-2">
                <ShieldCheck className="w-5 h-5 text-amber-400" />
                <h4 className="text-sm font-bold text-white">Pharmacist Approval Gate Reached</h4>
              </div>
              <p className="text-xs text-slate-300 mt-1 max-w-2xl">
                The agent team has prepared an internal transfer of 50 units from OPD and an emergency PO for ₹18,000.
                Click below to simulate the chief pharmacist's 1-tap sign-off.
              </p>
            </div>

            {approvedInDemo ? (
              <div className="flex items-center space-x-2 text-xs font-bold text-emerald-400 bg-emerald-500/20 px-4 py-2 rounded-full border border-emerald-500/30 self-start md:self-auto">
                <Check className="w-4 h-4 stroke-[3]" />
                <span>Action Executed & Stock Replenished</span>
              </div>
            ) : (
              <button
                onClick={handleDemoApproval}
                className="ref-pill-btn px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white rounded-full text-xs font-bold shadow-lg shadow-emerald-950 flex items-center space-x-2 transition-all active:scale-95 self-start md:self-auto"
              >
                <Check className="w-4 h-4 stroke-[3]" />
                <span>1-Tap Pharmacist Sign-Off</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

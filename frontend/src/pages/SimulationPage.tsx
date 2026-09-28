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
    <div className="p-8 space-y-6 max-w-7xl mx-auto text-[#12332C]">
      {/* Page Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-2xl bg-[#F4B400]/15 border border-[#F4B400]/30 flex items-center justify-center text-[#F4B400]">
              <Zap className="w-4 h-4 fill-[#F4B400]" />
            </div>
            <h1 className="text-xl font-bold text-[#12332C] tracking-tight">
              Monsoon Dengue Epidemic Outbreak Simulation
            </h1>
            <span className="text-[10px] px-3 py-1 rounded-full bg-[#F4B400]/20 text-[#12332C] border border-[#F4B400]/40 uppercase font-bold tracking-wider">
              PRIMARY HERO SCENARIO
            </span>
          </div>
          <p className="text-xs text-[#647772] mt-1 pl-11">
            Simulates acute spike in hospital IV fluid admissions, triggering the complete autonomous loop from detection to approval & execution
          </p>
        </div>

        <div className="flex items-center space-x-3 self-start">
          <button
            onClick={handleReset}
            disabled={resetting || loading}
            className="ref-pill-btn flex items-center space-x-1.5 px-4 py-2 rounded-full bg-white border border-[#D9E8E3] text-[#647772] hover:text-[#12332C] hover:border-[#008F83] text-xs font-semibold shadow-sm transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${resetting ? 'animate-spin text-[#006B4F]' : ''}`} />
            <span>Reset Baseline</span>
          </button>

          <button
            onClick={handleRunSimulation}
            disabled={loading}
            className="ref-pill-btn flex items-center space-x-2 px-6 py-2.5 rounded-full bg-[#F4B400] hover:bg-[#e0a400] text-[#12332C] font-bold text-xs shadow-md transition-all active:scale-95 disabled:opacity-50"
          >
            <Play className={`w-3.5 h-3.5 fill-[#12332C] ${loading ? 'animate-spin' : ''}`} />
            <span>{loading ? 'Running Multi-Agent Simulation...' : 'Run Dengue Surge Simulation'}</span>
          </button>
        </div>
      </div>

      {/* Scenario Context Card */}
      <div className="bg-white border border-[#D9E8E3] rounded-3xl p-6 shadow-sm space-y-4">
        <h3 className="text-xs uppercase tracking-wider text-[#006B4F] font-bold">
          Presentation Storyline
        </h3>
        <p className="text-xs text-[#12332C] leading-relaxed max-w-4xl">
          Monsoon seasonal rains cause a sudden Dengue fever outbreak in the city. The Emergency Ward experiences a <strong className="text-[#12332C] font-bold">400% surge</strong> in dehydration admissions, causing daily consumption of IV Fluids (Normal Saline 0.9%) to spike to <strong className="text-[#DC2626] font-bold">62 bottles/day</strong>. Stock drops to 35 bottles—exhaustion in <strong className="text-[#DC2626] font-bold">1.5 days</strong>.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
          <div className="bg-[#F3FAF7] border border-[#D9E8E3] rounded-2xl p-4 shadow-sm">
            <div className="text-[10px] text-[#647772] uppercase tracking-wider font-semibold">Medicine In Demand</div>
            <div className="text-xs font-bold text-[#12332C] mt-1">Normal Saline 0.9% (500ml)</div>
          </div>
          <div className="bg-[#F3FAF7] border border-[#D9E8E3] rounded-2xl p-4 shadow-sm">
            <div className="text-[10px] text-[#647772] uppercase tracking-wider font-semibold">Affected Department</div>
            <div className="text-xs font-bold text-[#12332C] mt-1">Emergency Acute Ward</div>
          </div>
          <div className="bg-[#F3FAF7] border border-[#D9E8E3] rounded-2xl p-4 shadow-sm">
            <div className="text-[10px] text-[#647772] uppercase tracking-wider font-semibold">Consumption Spike</div>
            <div className="text-xs font-bold text-[#DC2626] mt-1">62.0 units/day (400%)</div>
          </div>
          <div className="bg-[#F3FAF7] border border-[#D9E8E3] rounded-2xl p-4 shadow-sm">
            <div className="text-[10px] text-[#647772] uppercase tracking-wider font-semibold">Autonomous Resolution</div>
            <div className="text-xs font-bold text-[#006B4F] mt-1">OPD Transfer + PO</div>
          </div>
        </div>
      </div>

      {/* Live Simulation Steps Telemetry Timeline */}
      {simulationResult && (
        <div className="bg-white border-2 border-[#DC2626]/40 rounded-3xl p-6 shadow-md space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-[#D9E8E3] pb-4">
            <div>
              <span className="text-[10px] px-3 py-1 rounded-full bg-[#DC2626]/15 text-[#DC2626] font-bold uppercase tracking-wider border border-[#DC2626]/30">
                {simulationResult.scenario}
              </span>
              <h3 className="text-base font-bold text-[#12332C] mt-2">Multi-Agent Response Telemetry</h3>
              <p className="text-xs text-[#647772]">{simulationResult.message}</p>
            </div>

            <div className="text-left sm:text-right">
              <div className="text-xs text-[#647772]">Stockout Clock</div>
              <div className="text-2xl font-bold text-[#DC2626] font-mono tracking-tight">
                {simulationResult.days_to_stockout} Days Left
              </div>
            </div>
          </div>

          {/* Stepper Timeline */}
          <div className="space-y-3.5">
            {simulationResult.steps.map((step, idx) => (
              <div key={idx} className="flex items-start space-x-3.5 text-xs">
                <div className="w-7 h-7 rounded-full bg-[#F3FAF7] border border-[#D9E8E3] flex items-center justify-center font-bold text-[#006B4F] shrink-0 mt-1 shadow-sm">
                  {idx + 1}
                </div>
                <div className="bg-[#F3FAF7] border border-[#D9E8E3] rounded-2xl p-4 flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[#006B4F]">{step.agent}</span>
                    <span className="text-[10px] text-[#647772] font-mono">
                      {new Date(step.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </span>
                  </div>
                  <div className="text-[11px] text-[#008F83] uppercase font-semibold mt-0.5">{step.action}</div>
                  <p className="text-[#12332C] mt-1 leading-relaxed text-xs">{step.detail}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Pharmacist 1-Tap Sign-off inside Demo */}
          <div className="p-5 bg-[#F3FAF7] border border-[#F59E0B]/40 rounded-2xl flex flex-col md:flex-row md:items-center md:justify-between gap-4 shadow-sm">
            <div>
              <div className="flex items-center space-x-2">
                <ShieldCheck className="w-5 h-5 text-[#B45309]" />
                <h4 className="text-sm font-bold text-[#12332C]">Pharmacist Approval Gate Reached</h4>
              </div>
              <p className="text-xs text-[#647772] mt-1 max-w-2xl">
                The agent team has prepared an internal transfer of 50 units from OPD and an emergency PO for ₹18,000.
                Click below to simulate the chief pharmacist's 1-tap sign-off.
              </p>
            </div>

            {approvedInDemo ? (
              <div className="flex items-center space-x-2 text-xs font-bold text-[#16A34A] bg-[#16A34A]/15 px-4 py-2 rounded-full border border-[#16A34A]/30 self-start md:self-auto">
                <Check className="w-4 h-4 stroke-[3]" />
                <span>Action Executed & Stock Replenished</span>
              </div>
            ) : (
              <button
                onClick={handleDemoApproval}
                className="ref-pill-btn px-6 py-2.5 bg-[#006B4F] hover:bg-[#004D3A] text-white rounded-full text-xs font-bold shadow-md flex items-center space-x-2 transition-all active:scale-95 self-start md:self-auto"
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

import React, { useState, useEffect } from 'react';
import { ShieldCheck, Check, X, Clock, AlertTriangle, Sparkles } from 'lucide-react';
import { ApprovalItem } from '../types';
import { api } from '../services/api';

interface ApprovalsPageProps {
  onRefreshData: () => void;
}

export const ApprovalsPage: React.FC<ApprovalsPageProps> = ({ onRefreshData }) => {
  const [approvals, setApprovals] = useState<ApprovalItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'PENDING' | 'APPROVED' | 'REJECTED' | 'ALL'>('PENDING');
  const [processingId, setProcessingId] = useState<number | null>(null);

  const loadApprovals = async () => {
    setLoading(true);
    try {
      const data = await api.getApprovals(filter === 'ALL' ? undefined : filter);
      setApprovals(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadApprovals();
  }, [filter]);

  const handleDecision = async (id: number, decision: 'APPROVE' | 'REJECT') => {
    setProcessingId(id);
    try {
      await api.decideApproval(
        id,
        decision,
        decision === 'APPROVE'
          ? 'Authorized under clinical pharmacy governance protocol.'
          : 'Rejected by pharmacist for alternative therapeutic substitution.',
        'Chief Pharmacist Dr. Sarah'
      );
      await loadApprovals();
      onRefreshData();
    } catch (err) {
      console.error(err);
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <h1 className="text-xl font-bold text-white tracking-tight">
              Pharmacist Governance & Human-in-the-Loop Gate
            </h1>
          </div>
          <p className="text-xs text-slate-400 mt-1 pl-11">
            Mandatory clinical sign-off for high-value purchase orders (&ge; ₹10k) and critical medicine movements
          </p>
        </div>

        {/* Filter Pills */}
        <div className="bg-[#1c1d25] border border-white/[0.07] rounded-full p-1 flex space-x-1 text-xs self-start">
          {(['PENDING', 'APPROVED', 'REJECTED', 'ALL'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={`px-4 py-1.5 rounded-full font-medium transition-all ${
                filter === tab
                  ? 'bg-[#7c5cfc] text-white shadow-lg shadow-[#7c5cfc]/25 font-semibold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Approvals Cards */}
      <div className="space-y-4">
        {loading ? (
          [...Array(3)].map((_, i) => (
            <div key={i} className="h-44 bg-[#1c1d25] border border-white/[0.07] rounded-3xl animate-pulse"></div>
          ))
        ) : approvals.length === 0 ? (
          <div className="bg-[#1c1d25] border border-white/[0.07] rounded-3xl p-16 text-center text-slate-400">
            <div className="w-14 h-14 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mx-auto mb-3">
              <ShieldCheck className="w-7 h-7" />
            </div>
            <h3 className="text-base font-bold text-white">No Approvals in Queue</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              {filter === 'PENDING'
                ? 'All autonomous agent actions are within safe operating thresholds.'
                : `No ${filter.toLowerCase()} records found.`}
            </p>
          </div>
        ) : (
          approvals.map((appr) => {
            const isPending = appr.status === 'PENDING';

            return (
              <div
                key={appr.id}
                className={`bg-[#1c1d25] rounded-3xl p-6 transition-all border ${
                  isPending
                    ? 'border-amber-500/30 hover:border-amber-500/50 shadow-lg shadow-amber-500/5'
                    : 'border-white/[0.07] opacity-85 hover:border-white/15'
                }`}
              >
                <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
                  <div className="space-y-3 flex-1">
                    {/* Header Badges */}
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[10px] px-3 py-1 rounded-full font-bold uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/30">
                        {appr.action_type.replace('_', ' ')}
                      </span>
                      <span className="text-[10px] px-2.5 py-1 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 uppercase font-bold tracking-wider">
                        {appr.risk_level} RISK
                      </span>
                      <span className="text-xs text-slate-400">
                        Agent: <strong className="text-slate-200">{appr.requested_by_agent}</strong>
                      </span>
                      <span className="text-[11px] text-slate-400">
                        {new Date(appr.created_at).toLocaleString()}
                      </span>
                    </div>

                    {/* Main Title & Action Details */}
                    <div>
                      <h3 className="text-base font-bold text-white flex items-center space-x-2">
                        <span>{appr.medicine_name || 'Emergency Medicine'}</span>
                        <span className="text-slate-400 text-xs font-normal">
                          ({appr.requested_quantity} units)
                        </span>
                      </h3>
                      {appr.details?.supplier_name && (
                        <p className="text-xs text-[#9484f7] mt-0.5 font-medium">
                          Vendor: {appr.details.supplier_name} • Lead Time: {appr.details.lead_time_days} days
                        </p>
                      )}
                      {appr.details?.from_ward && (
                        <p className="text-xs text-[#9484f7] mt-0.5 font-medium">
                          Source: {appr.details.from_ward} &rarr; Destination: {appr.details.to_ward}
                        </p>
                      )}
                    </div>

                    {/* Justification & Clinical Rationale */}
                    <div className="p-4 bg-[#232430] rounded-2xl border border-white/[0.05]">
                      <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Clinical Rationale</div>
                      <p className="text-xs text-slate-200 mt-1 leading-relaxed">{appr.justification}</p>
                    </div>

                    {/* Status & Decision Information if already decided */}
                    {!isPending && (
                      <div className="text-xs text-slate-400 pt-1 flex items-center space-x-2">
                        <span className={`px-2.5 py-0.5 rounded-full font-bold text-[10px] uppercase tracking-wider ${
                          appr.status === 'APPROVED'
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                        }`}>
                          {appr.status}
                        </span>
                        <span>by {appr.decision_by} on {new Date(appr.decided_at!).toLocaleString()}</span>
                      </div>
                    )}
                  </div>

                  {/* Right Action Box */}
                  <div className="flex lg:flex-col items-center lg:items-end justify-between shrink-0 gap-4 pt-2 lg:pt-0">
                    <div className="text-left lg:text-right">
                      <div className="text-[10px] uppercase tracking-wider text-slate-400">Estimated Cost</div>
                      <div className="text-2xl font-bold text-white tracking-tight">
                        {appr.estimated_cost > 0 ? `₹${appr.estimated_cost.toLocaleString()}` : 'Internal Transfer'}
                      </div>
                    </div>

                    {isPending ? (
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleDecision(appr.id, 'APPROVE')}
                          disabled={processingId === appr.id}
                          className="ref-pill-btn px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white rounded-full text-xs font-bold shadow-lg shadow-emerald-950 flex items-center space-x-1.5 transition-all active:scale-95 disabled:opacity-50"
                        >
                          <Check className="w-4 h-4 stroke-[3]" />
                          <span>Approve & Execute</span>
                        </button>
                        <button
                          onClick={() => handleDecision(appr.id, 'REJECT')}
                          disabled={processingId === appr.id}
                          className="w-9 h-9 rounded-full bg-white/[0.05] hover:bg-rose-500/20 text-slate-300 hover:text-rose-200 border border-white/[0.07] hover:border-rose-500/30 flex items-center justify-center transition-all disabled:opacity-50"
                          title="Reject"
                        >
                          <X className="w-4 h-4" />
                          <span className="sr-only">Reject</span>
                        </button>
                      </div>
                    ) : (
                      <div className="text-xs text-slate-400 px-3 py-1 rounded-full bg-white/[0.03] border border-white/[0.05]">
                        Workflow Finalized
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

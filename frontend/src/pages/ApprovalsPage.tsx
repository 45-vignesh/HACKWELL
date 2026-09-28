import React, { useState, useEffect } from 'react';
import { ShieldCheck, Check, X, Clock, AlertTriangle, Sparkles, ShieldAlert, Lock } from 'lucide-react';
import { ApprovalItem } from '../types';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';

interface ApprovalsPageProps {
  onRefreshData: () => void;
}

export const ApprovalsPage: React.FC<ApprovalsPageProps> = ({ onRefreshData }) => {
  const { user, role } = useAuth();
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
    <div className="p-8 space-y-6 max-w-7xl mx-auto text-[#12332C]">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-2xl bg-[#006B4F]/15 border border-[#006B4F]/30 flex items-center justify-center text-[#006B4F]">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <h1 className="text-xl font-bold text-[#12332C] tracking-tight">
              Pharmacist Governance & Human-in-the-Loop Gate
            </h1>
          </div>
          <p className="text-xs text-[#647772] mt-1 pl-11">
            Mandatory clinical sign-off for high-value purchase orders (&ge; ₹10k) and critical medicine movements
          </p>
        </div>

        {/* Filter Pills */}
        <div className="bg-[#F3FAF7] border border-[#D9E8E3] rounded-full p-1 flex space-x-1 text-xs self-start">
          {(['PENDING', 'APPROVED', 'REJECTED', 'ALL'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={`px-4 py-1.5 rounded-full font-medium transition-all ${
                filter === tab
                  ? 'bg-[#006B4F] text-white shadow-sm font-semibold'
                  : 'text-[#647772] hover:text-[#12332C]'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Role Restriction Notice for Data Manager */}
      {role === 'DATA_MANAGER' && (
        <div className="p-4 bg-amber-50 border border-amber-300 rounded-3xl flex items-start space-x-3 text-xs text-amber-900 shadow-sm">
          <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <h4 className="font-bold text-amber-950 text-sm">Pharmacist-Only Governance Gate</h4>
            <p className="mt-0.5 leading-relaxed">
              You are authenticated as <strong>Data Manager ({user?.display_name || 'Alex Chen'})</strong>. Under MediSentinel clinical governance rules, operational inventory data managers have view-only access to AI recommendation queues. Only licensed Pharmacists or Hospital Administrators can authorize purchase orders or inter-ward stock transfers.
            </p>
          </div>
        </div>
      )}

      {/* Approvals Cards */}
      <div className="space-y-4">
        {loading ? (
          [...Array(3)].map((_, i) => (
            <div key={i} className="h-44 bg-white border border-[#D9E8E3] rounded-3xl animate-pulse shadow-sm"></div>
          ))
        ) : approvals.length === 0 ? (
          <div className="bg-white border border-[#D9E8E3] rounded-3xl p-16 text-center text-[#647772] shadow-sm">
            <div className="w-14 h-14 rounded-full bg-[#16A34A]/15 border border-[#16A34A]/30 flex items-center justify-center text-[#16A34A] mx-auto mb-3">
              <ShieldCheck className="w-7 h-7" />
            </div>
            <h3 className="text-base font-bold text-[#12332C]">No Approvals in Queue</h3>
            <p className="text-xs text-[#647772] mt-1 max-w-sm mx-auto">
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
                className={`bg-white rounded-3xl p-6 transition-all border shadow-sm ${
                  isPending
                    ? 'border-[#F59E0B]/50 hover:border-[#F59E0B]'
                    : 'border-[#D9E8E3] opacity-90 hover:border-[#008F83]'
                }`}
              >
                <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
                  <div className="space-y-3 flex-1">
                    {/* Header Badges */}
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[10px] px-3 py-1 rounded-full font-bold uppercase tracking-wider bg-[#008F83]/15 text-[#008F83] border border-[#008F83]/30">
                        {appr.action_type.replace('_', ' ')}
                      </span>
                      <span className="text-[10px] px-2.5 py-1 rounded-full bg-[#DC2626]/15 text-[#DC2626] border border-[#DC2626]/30 uppercase font-bold tracking-wider">
                        {appr.risk_level} RISK
                      </span>
                      <span className="text-xs text-[#647772]">
                        Agent: <strong className="text-[#12332C]">{appr.requested_by_agent}</strong>
                      </span>
                      <span className="text-[11px] text-[#647772]">
                        {new Date(appr.created_at).toLocaleString()}
                      </span>
                    </div>

                    {/* Main Title & Action Details */}
                    <div>
                      <h3 className="text-base font-bold text-[#12332C] flex items-center space-x-2">
                        <span>{appr.medicine_name || 'Emergency Medicine'}</span>
                        <span className="text-[#647772] text-xs font-normal">
                          ({appr.requested_quantity} units)
                        </span>
                      </h3>
                      {appr.details?.supplier_name && (
                        <p className="text-xs text-[#006B4F] mt-0.5 font-medium">
                          Vendor: {appr.details.supplier_name} • Lead Time: {appr.details.lead_time_days} days
                        </p>
                      )}
                      {appr.details?.from_ward && (
                        <p className="text-xs text-[#006B4F] mt-0.5 font-medium">
                          Source: {appr.details.from_ward} &rarr; Destination: {appr.details.to_ward}
                        </p>
                      )}
                    </div>

                    {/* Justification & Clinical Rationale */}
                    <div className="p-4 bg-[#F3FAF7] rounded-2xl border border-[#D9E8E3]">
                      <div className="text-[10px] font-semibold uppercase tracking-wider text-[#647772]">Clinical Rationale</div>
                      <p className="text-xs text-[#12332C] mt-1 leading-relaxed">{appr.justification}</p>
                    </div>

                    {/* Status & Decision Information if already decided */}
                    {!isPending && (
                      <div className="text-xs text-[#647772] pt-1 flex items-center space-x-2">
                        <span className={`px-2.5 py-0.5 rounded-full font-bold text-[10px] uppercase tracking-wider ${
                          appr.status === 'APPROVED'
                            ? 'bg-[#16A34A]/15 text-[#16A34A] border border-[#16A34A]/30'
                            : 'bg-[#DC2626]/15 text-[#DC2626] border border-[#DC2626]/30'
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
                      <div className="text-[10px] uppercase tracking-wider text-[#647772]">Estimated Cost</div>
                      <div className="text-2xl font-bold text-[#12332C] tracking-tight">
                        {appr.estimated_cost > 0 ? `₹${appr.estimated_cost.toLocaleString()}` : 'Internal Transfer'}
                      </div>
                    </div>

                    {isPending ? (
                      role === 'DATA_MANAGER' ? (
                        <div className="flex items-center space-x-2">
                          <button
                            disabled
                            title="Action restricted: Data Managers cannot approve clinical actions. Switch to Pharmacist role."
                            className="px-4 py-2 bg-gray-100 text-gray-400 rounded-full text-xs font-semibold cursor-not-allowed flex items-center space-x-1.5 border border-gray-200"
                          >
                            <Lock className="w-3.5 h-3.5" />
                            <span>Pharmacist Authorization Required</span>
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => handleDecision(appr.id, 'APPROVE')}
                            disabled={processingId === appr.id}
                            className="ref-pill-btn px-5 py-2.5 bg-[#006B4F] hover:bg-[#004D3A] text-white rounded-full text-xs font-bold shadow-md flex items-center space-x-1.5 transition-all active:scale-95 disabled:opacity-50"
                          >
                            <Check className="w-4 h-4 stroke-[3]" />
                            <span>Approve & Execute</span>
                          </button>
                          <button
                            onClick={() => handleDecision(appr.id, 'REJECT')}
                            disabled={processingId === appr.id}
                            className="w-9 h-9 rounded-full bg-[#DC2626]/10 hover:bg-[#DC2626] text-[#DC2626] hover:text-white border border-[#DC2626]/25 flex items-center justify-center transition-all disabled:opacity-50"
                            title="Reject"
                          >
                            <X className="w-4 h-4" />
                            <span className="sr-only">Reject</span>
                          </button>
                        </div>
                      )
                    ) : (
                      <div className="text-xs text-[#647772] px-3 py-1 rounded-full bg-[#F3FAF7] border border-[#D9E8E3]">
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

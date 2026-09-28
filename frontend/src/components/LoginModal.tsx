import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { UserRole, Company, Branch } from '../types';
import { ShieldCheck, UserCheck, Stethoscope, Lock, CheckCircle2, ArrowRight, X, Building2, MapPin } from 'lucide-react';
import { api } from '../services/api';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onClose }) => {
  const { user, role, switchRole } = useAuth();
  const [selectedRole, setSelectedRole] = useState<UserRole>(role);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [companyId, setCompanyId] = useState<number>(user?.company_id || 1);
  const [branchId, setBranchId] = useState<number>(user?.branch_id || 1);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const loadOrgs = async () => {
        try {
          const data = await api.getCompanies();
          setCompanies(data);
          if (data.length > 0) {
            const currentComp = data.find((c) => c.id === (user?.company_id || 1)) || data[0];
            setCompanyId(currentComp.id);
            if (currentComp.branches && currentComp.branches.length > 0) {
              const currentBranch = currentComp.branches.find((b) => b.id === (user?.branch_id || 1)) || currentComp.branches[0];
              setBranchId(currentBranch.id);
            }
          }
        } catch (err) {
          console.error('Failed to load companies in LoginModal:', err);
        }
      };
      loadOrgs();
    }
  }, [isOpen, user]);

  if (!isOpen) return null;

  const currentCompObj = companies.find((c) => c.id === companyId);
  const availableBranches = currentCompObj?.branches || [];

  const handleSelectRole = async (targetRole: UserRole) => {
    setSelectedRole(targetRole);
    setLoading(true);
    await switchRole(targetRole, companyId, targetRole !== 'ADMIN' ? branchId : undefined);
    setLoading(false);
    onClose();
  };

  const roleProfiles = [
    {
      role: 'DATA_MANAGER' as UserRole,
      title: 'Data / Inventory Manager',
      name: 'Liam Patel',
      icon: UserCheck,
      color: 'border-emerald-500 bg-emerald-50/50',
      badge: 'bg-[#006B4F] text-white',
      desc: 'Enters, imports, validates, and reconciles ward inventory for the selected company and branch facility.',
      permissions: [
        'Manual stock entry & corrections',
        'Batch CSV validation & upload',
        'Inspect data quality & validation errors',
        'View data change audit logs'
      ],
      restrictions: 'Cannot approve AI purchase orders or ward transfers'
    },
    {
      role: 'PHARMACIST' as UserRole,
      title: 'Chief Pharmacist (Approver)',
      name: 'Dr. Sarah Alston',
      icon: Stethoscope,
      color: 'border-teal-500 bg-teal-50/50',
      badge: 'bg-[#008F83] text-white',
      desc: 'Reviews and authorizes AI procurement and redistribution proposals for the selected branch.',
      permissions: [
        'Approve/reject AI purchase orders',
        'Approve/reject inter-ward transfers',
        'Review demand forecast predictions',
        'Inspect data provenance & source history'
      ],
      restrictions: 'Read-only on operational stock (no direct manual edits)'
    },
    {
      role: 'ADMIN' as UserRole,
      title: 'Hospital Administrator',
      name: 'Marcus Vance',
      icon: ShieldCheck,
      color: 'border-amber-500 bg-amber-50/50',
      badge: 'bg-[#F4B400] text-[#12332C]',
      desc: 'Oversees enterprise data governance, reviews immutable audit ledgers, and manages system accounts across the organization.',
      permissions: [
        'Full administrative override capability',
        'Inspect immutable audit ledger',
        'Manage hospital accounts & roles',
        'Organization-wide diagnostics'
      ],
      restrictions: 'Superuser access (No branch required)'
    }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-3xl max-w-2xl w-full border border-[#D9E8E3] shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-5 bg-[#004D3A] text-white flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-[#006B4F] border border-white/20 flex items-center justify-center shadow-md">
              <Lock className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-wide">Hospital Security & RBAC Portal</h2>
              <p className="text-xs text-[#D9E8E3]/80">Select role and organizational scope to switch authenticated session</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-4">
          {/* Organization Scope Pickers */}
          <div className="p-4 bg-[#F3FAF7] border border-[#D9E8E3] rounded-2xl grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-[#12332C] uppercase tracking-wider mb-1 flex items-center space-x-1">
                <Building2 className="w-3.5 h-3.5 text-[#006B4F]" />
                <span>Select Company</span>
              </label>
              <select
                value={companyId}
                onChange={(e) => {
                  const newCompId = Number(e.target.value);
                  setCompanyId(newCompId);
                  const comp = companies.find((c) => c.id === newCompId);
                  if (comp && comp.branches && comp.branches.length > 0) {
                    setBranchId(comp.branches[0].id);
                  }
                }}
                className="w-full bg-white border border-[#D9E8E3] rounded-xl px-3 py-2 text-xs font-semibold text-[#12332C] focus:outline-none focus:border-[#006B4F]"
              >
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.code})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-[#12332C] uppercase tracking-wider mb-1 flex items-center space-x-1">
                <MapPin className="w-3.5 h-3.5 text-[#008F83]" />
                <span>Select Branch (Facility)</span>
              </label>
              <select
                value={branchId}
                onChange={(e) => setBranchId(Number(e.target.value))}
                className="w-full bg-white border border-[#D9E8E3] rounded-xl px-3 py-2 text-xs font-semibold text-[#12332C] focus:outline-none focus:border-[#008F83]"
              >
                {availableBranches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} ({b.location || b.code})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="bg-[#F3FAF7] border border-[#D9E8E3] rounded-2xl p-3 text-xs text-[#2D5A50] flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-[#006B4F] shrink-0" />
            <span>
              <strong>Access Scope:</strong> Switching role updates your JWT session to target Company + Branch.
            </span>
          </div>

          <div className="grid grid-cols-1 gap-3.5">
            {roleProfiles.map((p) => {
              const Icon = p.icon;
              const isCurrent = role === p.role;

              return (
                <div
                  key={p.role}
                  onClick={() => handleSelectRole(p.role)}
                  className={`p-4 rounded-2xl border-2 transition-all cursor-pointer hover:shadow-md relative ${
                    isCurrent
                      ? 'border-[#006B4F] bg-[#F3FAF7] shadow-sm'
                      : 'border-[#D9E8E3] hover:border-[#008F83] bg-white'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3">
                      <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${
                        isCurrent ? 'bg-[#006B4F] text-white shadow-sm' : 'bg-[#E6F4F0] text-[#006B4F]'
                      }`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <h3 className="text-sm font-bold text-[#12332C]">{p.title}</h3>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${p.badge}`}>
                            {p.role}
                          </span>
                        </div>
                        <p className="text-xs text-[#647772] font-medium">{p.name}</p>
                      </div>
                    </div>

                    {isCurrent ? (
                      <span className="flex items-center space-x-1 text-xs font-bold text-[#006B4F] bg-[#006B4F]/10 px-2.5 py-1 rounded-full border border-[#006B4F]/20">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Active Session</span>
                      </span>
                    ) : (
                      <button
                        disabled={loading}
                        className="text-xs font-semibold text-[#006B4F] hover:text-[#004D3A] flex items-center space-x-1 bg-[#E6F4F0] px-3 py-1 rounded-full hover:bg-[#D9E8E3] transition-colors"
                      >
                        <span>Switch</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    )}
                  </div>

                  <p className="text-xs text-[#2D5A50] mt-2.5">{p.desc}</p>

                  <div className="mt-3 grid grid-cols-2 gap-1.5 pt-2.5 border-t border-[#D9E8E3]/60">
                    <div className="text-[11px] text-[#12332C]">
                      <span className="font-semibold text-[#006B4F]">Authorizations:</span>
                      <ul className="list-disc list-inside text-[#647772] text-[10px] mt-0.5 space-y-0.5">
                        {p.permissions.slice(0, 2).map((perm, idx) => (
                          <li key={idx} className="truncate">{perm}</li>
                        ))}
                      </ul>
                    </div>
                    <div className="text-[11px]">
                      <span className="font-semibold text-rose-700">Governance Scope:</span>
                      <p className="text-[#647772] text-[10px] mt-0.5 leading-snug">{p.restrictions}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-[#F3FAF7] border-t border-[#D9E8E3] flex items-center justify-between">
          <div className="text-xs text-[#647772]">
            Current Actor: <strong>{user?.display_name || 'Liam Patel'}</strong> ({role}) • {user?.company_name || 'ABC Healthcare'}{role !== 'ADMIN' && user?.branch_name ? ` / ${user.branch_name}` : ''}
          </div>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-full bg-[#006B4F] hover:bg-[#004D3A] text-white text-xs font-bold transition-all shadow-sm"
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  );
};

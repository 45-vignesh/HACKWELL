import React from 'react';
import { Database, ShieldCheck, Building2, ArrowRight, Shield, Activity } from 'lucide-react';
import { AuthPortalView } from '../../context/AuthContext';

interface RoleSelectionScreenProps {
  onSelectRole: (role: AuthPortalView) => void;
}

export const RoleSelectionScreen: React.FC<RoleSelectionScreenProps> = ({ onSelectRole }) => {
  return (
    <div className="min-h-screen bg-[#E6F4F0] flex items-center justify-center p-4 sm:p-6 md:p-8 font-sans text-[#12332C]">
      <div className="w-full max-w-5xl bg-[#F3FAF7] border border-[#D9E8E3] rounded-[32px] p-6 sm:p-10 md:p-12 shadow-app-frame">
        {/* Brand Header */}
        <div className="text-center mb-10 sm:mb-12">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-white border border-[#D9E8E3] shadow-sm mb-4">
            <Activity className="w-8 h-8 text-[#006B4F]" />
          </div>
          <div className="flex items-center justify-center space-x-2 mb-2">
            <span className="text-xs uppercase tracking-widest font-extrabold text-[#006B4F] bg-[#006B4F]/10 px-3 py-1 rounded-full border border-[#006B4F]/20">
              Hospital Intelligence & Governance
            </span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-[#12332C] tracking-tight">
            MediSentinel Secure Access
          </h1>
          <p className="mt-2 text-base text-[#647772] font-medium">
            Choose your role to continue
          </p>
        </div>

        {/* 3 Separate Role Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
          {/* Card 1: DATA MANAGER */}
          <div className="bg-white border border-[#D9E8E3] hover:border-[#006B4F] rounded-3xl p-6 sm:p-7 flex flex-col justify-between shadow-card hover:shadow-card-hover transition-all duration-300 group">
            <div>
              {/* Role Badge & Icon */}
              <div className="flex items-center justify-between mb-6">
                <span className="text-[11px] font-extrabold uppercase tracking-wider px-3 py-1 rounded-full bg-[#006B4F] text-white">
                  DATA MANAGER
                </span>
                <div className="w-12 h-12 rounded-2xl bg-[#006B4F]/10 border border-[#006B4F]/20 flex items-center justify-center text-[#006B4F] group-hover:bg-[#006B4F] group-hover:text-white transition-all">
                  <Database className="w-6 h-6" />
                </div>
              </div>

              {/* Title & Description */}
              <h2 className="text-xl font-bold text-[#12332C] mb-1">
                Inventory & Data Management
              </h2>
              <p className="text-xs text-[#006B4F] font-semibold mb-3">
                Operational Stock & CSV Portal
              </p>
              <p className="text-sm text-[#647772] leading-relaxed">
                Maintain trusted hospital inventory and operational data.
              </p>
            </div>

            {/* Dedicated Action Button */}
            <div className="mt-8 pt-6 border-t border-[#D9E8E3]/60">
              <button
                onClick={() => onSelectRole('data_manager')}
                className="w-full py-3 px-4 rounded-2xl bg-[#006B4F] hover:bg-[#004D3A] text-white font-bold text-sm flex items-center justify-center space-x-2 shadow-sm transition-all active:scale-98 group-hover:shadow-md"
              >
                <span>Data Manager Login</span>
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </button>
            </div>
          </div>

          {/* Card 2: CHIEF PHARMACIST */}
          <div className="bg-white border border-[#D9E8E3] hover:border-[#008F83] rounded-3xl p-6 sm:p-7 flex flex-col justify-between shadow-card hover:shadow-card-hover transition-all duration-300 group">
            <div>
              {/* Role Badge & Icon */}
              <div className="flex items-center justify-between mb-6">
                <span className="text-[11px] font-extrabold uppercase tracking-wider px-3 py-1 rounded-full bg-[#008F83] text-white">
                  CHIEF PHARMACIST
                </span>
                <div className="w-12 h-12 rounded-2xl bg-[#008F83]/10 border border-[#008F83]/20 flex items-center justify-center text-[#008F83] group-hover:bg-[#008F83] group-hover:text-white transition-all">
                  <ShieldCheck className="w-6 h-6" />
                </div>
              </div>

              {/* Title & Description */}
              <h2 className="text-xl font-bold text-[#12332C] mb-1">
                Clinical Approval & AI Oversight
              </h2>
              <p className="text-xs text-[#008F83] font-semibold mb-3">
                Clinical Intelligence & Approvals
              </p>
              <p className="text-sm text-[#647772] leading-relaxed">
                Review forecasts, alerts and approve high-risk AI recommendations.
              </p>
            </div>

            {/* Dedicated Action Button */}
            <div className="mt-8 pt-6 border-t border-[#D9E8E3]/60">
              <button
                onClick={() => onSelectRole('pharmacist')}
                className="w-full py-3 px-4 rounded-2xl bg-[#008F83] hover:bg-[#007066] text-white font-bold text-sm flex items-center justify-center space-x-2 shadow-sm transition-all active:scale-98 group-hover:shadow-md"
              >
                <span>Chief Pharmacist Login</span>
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </button>
            </div>
          </div>

          {/* Card 3: HOSPITAL ADMINISTRATOR */}
          <div className="bg-white border border-[#D9E8E3] hover:border-[#F4B400] rounded-3xl p-6 sm:p-7 flex flex-col justify-between shadow-card hover:shadow-card-hover transition-all duration-300 group">
            <div>
              {/* Role Badge & Icon */}
              <div className="flex items-center justify-between mb-6">
                <span className="text-[11px] font-extrabold uppercase tracking-wider px-3 py-1 rounded-full bg-[#F4B400] text-[#12332C]">
                  HOSPITAL ADMINISTRATOR
                </span>
                <div className="w-12 h-12 rounded-2xl bg-[#F4B400]/15 border border-[#F4B400]/30 flex items-center justify-center text-[#12332C] group-hover:bg-[#F4B400] transition-all">
                  <Building2 className="w-6 h-6" />
                </div>
              </div>

              {/* Title & Description */}
              <h2 className="text-xl font-bold text-[#12332C] mb-1">
                System Administration
              </h2>
              <p className="text-xs text-[#b88500] font-semibold mb-3">
                Governance & User Access
              </p>
              <p className="text-sm text-[#647772] leading-relaxed">
                Manage hospital system access, users and governance.
              </p>
            </div>

            {/* Dedicated Action Button */}
            <div className="mt-8 pt-6 border-t border-[#D9E8E3]/60">
              <button
                onClick={() => onSelectRole('admin')}
                className="w-full py-3 px-4 rounded-2xl bg-[#F4B400] hover:bg-[#e0a400] text-[#12332C] font-extrabold text-sm flex items-center justify-center space-x-2 shadow-sm transition-all active:scale-98 group-hover:shadow-md"
              >
                <span>Administrator Login</span>
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </button>
            </div>
          </div>
        </div>

        {/* Security Footer Notice */}
        <div className="mt-10 sm:mt-12 text-center flex items-center justify-center space-x-2 text-xs text-[#647772]">
          <Shield className="w-4 h-4 text-[#006B4F]" />
          <span>Enterprise Role-Based Access Control & End-to-End Cryptographic Audit Ledger</span>
        </div>
      </div>
    </div>
  );
};

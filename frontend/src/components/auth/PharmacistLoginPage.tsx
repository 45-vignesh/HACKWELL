import React, { useState, useEffect } from 'react';
import { ShieldCheck, ArrowLeft, Lock, User, AlertCircle, Building2, MapPin, ArrowRight, CheckCircle2, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Company, Branch } from '../../types';
import { api } from '../../services/api';

interface PharmacistLoginPageProps {
  onBack: () => void;
  onGoToRegister?: () => void;
}

const DEFAULT_COMPANIES: Company[] = [
  {
    id: 1,
    name: 'ABC Healthcare',
    code: 'ABC-HC',
    status: 'ACTIVE',
    branches: [
      { id: 1, company_id: 1, name: 'Chennai Main Hospital', code: 'ABC-CHN-MAIN', location: 'Central Chennai', status: 'ACTIVE' },
      { id: 2, company_id: 1, name: 'Anna Nagar Branch', code: 'ABC-ANNA-NGR', location: 'Anna Nagar, Chennai', status: 'ACTIVE' },
      { id: 3, company_id: 1, name: 'Tambaram Branch', code: 'ABC-TMB-BR', location: 'Tambaram, Chennai', status: 'ACTIVE' },
    ]
  },
  {
    id: 2,
    name: 'Apex Global Health',
    code: 'APEX-GH',
    status: 'ACTIVE',
    branches: [
      { id: 4, company_id: 2, name: 'Apex City Medical Center', code: 'APEX-CITY-01', location: 'Metro Hub, Chennai', status: 'ACTIVE' },
      { id: 5, company_id: 2, name: 'Apex North Outpost', code: 'APEX-NORTH-02', location: 'North Corridor, Chennai', status: 'ACTIVE' },
    ]
  }
];

export const PharmacistLoginPage: React.FC<PharmacistLoginPageProps> = ({ onBack, onGoToRegister }) => {
  const { loginWithCredentials } = useAuth();

  const [companies, setCompanies] = useState<Company[]>(DEFAULT_COMPANIES);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const cId = Number(params.get('company_id'));
      if (cId) return DEFAULT_COMPANIES.find(c => c.id === cId) || DEFAULT_COMPANIES[0];
    } catch {}
    return DEFAULT_COMPANIES[0];
  });

  const [selectedBranch, setSelectedBranch] = useState<Branch | null>(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const bId = Number(params.get('branch_id'));
      const cId = Number(params.get('company_id')) || 1;
      const comp = DEFAULT_COMPANIES.find(c => c.id === cId) || DEFAULT_COMPANIES[0];
      if (bId && comp.branches) return comp.branches.find(b => b.id === bId) || comp.branches[0];
      if (comp.branches && comp.branches.length > 0) return comp.branches[0];
    } catch {}
    return DEFAULT_COMPANIES[0].branches![0];
  });

  const [step, setStep] = useState<'company' | 'branch' | 'login'>(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const s = params.get('step') as 'company' | 'branch' | 'login';
      if (s) return s;
    } catch {}
    return 'company';
  });

  const [username, setUsername] = useState('pharmacist');
  const [password, setPassword] = useState('Pharmacist@123');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchOrgData = async () => {
      try {
        const data = await api.getCompanies();
        if (data && data.length > 0) {
          setCompanies(data);
        }
      } catch (err) {
        console.error('Failed to load companies:', err);
      }
    };
    fetchOrgData();
  }, []);

  const handleSelectCompany = (comp: Company) => {
    setSelectedCompany(comp);
    setSelectedBranch(comp.branches && comp.branches.length > 0 ? comp.branches[0] : null);
    setError(null);
    setStep('branch');
  };

  const handleSelectBranch = (br: Branch) => {
    setSelectedBranch(br);
    setError(null);
    setStep('login');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCompany) {
      setError('Please select a company.');
      return;
    }
    if (!selectedBranch) {
      setError('Please select a branch.');
      return;
    }

    setError(null);
    setLoading(true);
    try {
      await loginWithCredentials(username, password, 'PHARMACIST', selectedCompany.id, selectedBranch.id);
    } catch (err: any) {
      const msg = err.response?.data?.detail || err.message || 'Authentication failed. Please verify credentials.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleUseDemo = () => {
    setUsername('pharmacist');
    setPassword('Pharmacist@123');
    setError(null);
  };

  return (
    <div className="min-h-screen bg-transparent flex items-center justify-center p-4 sm:p-6 font-sans text-[#12332C] relative z-10">
      <div className="w-full max-w-md bg-[#F3FAF7]/85 backdrop-blur-md border border-[#D9E8E3] rounded-[32px] p-6 sm:p-8 shadow-app-frame">
        {/* Navigation Back */}
        {step === 'company' && (
          <button
            onClick={onBack}
            className="inline-flex items-center space-x-2 text-xs font-semibold text-[#647772] hover:text-[#008F83] mb-6 transition-colors group"
          >
            <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
            <span>Back to Role Selection</span>
          </button>
        )}
        {step === 'branch' && (
          <button
            onClick={() => { setStep('company'); setError(null); }}
            className="inline-flex items-center space-x-2 text-xs font-semibold text-[#647772] hover:text-[#008F83] mb-6 transition-colors group"
          >
            <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
            <span>Back to Company Selection</span>
          </button>
        )}
        {step === 'login' && (
          <button
            onClick={() => { setStep('branch'); setError(null); }}
            className="inline-flex items-center space-x-2 text-xs font-semibold text-[#647772] hover:text-[#008F83] mb-6 transition-colors group"
          >
            <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
            <span>Back to Branch Selection</span>
          </button>
        )}

        {/* Stepped Progress Indicator */}
        <div className="flex items-center justify-between mb-6 px-1 border-b border-[#D9E8E3]/60 pb-3">
          <div className={`flex items-center space-x-1.5 text-[11px] font-bold ${step === 'company' ? 'text-[#008F83]' : 'text-[#647772]'}`}>
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${step === 'company' ? 'bg-[#008F83] text-white shadow-xs' : 'bg-[#D9E8E3] text-[#12332C]'}`}>1</span>
            <span>Company</span>
          </div>
          <span className="text-[#D9E8E3] font-bold">→</span>
          <div className={`flex items-center space-x-1.5 text-[11px] font-bold ${step === 'branch' ? 'text-[#008F83]' : 'text-[#647772]'}`}>
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${step === 'branch' ? 'bg-[#008F83] text-white shadow-xs' : 'bg-[#D9E8E3] text-[#12332C]'}`}>2</span>
            <span>Branch</span>
          </div>
          <span className="text-[#D9E8E3] font-bold">→</span>
          <div className={`flex items-center space-x-1.5 text-[11px] font-bold ${step === 'login' ? 'text-[#008F83]' : 'text-[#647772]'}`}>
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${step === 'login' ? 'bg-[#008F83] text-white shadow-xs' : 'bg-[#D9E8E3] text-[#12332C]'}`}>3</span>
            <span>Login</span>
          </div>
        </div>

        {/* Dedicated Header & Visual Identity */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[#008F83] text-white shadow-md mb-3">
            <ShieldCheck className="w-7 h-7" />
          </div>
          <div className="inline-block mb-1.5">
            <span className="text-[10px] font-extrabold uppercase tracking-wider px-3 py-0.5 rounded-full bg-[#008F83] text-white shadow-xs">
              CHIEF PHARMACIST
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-[#12332C] tracking-tight">
            {step === 'company' && 'Select Company'}
            {step === 'branch' && 'Select Branch'}
            {step === 'login' && 'Chief Pharmacist Login'}
          </h1>
          <p className="text-xs text-[#647772] mt-1 max-w-xs mx-auto">
            {step === 'company' && 'Choose your healthcare organization / enterprise.'}
            {step === 'branch' && `Choose a branch facility under ${selectedCompany?.name || 'organization'}.`}
            {step === 'login' && 'Clinical approval authority for AI forecasts and procurement.'}
          </p>
        </div>

        {/* Error Notification */}
        {error && (
          <div className="mb-5 p-3 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-start space-x-2 animate-shake">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* STEP 1: Select Company */}
        {step === 'company' && (
          <div className="space-y-3">
            <p className="text-xs font-bold text-[#12332C] uppercase tracking-wider mb-2">Available Organizations</p>
            {companies.map((c) => (
              <button
                key={c.id}
                onClick={() => handleSelectCompany(c)}
                className={`w-full p-4 rounded-2xl border text-left flex items-center justify-between transition-all group ${
                  selectedCompany?.id === c.id
                    ? 'bg-white border-[#008F83] shadow-sm ring-1 ring-[#008F83]/20'
                    : 'bg-white/80 border-[#D9E8E3] hover:border-[#008F83] hover:bg-white'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-xl bg-[#008F83]/10 border border-[#008F83]/20 flex items-center justify-center text-[#008F83] group-hover:bg-[#008F83] group-hover:text-white transition-colors">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-[#12332C]">{c.name}</h3>
                    <p className="text-[11px] text-[#647772]">Code: {c.code} • {c.branches?.length || 0} Branches</p>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-[#647772] group-hover:text-[#008F83] group-hover:translate-x-1 transition-all" />
              </button>
            ))}
          </div>
        )}

        {/* STEP 2: Select Branch */}
        {step === 'branch' && (
          <div className="space-y-3">
            <div className="p-3 bg-white/70 border border-[#D9E8E3] rounded-2xl mb-3 flex items-center justify-between text-xs">
              <span className="text-[#647772]">Selected Organization:</span>
              <span className="font-bold text-[#008F83]">{selectedCompany?.name}</span>
            </div>
            <p className="text-xs font-bold text-[#12332C] uppercase tracking-wider mb-2">Facilities in {selectedCompany?.name}</p>
            {selectedCompany?.branches && selectedCompany.branches.length > 0 ? (
              selectedCompany.branches.map((b) => (
                <button
                  key={b.id}
                  onClick={() => handleSelectBranch(b)}
                  className={`w-full p-4 rounded-2xl border text-left flex items-center justify-between transition-all group ${
                    selectedBranch?.id === b.id
                      ? 'bg-white border-[#008F83] shadow-sm ring-1 ring-[#008F83]/20'
                      : 'bg-white/80 border-[#D9E8E3] hover:border-[#008F83] hover:bg-white'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-xl bg-[#008F83]/10 border border-[#008F83]/20 flex items-center justify-center text-[#008F83] group-hover:bg-[#008F83] group-hover:text-white transition-colors">
                      <MapPin className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-[#12332C]">{b.name}</h3>
                      <p className="text-[11px] text-[#647772]">{b.location || 'Hospital Branch'} • {b.code}</p>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-[#647772] group-hover:text-[#008F83] group-hover:translate-x-1 transition-all" />
                </button>
              ))
            ) : (
              <p className="text-xs text-[#647772]">No branches configured for this organization.</p>
            )}
          </div>
        )}

        {/* STEP 3: Enter Credentials & Context Banner */}
        {step === 'login' && (
          <div>
            {/* Selected Context Summary Banner */}
            <div className="mb-4 p-3.5 rounded-2xl bg-white border border-[#D9E8E3] shadow-xs text-xs space-y-1.5">
              <div className="flex justify-between items-center">
                <span className="text-[#647772]">Company:</span>
                <span className="font-bold text-[#008F83]">{selectedCompany?.name}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[#647772]">Branch:</span>
                <span className="font-bold text-[#008F83]">{selectedBranch?.name}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[#647772]">Role:</span>
                <span className="font-bold text-[#008F83]">Chief Pharmacist</span>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#12332C] mb-1.5">
                  Username
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-[#647772] absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Enter username"
                    className="w-full bg-white border border-[#D9E8E3] rounded-2xl pl-10 pr-4 py-2.5 text-xs text-[#12332C] placeholder-[#647772] focus:outline-none focus:border-[#008F83] focus:ring-1 focus:ring-[#008F83] transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#12332C] mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-[#647772] absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full bg-white border border-[#D9E8E3] rounded-2xl pl-10 pr-10 py-2.5 text-xs text-[#12332C] placeholder-[#647772] focus:outline-none focus:border-[#008F83] focus:ring-1 focus:ring-[#008F83] transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#647772] hover:text-[#12332C]"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Standard Role Credentials Helper */}
              <div className="p-3 bg-white/70 border border-[#D9E8E3] rounded-2xl flex items-center justify-between">
                <div className="text-[11px] text-[#647772]">
                  <span className="font-bold text-[#12332C]">Role Credentials:</span>
                  <div className="font-mono text-[10px] text-[#008F83]">pharmacist / Pharmacist@123</div>
                </div>
                <button
                  type="button"
                  onClick={handleUseDemo}
                  className="px-2.5 py-1 text-[11px] font-bold text-[#008F83] bg-[#008F83]/10 hover:bg-[#008F83]/20 rounded-xl transition-colors"
                >
                  Use Role Credentials
                </button>
              </div>

              {/* Sign In CTA */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 rounded-2xl bg-[#008F83] hover:bg-[#007066] text-white font-bold text-sm shadow-md hover:shadow-lg transition-all active:scale-98 disabled:opacity-50 flex items-center justify-center space-x-2"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Sign In</span>
                  </>
                )}
              </button>
            </form>
          </div>
        )}

        {/* Link to Register */}
        {onGoToRegister && (
          <div className="mt-5 text-center text-xs text-[#647772]">
            <span>Need an account? </span>
            <button
              onClick={onGoToRegister}
              className="font-bold text-[#008F83] hover:underline"
            >
              Register as Chief Pharmacist
            </button>
          </div>
        )}

        {/* Data Governance Disclaimer */}
        <div className="mt-5 text-center text-[10px] text-[#647772] border-t border-[#D9E8E3]/60 pt-4 leading-relaxed">
          Chief Pharmacists are clinical authority holders authorized to approve drug orders, transfer requests, and monitor predictive safety buffers for the selected facility.
        </div>
      </div>
    </div>
  );
};

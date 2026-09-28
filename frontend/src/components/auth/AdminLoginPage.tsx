import React, { useState } from 'react';
import { Building2, ArrowLeft, Lock, User, AlertCircle, CheckCircle2, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface AdminLoginPageProps {
  onBack: () => void;
}

export const AdminLoginPage: React.FC<AdminLoginPageProps> = ({ onBack }) => {
  const { loginWithCredentials } = useAuth();
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('Admin@123');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await loginWithCredentials(username, password, 'ADMIN');
    } catch (err: any) {
      const msg = err.response?.data?.detail || err.message || 'Authentication failed. Please verify credentials.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleUseDemo = () => {
    setUsername('admin');
    setPassword('Admin@123');
    setError(null);
  };

  return (
    <div className="min-h-screen bg-transparent flex items-center justify-center p-4 sm:p-6 font-sans text-[#12332C] relative z-10">
      <div className="w-full max-w-md bg-[#F3FAF7]/92 backdrop-blur-md border border-[#D9E8E3] rounded-[32px] p-6 sm:p-8 shadow-app-frame">
        {/* Navigation Back */}
        <button
          onClick={onBack}
          className="inline-flex items-center space-x-2 text-xs font-semibold text-[#647772] hover:text-[#12332C] mb-6 transition-colors group"
        >
          <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
          <span>Back to Role Selection</span>
        </button>

        {/* Dedicated Header & Visual Identity */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-3xl bg-[#F4B400] text-[#12332C] shadow-md mb-4">
            <Building2 className="w-8 h-8" />
          </div>
          <div className="inline-block mb-2">
            <span className="text-[11px] font-extrabold uppercase tracking-wider px-3.5 py-1 rounded-full bg-[#F4B400] text-[#12332C] shadow-xs">
              HOSPITAL ADMINISTRATOR
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#12332C] tracking-tight">
            Hospital Administrator Login
          </h1>
          <p className="text-xs text-[#b88500] font-bold mt-1">
            Hospital Systems Administration Portal
          </p>
          <p className="text-xs text-[#647772] mt-2 max-w-xs mx-auto">
            Manage hospital system access, users and governance.
          </p>
        </div>

        {/* Error Notification */}
        {error && (
          <div className="mb-5 p-3 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-start space-x-2 animate-shake">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Dedicated Form */}
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
                className="w-full bg-white border border-[#D9E8E3] rounded-2xl pl-10 pr-4 py-2.5 text-xs text-[#12332C] placeholder-[#647772] focus:outline-none focus:border-[#F4B400] focus:ring-1 focus:ring-[#F4B400] transition-all"
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
                placeholder="Enter password"
                className="w-full bg-white border border-[#D9E8E3] rounded-2xl pl-10 pr-10 py-2.5 text-xs text-[#12332C] placeholder-[#647772] focus:outline-none focus:border-[#F4B400] focus:ring-1 focus:ring-[#F4B400] transition-all"
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

          {/* Dedicated Role Credentials Box */}
          <div className="p-3 bg-white border border-[#D9E8E3] rounded-2xl flex items-center justify-between text-xs">
            <div>
              <p className="font-semibold text-[#12332C]">Role Credentials:</p>
              <p className="text-[11px] text-[#647772] font-mono mt-0.5">
                admin / Admin@123
              </p>
            </div>
            <button
              type="button"
              onClick={handleUseDemo}
              className="text-[11px] font-extrabold text-[#12332C] hover:underline px-2.5 py-1 rounded-lg bg-[#F4B400]/20 hover:bg-[#F4B400]/30 transition-colors"
            >
              Use Role Credentials
            </button>
          </div>

          {/* Primary Action Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 rounded-2xl bg-[#F4B400] hover:bg-[#e0a400] text-[#12332C] font-extrabold text-xs sm:text-sm flex items-center justify-center space-x-2 shadow-sm transition-all active:scale-98 disabled:opacity-50 mt-2"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-[#12332C] border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>Sign In as Administrator</span>
              </>
            )}
          </button>
        </form>

        {/* Permissions Disclaimer */}
        <div className="mt-6 pt-4 border-t border-[#D9E8E3]/60 text-center">
          <p className="text-[11px] text-[#647772]">
            Administrators have universal system access, user and credential administration, and full data governance audit trail review privileges.
          </p>
        </div>
      </div>
    </div>
  );
};

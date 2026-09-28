import React, { useState } from 'react';
import { ShieldCheck, ArrowLeft, Lock, User, Mail, AlertCircle, CheckCircle2, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface PharmacistRegisterPageProps {
  onBack: () => void;
  onGoToLogin: () => void;
}

export const PharmacistRegisterPage: React.FC<PharmacistRegisterPageProps> = ({ onBack, onGoToLogin }) => {
  const { registerAccount } = useAuth();
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!fullName.trim() || !username.trim() || !email.trim() || !password || !confirmPassword) {
      setError('All fields are required.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      await registerAccount({
        full_name: fullName.trim(),
        username: username.trim().toLowerCase(),
        email: email.trim().toLowerCase(),
        password,
        confirm_password: confirmPassword,
        role: 'PHARMACIST'
      });
      setSuccess(true);
    } catch (err: any) {
      const msg = err.response?.data?.detail || err.message || 'Registration failed. Please check details.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-transparent flex items-center justify-center p-4 sm:p-6 font-sans text-[#12332C] relative z-10">
      <div className="w-full max-w-md bg-[#F3FAF7]/92 backdrop-blur-md border border-[#D9E8E3] rounded-[32px] p-6 sm:p-8 shadow-app-frame">
        {/* Navigation Back */}
        <button
          onClick={onBack}
          className="inline-flex items-center space-x-2 text-xs font-semibold text-[#647772] hover:text-[#008F83] mb-6 transition-colors group"
        >
          <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
          <span>Back to Role Selection</span>
        </button>

        {/* Dedicated Header & Visual Identity */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-3xl bg-[#008F83] text-white shadow-md mb-4">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <div className="inline-block mb-2">
            <span className="text-[11px] font-extrabold uppercase tracking-wider px-3.5 py-1 rounded-full bg-[#008F83] text-white shadow-xs">
              CHIEF PHARMACIST
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#12332C] tracking-tight">
            Create Chief Pharmacist Account
          </h1>
          <p className="text-xs text-[#008F83] font-bold mt-1">
            Clinical Approval & AI Oversight Portal
          </p>
          <p className="text-xs text-[#647772] mt-2 max-w-xs mx-auto">
            Authorized portal for AI forecast reviews, drug order approvals, and clinical oversight.
          </p>
        </div>

        {/* Success View */}
        {success ? (
          <div className="text-center py-6 space-y-4">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 mb-2">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-[#12332C]">Registration Successful</h3>
            <p className="text-sm text-[#647772]">
              Registration successful. You can now sign in.
            </p>
            <button
              onClick={onGoToLogin}
              className="w-full mt-4 py-3 px-4 rounded-2xl bg-[#008F83] hover:bg-[#007066] text-white font-bold text-sm shadow-md transition-all active:scale-98"
            >
              Go to Login
            </button>
          </div>
        ) : (
          <>
            {/* Error Notification */}
            {error && (
              <div className="mb-5 p-3 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-start space-x-2 animate-shake">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {/* Registration Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#12332C] uppercase tracking-wider mb-1.5">
                  Full Name
                </label>
                <div className="relative">
                  <User className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#647772]" />
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Dr. Sarah Alston"
                    className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-white border border-[#D9E8E3] focus:border-[#008F83] focus:ring-2 focus:ring-[#008F83]/20 text-sm text-[#12332C] placeholder-[#9CA3AF] transition-all outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#12332C] uppercase tracking-wider mb-1.5">
                  Username
                </label>
                <div className="relative">
                  <User className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#647772]" />
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="salston"
                    className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-white border border-[#D9E8E3] focus:border-[#008F83] focus:ring-2 focus:ring-[#008F83]/20 text-sm text-[#12332C] placeholder-[#9CA3AF] transition-all outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#12332C] uppercase tracking-wider mb-1.5">
                  Email
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#647772]" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="sarah.alston@hospital.org"
                    className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-white border border-[#D9E8E3] focus:border-[#008F83] focus:ring-2 focus:ring-[#008F83]/20 text-sm text-[#12332C] placeholder-[#9CA3AF] transition-all outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#12332C] uppercase tracking-wider mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#647772]" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 6 characters"
                    className="w-full pl-10 pr-10 py-2.5 rounded-2xl bg-white border border-[#D9E8E3] focus:border-[#008F83] focus:ring-2 focus:ring-[#008F83]/20 text-sm text-[#12332C] placeholder-[#9CA3AF] transition-all outline-none"
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

              <div>
                <label className="block text-xs font-bold text-[#12332C] uppercase tracking-wider mb-1.5">
                  Confirm Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#647772]" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter password"
                    className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-white border border-[#D9E8E3] focus:border-[#008F83] focus:ring-2 focus:ring-[#008F83]/20 text-sm text-[#12332C] placeholder-[#9CA3AF] transition-all outline-none"
                  />
                </div>
              </div>

              {/* Locked Role Notification */}
              <div className="p-3 rounded-2xl bg-[#008F83]/10 border border-[#008F83]/20 text-xs text-[#008F83] flex items-center justify-between font-medium">
                <span>Account Role:</span>
                <span className="font-extrabold uppercase">PHARMACIST (Locked)</span>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 rounded-2xl bg-[#008F83] hover:bg-[#007066] text-white font-bold text-sm shadow-md transition-all active:scale-98 disabled:opacity-50 mt-2"
              >
                {loading ? 'Creating Account...' : 'Create Account'}
              </button>
            </form>

            {/* Switch to Login */}
            <div className="mt-6 text-center text-xs text-[#647772]">
              <span>Already have an account? </span>
              <button
                onClick={onGoToLogin}
                className="font-bold text-[#008F83] hover:underline"
              >
                Sign In
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

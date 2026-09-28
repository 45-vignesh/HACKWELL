import React from 'react';
import { Search, Sparkles, Zap, RefreshCw, Calendar, Shield, User, ChevronDown, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types';

interface HeaderProps {
  currentRole?: UserRole | string;
  setCurrentRole?: (role: any) => void;
  onOpenAssistant: () => void;
  onRunSimulation: () => void;
  onRefreshData: () => void;
  isRefreshing?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  currentRole,
  setCurrentRole,
  onOpenAssistant,
  onRunSimulation,
  onRefreshData,
  isRefreshing = false
}) => {
  const { user, role, switchRole, setIsLoginModalOpen, logout } = useAuth();

  // Today formatted like "28 Sep, 2026"
  const formattedDate = new Date().toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });

  const getRoleBadgeStyle = (r: string) => {
    switch (r) {
      case 'DATA_MANAGER':
        return 'bg-[#006B4F] text-white border-emerald-500';
      case 'ADMIN':
        return 'bg-[#F4B400] text-[#12332C] border-amber-500';
      case 'PHARMACIST':
      default:
        return 'bg-[#008F83] text-white border-teal-500';
    }
  };

  return (
    <header className="h-16 px-6 flex items-center justify-between border-b border-[#D9E8E3] bg-white/95 backdrop-blur-md sticky top-0 z-20">
      {/* Search Input */}
      <div className="flex-1 max-w-sm">
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-[#647772] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search telemetry, medicines, batches..."
            className="w-full bg-[#F3FAF7] border border-[#D9E8E3] rounded-full pl-9 pr-4 py-2 text-xs text-[#12332C] placeholder-[#647772] focus:outline-none focus:border-[#006B4F] focus:ring-1 focus:ring-[#006B4F] transition-all"
          />
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center space-x-3">
        {/* Refresh circular button */}
        <button
          onClick={onRefreshData}
          title="Refresh live telemetry"
          className="w-9 h-9 rounded-full bg-[#F3FAF7] border border-[#D9E8E3] flex items-center justify-center text-[#647772] hover:text-[#006B4F] hover:bg-white hover:border-[#008F83] transition-all"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-[#006B4F]' : ''}`} />
        </button>

        {/* AI Assistant button */}
        <button
          onClick={onOpenAssistant}
          title="Sentinel AI Assistant"
          className="w-9 h-9 rounded-full bg-[#F3FAF7] border border-[#D9E8E3] flex items-center justify-center text-[#008F83] hover:text-[#006B4F] hover:border-[#006B4F]/40 relative transition-all"
        >
          <Sparkles className="w-3.5 h-3.5 text-[#008F83] animate-pulse" />
          <span className="absolute top-2 right-2 w-1.5 h-1.5 bg-[#006B4F] rounded-full"></span>
        </button>

        {/* Date pill badge */}
        <div className="bg-[#F3FAF7] border border-[#D9E8E3] rounded-full px-3.5 py-1.5 flex items-center space-x-2 text-xs text-[#12332C] font-medium">
          <Calendar className="w-3.5 h-3.5 text-[#647772]" />
          <span>{formattedDate}</span>
        </div>

        {/* Primary Action Button: Accent Gold CTA */}
        <button
          onClick={onRunSimulation}
          className="px-4 py-1.5 rounded-full bg-[#F4B400] hover:bg-[#e0a400] text-[#12332C] text-xs font-bold shadow-sm flex items-center space-x-2 transition-all active:scale-95"
        >
          <Zap className="w-3.5 h-3.5 fill-[#12332C]" />
          <span>Dengue Surge Demo</span>
        </button>

        {/* Role Selector & Login Portal Button */}
        <div className="pl-2 border-l border-[#D9E8E3] flex items-center space-x-2">
          <button
            onClick={() => setIsLoginModalOpen(true)}
            title="Click to Switch User Role or View Security Boundaries"
            className="flex items-center space-x-2 bg-[#F3FAF7] hover:bg-white border border-[#D9E8E3] hover:border-[#008F83] rounded-full pl-2 pr-3 py-1 transition-all group"
          >
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-extrabold uppercase tracking-wider border ${getRoleBadgeStyle(role)}`}>
              {role.replace('_', ' ')}
            </span>
            <span className="text-xs font-semibold text-[#12332C] truncate max-w-[120px]">
              {user?.display_name || 'Dr. Sarah Alston'}
            </span>
            <ChevronDown className="w-3.5 h-3.5 text-[#647772] group-hover:text-[#006B4F] transition-colors" />
          </button>

          {/* Dedicated Logout Action */}
          <button
            onClick={logout}
            title="Sign out of MediSentinel"
            className="flex items-center space-x-1.5 px-3 py-1 rounded-full bg-[#F3FAF7] hover:bg-red-50 border border-[#D9E8E3] hover:border-red-200 text-[#647772] hover:text-red-600 transition-all text-xs font-semibold"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </div>
    </header>
  );
};


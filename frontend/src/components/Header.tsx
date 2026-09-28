import React from 'react';
import { Search, Sparkles, Zap, Shield, RefreshCw, Bell, Sun, Calendar } from 'lucide-react';

interface HeaderProps {
  currentRole: string;
  setCurrentRole: (role: string) => void;
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
  const roles = [
    'Chief Pharmacist (Approver)',
    'Central Store Manager',
    'Emergency Charge Nurse',
    'Hospital Administrator'
  ];

  // Today formatted like "25 Sep, 2026"
  const formattedDate = new Date().toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });

  return (
    <header className="h-16 px-6 flex items-center justify-between border-b border-white/[0.06] bg-[#16171d]/90 backdrop-blur-md sticky top-0 z-20">
      {/* Search Input matching reference pill style */}
      <div className="flex-1 max-w-sm">
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search telemetry, medicines, batches..."
            className="w-full bg-[#1c1d25] border border-white/[0.06] rounded-full pl-9 pr-4 py-2 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-ref-purple focus:ring-1 focus:ring-ref-purple transition-all"
          />
        </div>
      </div>

      {/* Right Controls matching reference style */}
      <div className="flex items-center space-x-3">
        {/* Theme / Refresh circular button */}
        <button
          onClick={onRefreshData}
          title="Refresh live telemetry"
          className="w-9 h-9 rounded-full bg-[#1c1d25] border border-white/[0.06] flex items-center justify-center text-zinc-400 hover:text-white hover:border-white/20 transition-all"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-ref-purple' : ''}`} />
        </button>

        {/* Notification bell circular button */}
        <button
          onClick={onOpenAssistant}
          title="Sentinel AI Assistant"
          className="w-9 h-9 rounded-full bg-[#1c1d25] border border-white/[0.06] flex items-center justify-center text-zinc-400 hover:text-ref-purple hover:border-ref-purple/40 relative transition-all"
        >
          <Sparkles className="w-3.5 h-3.5 text-ref-purpleLight animate-pulse" />
          <span className="absolute top-2 right-2 w-1.5 h-1.5 bg-ref-purple rounded-full"></span>
        </button>

        {/* Date pill badge matching reference "20 May, 2024" */}
        <div className="bg-[#1c1d25] border border-white/[0.06] rounded-full px-3.5 py-1.5 flex items-center space-x-2 text-xs text-zinc-300 font-medium">
          <Calendar className="w-3.5 h-3.5 text-zinc-400" />
          <span>{formattedDate}</span>
        </div>

        {/* Primary Action Button: Pill in vibrant purple gradient matching reference "Home" button */}
        <button
          onClick={onRunSimulation}
          className="px-4 py-1.5 rounded-full bg-gradient-to-r from-[#7c5cfc] via-[#8c6eff] to-[#9b72ff] hover:from-[#6c4cf0] hover:to-[#8c6eff] text-white text-xs font-semibold shadow-glow-purple flex items-center space-x-2 transition-all active:scale-95"
        >
          <Zap className="w-3.5 h-3.5 fill-current" />
          <span>Dengue Surge Demo</span>
        </button>

        {/* Role Selector Pill */}
        <div className="pl-2 border-l border-white/[0.06]">
          <select
            value={currentRole}
            onChange={(e) => setCurrentRole(e.target.value)}
            className="bg-[#1c1d25] border border-white/[0.06] text-zinc-300 text-xs rounded-full px-3 py-1.5 focus:outline-none focus:border-ref-purple cursor-pointer"
          >
            {roles.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </div>
      </div>
    </header>
  );
};

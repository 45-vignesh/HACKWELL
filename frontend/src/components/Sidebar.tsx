import React from 'react';
import {
  LayoutDashboard,
  Bell,
  Boxes,
  TrendingUp,
  ShieldCheck,
  ShoppingCart,
  ArrowLeftRight,
  Trash2,
  Bot,
  Zap,
  BarChart3,
  History,
  Activity,
  Star,
  Database
} from 'lucide-react';

export type ActiveTab =
  | 'dashboard'
  | 'alerts'
  | 'inventory'
  | 'forecasts'
  | 'approvals'
  | 'procurement'
  | 'distribution'
  | 'waste'
  | 'agents'
  | 'simulation'
  | 'analytics'
  | 'audit'
  | 'data-quality';

interface SidebarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  pendingApprovalsCount: number;
  criticalAlertsCount: number;
  currentRole: string;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  pendingApprovalsCount,
  criticalAlertsCount,
  currentRole
}) => {
  const workspaceItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'approvals', label: 'Approvals', icon: ShieldCheck, badge: pendingApprovalsCount, badgeColor: 'bg-emerald-500/20 text-emerald-400' },
    { id: 'alerts', label: 'Live Alerts', icon: Bell, badge: criticalAlertsCount, badgeColor: 'bg-rose-500/20 text-rose-400' },
    { id: 'inventory', label: 'Inventory', icon: Boxes },
    { id: 'forecasts', label: 'Forecasts', icon: TrendingUp },
  ];

  const operationsItems = [
    { id: 'procurement', label: 'Procurement', icon: ShoppingCart },
    { id: 'distribution', label: 'Transfers', icon: ArrowLeftRight },
    { id: 'waste', label: 'Waste Guard', icon: Trash2 },
    { id: 'agents', label: 'Agent Network', icon: Bot },
    { id: 'simulation', label: 'Dengue Demo', icon: Zap, highlight: true },
    { id: 'data-quality', label: 'Data Quality', icon: Database },
    { id: 'analytics', label: 'Pilot Targets', icon: BarChart3 },
    { id: 'audit', label: 'Audit Ledger', icon: History },
  ];

  const renderNavButton = (item: any) => {
    const Icon = item.icon;
    const isActive = activeTab === item.id;

    return (
      <button
        key={item.id}
        onClick={() => setActiveTab(item.id as ActiveTab)}
        className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs font-medium transition-all relative group ${
          isActive
            ? 'bg-[#232430] text-white shadow-sm border border-white/[0.04]'
            : item.highlight
            ? 'text-rose-400 hover:text-rose-300 hover:bg-rose-500/10'
            : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.03]'
        }`}
      >
        {/* Active Left Indicator Pill */}
        {isActive && (
          <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-5 bg-ref-purple rounded-r-full shadow-glow-purple-sm"></span>
        )}

        <div className="flex items-center space-x-3 ml-1">
          <Icon className={`w-4 h-4 transition-colors ${
            isActive
              ? 'text-ref-purple'
              : item.highlight
              ? 'text-rose-400 animate-pulse'
              : 'text-zinc-400 group-hover:text-zinc-200'
          }`} />
          <span className="tracking-wide text-xs">{item.label}</span>
        </div>

        {item.badge !== undefined && item.badge > 0 && (
          <span className={`px-2 py-0.5 text-[10px] font-mono rounded-full font-bold ${item.badgeColor}`}>
            {item.badge}
          </span>
        )}

        {item.highlight && !item.badge && (
          <span className="px-2 py-0.5 text-[9px] rounded-full font-bold uppercase bg-gradient-to-r from-rose-500 to-amber-500 text-white shadow-sm">
            DEMO
          </span>
        )}
      </button>
    );
  };

  return (
    <aside className="w-60 bg-[#16171d] border-r border-white/[0.06] flex flex-col h-full select-none justify-between p-4">
      <div className="space-y-6">
        {/* Brand Header matching reference logo style */}
        <div className="px-2 py-1 flex items-center space-x-3">
          <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-[#7c5cfc] via-[#8c6eff] to-[#a288fc] flex items-center justify-center shadow-glow-purple-sm">
            <svg viewBox="0 0 24 24" className="w-5 h-5 text-white fill-current" preserveAspectRatio="xMidYMid meet">
              <path d="M12 2L4 5v6.09c0 5.05 3.41 9.76 8 10.91 4.59-1.15 8-5.86 8-10.91V5l-8-3zm1 14h-2v-2h2v2zm0-4h-2V7h2v5z" />
            </svg>
          </div>
          <div>
            <div className="flex items-center space-x-1">
              <span className="font-extrabold tracking-tight text-base text-white">MediSentinel</span>
              <span className="w-1.5 h-1.5 rounded-full bg-ref-purple"></span>
            </div>
            <p className="text-[10px] text-zinc-400 font-medium">Autonomous Pharmacy AI</p>
          </div>
        </div>

        {/* Section 1: Workspace */}
        <div className="space-y-1">
          <div className="px-3 text-[11px] font-semibold text-zinc-500 tracking-wider">
            Workspace
          </div>
          <div className="space-y-1">
            {workspaceItems.map(renderNavButton)}
          </div>
        </div>

        {/* Section 2: Operations */}
        <div className="space-y-1">
          <div className="px-3 text-[11px] font-semibold text-zinc-500 tracking-wider">
            Operations
          </div>
          <div className="space-y-1">
            {operationsItems.map(renderNavButton)}
          </div>
        </div>
      </div>

      {/* Bottom User Card matching reference card */}
      <div className="pt-4 border-t border-white/[0.06]">
        <div className="bg-[#1c1d25] border border-white/[0.06] rounded-2xl p-2.5 flex items-center justify-between shadow-sm">
          <div className="flex items-center space-x-2.5 min-w-0">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 border border-white/20 flex items-center justify-center text-white text-xs font-bold shrink-0">
              SP
            </div>
            <div className="min-w-0">
              <div className="text-xs font-semibold text-white truncate">Dr. Sarah Alston</div>
              <div className="text-[10px] text-zinc-400 truncate">{currentRole.split(' ')[0]}</div>
            </div>
          </div>
          <div className="flex items-center space-x-1 bg-amber-500/10 px-1.5 py-0.5 rounded-full border border-amber-500/20 text-amber-400 text-[10px] font-semibold">
            <Star className="w-2.5 h-2.5 fill-current" />
            <span>5.0</span>
          </div>
        </div>
      </div>
    </aside>
  );
};

import React, { useState, useEffect } from 'react';
import { Bell, ShieldAlert, CheckCircle2, RefreshCw, Check, Sparkles } from 'lucide-react';
import { AlertItem } from '../types';
import { api } from '../services/api';

export const AlertsPage: React.FC = () => {
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [severityFilter, setSeverityFilter] = useState('');

  const loadAlerts = async () => {
    setLoading(true);
    try {
      const data = await api.getAlerts(severityFilter || undefined);
      setAlerts(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAlerts();
  }, [severityFilter]);

  const handleResolve = async (id: number) => {
    try {
      await api.resolveAlert(id);
      loadAlerts();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-2xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400">
              <Bell className="w-4 h-4" />
            </div>
            <h1 className="text-xl font-bold text-white tracking-tight">
              Autonomous Risk & Shortage Alert Stream
            </h1>
          </div>
          <p className="text-xs text-slate-400 mt-1 pl-11">
            Real-time critical events detected by Monitor, Forecast, and Waste Guard agents
          </p>
        </div>

        <div className="flex items-center space-x-3">
          {/* Pill severity filter */}
          <div className="flex bg-[#1c1d25] border border-white/[0.07] p-1 rounded-full text-xs">
            {[
              { id: '', label: 'All' },
              { id: 'CRITICAL', label: 'Critical' },
              { id: 'WARNING', label: 'Warnings' },
              { id: 'INFO', label: 'Info' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setSeverityFilter(tab.id)}
                className={`px-3.5 py-1.5 rounded-full font-medium transition-all ${
                  severityFilter === tab.id
                    ? 'bg-[#7c5cfc] text-white shadow-lg shadow-[#7c5cfc]/25 font-semibold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <button
            onClick={loadAlerts}
            className="w-9 h-9 rounded-full bg-[#1c1d25] border border-white/[0.07] text-slate-300 hover:text-white hover:border-white/20 flex items-center justify-center transition-all"
            title="Refresh alerts"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-[#9484f7]' : ''}`} />
          </button>
        </div>
      </div>

      {/* Alerts Stream List */}
      <div className="space-y-4">
        {loading ? (
          [...Array(4)].map((_, i) => (
            <div key={i} className="h-32 bg-[#1c1d25] border border-white/[0.07] rounded-3xl animate-pulse"></div>
          ))
        ) : alerts.length === 0 ? (
          <div className="bg-[#1c1d25] border border-white/[0.07] rounded-3xl p-16 text-center text-slate-400">
            <div className="w-14 h-14 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mx-auto mb-3">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <h3 className="text-base font-bold text-white">All Systems Nominal</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              No active unresolved inventory alerts in the telemetry queue.
            </p>
          </div>
        ) : (
          alerts.map((alert) => {
            const isCritical = alert.severity === 'CRITICAL' || alert.severity === 'EMERGENCY';
            const isWarning = alert.severity === 'WARNING';

            return (
              <div
                key={alert.id}
                className={`rounded-3xl border p-6 transition-all shadow-md ${
                  isCritical
                    ? 'bg-rose-500/[0.06] border-rose-500/30 hover:border-rose-500/50'
                    : isWarning
                    ? 'bg-amber-500/[0.06] border-amber-500/30 hover:border-amber-500/50'
                    : 'bg-[#1c1d25] border-white/[0.07] hover:border-white/20'
                }`}
              >
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                  <div className="space-y-2 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`text-[10px] font-semibold px-3 py-1 rounded-full uppercase tracking-wider ${
                          isCritical
                            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                            : isWarning
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                            : 'bg-[#7c5cfc]/20 text-[#a890fe] border border-[#7c5cfc]/30'
                        }`}
                      >
                        {alert.severity}
                      </span>
                      <h3 className="text-sm font-bold text-white">{alert.title}</h3>
                      <span className="text-[11px] text-slate-400">
                        {new Date(alert.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    <p className="text-xs text-slate-300 leading-relaxed max-w-3xl">
                      {alert.message}
                    </p>

                    {alert.recommended_action && (
                      <div className="text-xs text-[#c4b5fd] bg-[#7c5cfc]/10 border border-[#7c5cfc]/25 px-3.5 py-2 rounded-2xl font-medium inline-flex items-center gap-2 mt-1">
                        <Sparkles className="w-3.5 h-3.5 text-[#9484f7] shrink-0" />
                        <span><strong>Recommended Action:</strong> {alert.recommended_action}</span>
                      </div>
                    )}

                    <div className="flex flex-wrap items-center gap-4 pt-1 text-[11px] text-slate-400">
                      <span>Agent: <strong className="text-slate-200">{alert.triggered_by_agent}</strong></span>
                      {alert.medicine_name && (
                        <span>Medicine: <strong className="text-slate-200">{alert.medicine_name}</strong></span>
                      )}
                      {alert.ward_name && (
                        <span>Ward: <strong className="text-slate-200">{alert.ward_name}</strong></span>
                      )}
                    </div>
                  </div>

                  {/* Resolve Button */}
                  {alert.status === 'OPEN' && (
                    <button
                      onClick={() => handleResolve(alert.id)}
                      className="ref-pill-btn flex items-center space-x-1.5 px-4 py-2 rounded-full bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-xs font-semibold border border-emerald-500/30 transition-all shrink-0 self-start"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Resolve</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

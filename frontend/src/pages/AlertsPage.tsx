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
    <div className="p-8 space-y-6 max-w-7xl mx-auto text-[#12332C]">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-2xl bg-[#DC2626]/15 border border-[#DC2626]/30 flex items-center justify-center text-[#DC2626]">
              <Bell className="w-4 h-4" />
            </div>
            <h1 className="text-xl font-bold text-[#12332C] tracking-tight">
              Autonomous Risk & Shortage Alert Stream
            </h1>
          </div>
          <p className="text-xs text-[#647772] mt-1 pl-11">
            Real-time critical events detected by Monitor, Forecast, and Waste Guard agents
          </p>
        </div>

        <div className="flex items-center space-x-3">
          {/* Pill severity filter */}
          <div className="flex bg-[#F3FAF7] border border-[#D9E8E3] p-1 rounded-full text-xs">
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
                    ? 'bg-[#006B4F] text-white shadow-sm font-semibold'
                    : 'text-[#647772] hover:text-[#12332C]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <button
            onClick={loadAlerts}
            className="w-9 h-9 rounded-full bg-white border border-[#D9E8E3] text-[#647772] hover:text-[#006B4F] hover:border-[#008F83] flex items-center justify-center transition-all shadow-sm"
            title="Refresh alerts"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-[#006B4F]' : ''}`} />
          </button>
        </div>
      </div>

      {/* Alerts Stream List */}
      <div className="space-y-4">
        {loading ? (
          [...Array(4)].map((_, i) => (
            <div key={i} className="h-32 bg-white border border-[#D9E8E3] rounded-3xl animate-pulse shadow-sm"></div>
          ))
        ) : alerts.length === 0 ? (
          <div className="bg-white border border-[#D9E8E3] rounded-3xl p-16 text-center text-[#647772] shadow-sm">
            <div className="w-14 h-14 rounded-full bg-[#16A34A]/15 border border-[#16A34A]/30 flex items-center justify-center text-[#16A34A] mx-auto mb-3">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <h3 className="text-base font-bold text-[#12332C]">All Systems Nominal</h3>
            <p className="text-xs text-[#647772] mt-1 max-w-sm mx-auto">
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
                className={`rounded-3xl border p-6 transition-all shadow-sm ${
                  isCritical
                    ? 'bg-white border-2 border-[#DC2626]/50 hover:border-[#DC2626]'
                    : isWarning
                    ? 'bg-white border border-[#F59E0B]/50 hover:border-[#F59E0B]'
                    : 'bg-white border border-[#D9E8E3] hover:border-[#008F83]'
                }`}
              >
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                  <div className="space-y-2 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`text-[10px] font-semibold px-3 py-1 rounded-full uppercase tracking-wider ${
                          isCritical
                            ? 'bg-[#DC2626]/15 text-[#DC2626] border border-[#DC2626]/30'
                            : isWarning
                            ? 'bg-[#F59E0B]/15 text-[#B45309] border border-[#F59E0B]/30'
                            : 'bg-[#008F83]/15 text-[#008F83] border border-[#008F83]/30'
                        }`}
                      >
                        {alert.severity}
                      </span>
                      <h3 className="text-sm font-bold text-[#12332C]">{alert.title}</h3>
                      <span className="text-[11px] text-[#647772]">
                        {new Date(alert.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    <p className="text-xs text-[#12332C] leading-relaxed max-w-3xl">
                      {alert.message}
                    </p>

                    {alert.recommended_action && (
                      <div className="text-xs text-[#006B4F] bg-[#008F83]/10 border border-[#008F83]/25 px-3.5 py-2 rounded-2xl font-medium inline-flex items-center gap-2 mt-1">
                        <Sparkles className="w-3.5 h-3.5 text-[#008F83] shrink-0" />
                        <span><strong>Recommended Action:</strong> {alert.recommended_action}</span>
                      </div>
                    )}

                    <div className="flex flex-wrap items-center gap-4 pt-1 text-[11px] text-[#647772]">
                      <span>Agent: <strong className="text-[#12332C]">{alert.triggered_by_agent}</strong></span>
                      {alert.medicine_name && (
                        <span>Medicine: <strong className="text-[#12332C]">{alert.medicine_name}</strong></span>
                      )}
                      {alert.ward_name && (
                        <span>Ward: <strong className="text-[#12332C]">{alert.ward_name}</strong></span>
                      )}
                    </div>
                  </div>

                  {/* Resolve Button */}
                  {alert.status === 'OPEN' && (
                    <button
                      onClick={() => handleResolve(alert.id)}
                      className="ref-pill-btn flex items-center space-x-1.5 px-4 py-2 rounded-full bg-[#16A34A]/15 hover:bg-[#16A34A] text-[#16A34A] hover:text-white text-xs font-semibold border border-[#16A34A]/30 transition-all shrink-0 self-start shadow-sm"
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

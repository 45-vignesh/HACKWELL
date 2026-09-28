import React, { useState, useEffect } from 'react';
import {
  Database,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  FileText,
  Clock,
  ExternalLink,
  Layers,
  ArrowRight
} from 'lucide-react';
import { DataQualityReport, DataSourceItem } from '../types';
import { api } from '../services/api';

export const DataQualityPage: React.FC = () => {
  const [qualityData, setQualityData] = useState<DataQualityReport | null>(null);
  const [dataSources, setDataSources] = useState<DataSourceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isImporting, setIsImporting] = useState(false);
  const [importStatusMsg, setImportStatusMsg] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [qRes, sRes] = await Promise.all([
        api.getDataQuality(),
        api.getDataSources()
      ]);
      setQualityData(qRes);
      setDataSources(sRes);
    } catch (err) {
      console.error('Failed to load data quality telemetry:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleTriggerImport = async () => {
    setIsImporting(true);
    setImportStatusMsg('Running MIMIC-IV ingestion pipeline...');
    try {
      await api.triggerMimicImport();
      setImportStatusMsg('Ingestion initiated. Refreshing telemetry in 5 seconds...');
      setTimeout(() => {
        loadData();
        setIsImporting(false);
        setImportStatusMsg('Ingestion and mapping successfully refreshed.');
      }, 5000);
    } catch (err) {
      console.error(err);
      setImportStatusMsg('Import trigger failed. Check backend logs.');
      setIsImporting(false);
    }
  };

  return (
    <div className="p-6 space-y-6 text-[#12332C]">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[#12332C] flex items-center space-x-2.5">
            <Database className="w-5 h-5 text-[#006B4F]" />
            <span>MIMIC-IV Data Quality & Ingestion Provenance</span>
          </h1>
          <p className="text-xs text-[#647772] mt-0.5">
            Real-time audit telemetry of PhysioNet MIMIC-IV Clinical Database Demo ingestion and formulary mapping
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={loadData}
            disabled={loading}
            className="ref-pill-btn flex items-center space-x-1.5 px-4 py-2 rounded-full bg-white border border-[#D9E8E3] text-xs font-semibold text-[#12332C] hover:text-[#006B4F] hover:border-[#008F83] shadow-sm transition-all"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-[#006B4F]' : ''}`} />
            <span>Refresh Audit</span>
          </button>

          <button
            onClick={handleTriggerImport}
            disabled={isImporting}
            className="ref-pill-btn flex items-center space-x-1.5 px-4 py-2 rounded-full bg-[#006B4F] hover:bg-[#004D3A] text-white text-xs font-semibold shadow-sm transition-all"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isImporting ? 'animate-spin' : ''}`} />
            <span>{isImporting ? 'Importing...' : 'Re-Run Pipeline'}</span>
          </button>
        </div>
      </div>

      {importStatusMsg && (
        <div className="p-3 rounded-2xl bg-[#008F83]/10 border border-[#008F83]/30 text-[#006B4F] text-xs flex items-center justify-between animate-in fade-in">
          <span>{importStatusMsg}</span>
          <button onClick={() => setImportStatusMsg(null)} className="text-[#647772] hover:text-[#12332C] text-xs">&times;</button>
        </div>
      )}

      {loading && !qualityData ? (
        <div className="h-72 flex items-center justify-center text-[#647772] text-sm">
          Loading MIMIC data quality records...
        </div>
      ) : qualityData ? (
        <>
          {/* Macro Metrics Cards (Actual Calculated Values) */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="ref-card p-4.5 border-[#D9E8E3]">
              <div className="text-[11px] text-[#647772] uppercase tracking-wider font-mono">Records Inspected</div>
              <div className="text-2xl font-bold text-[#12332C] mt-1">
                {qualityData.records_inspected.toLocaleString()}
              </div>
              <div className="text-[10px] text-[#647772] mt-1 font-mono">
                Source: hosp (emar & prescriptions)
              </div>
            </div>

            <div className="ref-card p-4.5 border-[#D9E8E3]">
              <div className="text-[11px] text-[#647772] uppercase tracking-wider font-mono">Clinical Events Used</div>
              <div className="text-2xl font-bold text-[#16A34A] mt-1">
                {qualityData.records_used.toLocaleString()}
              </div>
              <div className="text-[10px] text-[#647772] mt-1 font-mono">
                Bedside admin & fluid orders
              </div>
            </div>

            <div className="ref-card p-4.5 border-[#D9E8E3]">
              <div className="text-[11px] text-[#647772] uppercase tracking-wider font-mono">Mapped Medicines</div>
              <div className="text-2xl font-bold text-[#006B4F] mt-1">
                {qualityData.mapped_medicines_count} <span className="text-xs text-[#647772]">/ {qualityData.total_medicines_count}</span>
              </div>
              <div className="text-[10px] text-[#647772] mt-1 font-mono">
                Formulary coverage rate: {((qualityData.mapped_medicines_count / qualityData.total_medicines_count) * 100).toFixed(0)}%
              </div>
            </div>

            <div className="ref-card p-4.5 border-[#D9E8E3]">
              <div className="text-[11px] text-[#647772] uppercase tracking-wider font-mono">Imported Daily Rows</div>
              <div className="text-2xl font-bold text-[#008F83] mt-1">
                {qualityData.imported_daily_records.toLocaleString()}
              </div>
              <div className="text-[10px] text-[#647772] mt-1 font-mono">
                Status: <span className="text-[#16A34A] font-semibold">{qualityData.import_status}</span>
              </div>
            </div>
          </div>

          {/* Operational Provenance Layers */}
          <div className="ref-card p-5 space-y-4">
            <h3 className="text-sm font-bold text-[#12332C] flex items-center space-x-2">
              <Layers className="w-4 h-4 text-[#006B4F]" />
              <span>Registered Hospital Data Sources & Provenance Architecture</span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              {dataSources.map((ds) => (
                <div key={ds.id} className="p-3.5 rounded-2xl bg-[#F3FAF7] border border-[#D9E8E3] space-y-1.5 shadow-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#12332C]">{ds.name}</span>
                    <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase ${
                      ds.source_type === 'HISTORICAL_REAL'
                        ? 'bg-[#16A34A]/15 text-[#16A34A] border border-[#16A34A]/30'
                        : ds.source_type === 'DERIVED'
                        ? 'bg-[#008F83]/15 text-[#008F83] border border-[#008F83]/30'
                        : ds.source_type === 'SIMULATION'
                        ? 'bg-[#DC2626]/15 text-[#DC2626] border border-[#DC2626]/30'
                        : 'bg-[#F59E0B]/15 text-[#B45309] border border-[#F59E0B]/30'
                    }`}>
                      {ds.source_type}
                    </span>
                  </div>
                  <p className="text-[11px] text-[#647772] leading-tight">{ds.description}</p>
                  <div className="text-[10px] text-[#647772] font-mono pt-1">
                    Records: {ds.record_count.toLocaleString()} • Status: {ds.status}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Mapped Medicines Table */}
          <div className="grid grid-cols-12 gap-5">
            <div className="col-span-12 lg:col-span-8 ref-card p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-[#12332C] flex items-center space-x-2">
                    <CheckCircle2 className="w-4 h-4 text-[#16A34A]" />
                    <span>Mapped Formulary Medicines & MIMIC Aliases</span>
                  </h3>
                  <p className="text-[11px] text-[#647772] mt-0.5">
                    Deterministic cross-walk mapping clinical strings to MediSentinel medicines
                  </p>
                </div>
                <span className="text-xs font-mono text-[#16A34A] font-semibold">
                  {qualityData.mapped_medicines.filter(m => m.historical_records_count > 0).length} Formularies Active
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-[#D9E8E3] text-[#647772] font-mono text-[10px] uppercase bg-[#F3FAF7]/50">
                      <th className="py-2.5 px-3 font-semibold">Code</th>
                      <th className="py-2.5 px-3 font-semibold">Medicine Name</th>
                      <th className="py-2.5 px-3 font-semibold">MIMIC Aliases</th>
                      <th className="py-2.5 px-3 font-semibold text-right">Daily Records</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#D9E8E3]">
                    {qualityData.mapped_medicines.map((m) => (
                      <tr key={m.medicine_id} className="hover:bg-[#F3FAF7]/70 transition-colors">
                        <td className="py-2.5 px-3 font-mono text-[#006B4F] text-[11px] font-semibold">{m.medicine_code}</td>
                        <td className="py-2.5 px-3 font-medium text-[#12332C]">{m.medicine_name}</td>
                        <td className="py-2.5 px-3 text-[#647772]">
                          {m.sample_aliases && m.sample_aliases.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {m.sample_aliases.map((al, idx) => (
                                <span key={idx} className="px-2 py-0.5 rounded-full bg-[#F3FAF7] text-[10px] text-[#12332C] font-mono border border-[#D9E8E3]">
                                  {al}
                                </span>
                              ))}
                              {m.aliases_count > 3 && (
                                <span className="text-[10px] text-[#647772] font-mono self-center">+{m.aliases_count - 3}</span>
                              )}
                            </div>
                          ) : (
                            <span className="text-[#647772] text-[10px]">Direct code match</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-semibold text-[#006B4F]">
                          {m.historical_records_count > 0 ? `${m.historical_records_count} days` : '0 days'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Unmapped Medications Panel */}
            <div className="col-span-12 lg:col-span-4 ref-card p-5 space-y-4">
              <div>
                <h3 className="text-sm font-bold text-[#12332C] flex items-center space-x-2">
                  <AlertTriangle className="w-4 h-4 text-[#B45309]" />
                  <span>Unmapped MIMIC Drugs ({qualityData.unmapped_medicines_count})</span>
                </h3>
                <p className="text-[11px] text-[#647772] mt-0.5">
                  Clinical medications in MIMIC not part of the active 15 MediSentinel formulary. Kept safely unmapped.
                </p>
              </div>

              <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
                {qualityData.unmapped_samples.map((drug, idx) => (
                  <div key={idx} className="p-2.5 rounded-xl bg-[#F3FAF7] border border-[#D9E8E3] flex items-center justify-between text-xs">
                    <span className="text-[#12332C] font-mono truncate mr-2">{drug}</span>
                    <span className="text-[9px] px-2 py-0.5 rounded-full bg-[#F59E0B]/15 text-[#B45309] border border-[#F59E0B]/30 uppercase font-mono shrink-0">
                      Unmapped
                    </span>
                  </div>
                ))}
              </div>

              <div className="p-3 rounded-xl bg-[#F3FAF7] border border-[#D9E8E3] text-[11px] text-[#647772] leading-relaxed">
                <span className="font-semibold text-[#12332C]">Safety Policy</span>: Unknown or non-formulary medications are never guessed or coerced, preventing inventory corruption.
              </div>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
};

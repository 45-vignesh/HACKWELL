import React, { useState } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { BatchValidationResult } from '../types';
import {
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ShieldCheck,
  X,
  FileText,
  Play,
  Check,
  RefreshCw
} from 'lucide-react';

interface DataManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const DataManagerModal: React.FC<DataManagerModalProps> = ({
  isOpen,
  onClose,
  onSuccess
}) => {
  const { user, role } = useAuth();
  const [csvContent, setCsvContent] = useState<string>('');
  const [validating, setValidating] = useState<boolean>(false);
  const [importing, setImporting] = useState<boolean>(false);
  const [report, setReport] = useState<BatchValidationResult | null>(null);
  const [importSuccessMessage, setImportSuccessMessage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'upload' | 'preview' | 'errors'>('upload');

  if (!isOpen) return null;

  // Demo sample dataset with intentional test cases for the jury
  const loadDemoCsv = () => {
    const demo = `medicine_code,ward_code,current_stock,safety_stock,reorder_point,avg_daily_usage,expiry_date,received_date
MED-CEFTRX,WARD-ICU,140,40,60,12.5,2027-06-30,2026-01-10
MED-PARACET,WARD-EMERG,450,100,150,35.0,2027-12-31,2026-02-15
MED-DEXTR5,WARD-ICU,-15,30,50,10.0,2027-08-20,2026-03-01
MED-INSULIN,WARD-INPAT,85,25,40,6.0,2025-01-10,2026-02-01
MED-CEFTRX,WARD-ICU,180,40,60,12.5,2027-06-30,2026-01-10
MED-OXYGEN,WARD-EMERG,2500,50,80,20.0,2028-01-01,2026-01-01
MED-SALBUT,WARD-EMERG,95,30,45,8.0,2027-09-15,2026-03-10`;
    setCsvContent(demo);
    setReport(null);
    setImportSuccessMessage(null);
  };

  const parseCsvToRows = (text: string) => {
    const lines = text.trim().split('\n').filter(l => l.trim().length > 0);
    if (lines.length < 2) return [];

    const headers = lines[0].split(',').map(h => h.trim());
    const rows = [];

    for (let i = 1; i < lines.length; i++) {
      const parts = lines[i].split(',').map(p => p.trim());
      const rowObj: any = {};
      headers.forEach((h, idx) => {
        rowObj[h] = parts[idx] || '';
      });
      rows.push(rowObj);
    }
    return rows;
  };

  const handleValidate = async () => {
    const rows = parseCsvToRows(csvContent);
    if (rows.length === 0) {
      alert('Please enter or upload valid CSV content with a header row.');
      return;
    }

    setValidating(true);
    try {
      const res = await api.validateBatch(rows);
      setReport(res);
      setActiveTab('preview');
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to validate batch CSV.');
    } finally {
      setValidating(false);
    }
  };

  const handleImport = async () => {
    if (!report || report.valid_count === 0) return;

    setImporting(true);
    try {
      const res = await api.importBatch(report.valid_rows, 'Validated CSV Ingestion by Data Manager');
      setImportSuccessMessage(`Successfully committed ${res.imported_count} trusted operational records to database.`);
      onSuccess();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to import validated records.');
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-3xl max-w-3xl w-full border border-[#D9E8E3] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-5 bg-[#004D3A] text-white flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-[#006B4F] border border-white/20 flex items-center justify-center shadow-md">
              <FileSpreadsheet className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-base font-bold text-white tracking-wide">Data Governance & Batch CSV Import</h2>
                <span className="text-[10px] bg-[#F4B400] text-[#12332C] px-2 py-0.5 rounded-full font-bold uppercase">
                  Data Manager Hub
                </span>
              </div>
              <p className="text-xs text-[#D9E8E3]/80">Pre-import validation, quarantine separation, and AI trust gating</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Controls */}
        <div className="px-6 pt-3 border-b border-[#D9E8E3] bg-[#F3FAF7] flex space-x-4">
          <button
            onClick={() => setActiveTab('upload')}
            className={`pb-2.5 text-xs font-bold border-b-2 transition-all ${
              activeTab === 'upload'
                ? 'border-[#006B4F] text-[#006B4F]'
                : 'border-transparent text-[#647772] hover:text-[#12332C]'
            }`}
          >
            1. CSV Data Input
          </button>
          <button
            onClick={() => setActiveTab('preview')}
            disabled={!report}
            className={`pb-2.5 text-xs font-bold border-b-2 transition-all flex items-center space-x-1.5 ${
              activeTab === 'preview'
                ? 'border-[#006B4F] text-[#006B4F]'
                : report
                ? 'border-transparent text-[#647772] hover:text-[#12332C]'
                : 'border-transparent text-gray-400 cursor-not-allowed'
            }`}
          >
            <span>2. Validation Report</span>
            {report && (
              <span className="bg-[#006B4F] text-white text-[10px] px-1.5 py-0.2 rounded-full font-mono">
                {report.total_records}
              </span>
            )}
          </button>
        </div>

        {/* Body Content */}
        <div className="p-6 overflow-y-auto space-y-4">
          {importSuccessMessage && (
            <div className="p-4 bg-emerald-50 border border-emerald-300 rounded-2xl flex items-center space-x-3 text-xs text-emerald-900">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <div>
                <strong>Import Committed:</strong>
                <p>{importSuccessMessage}</p>
              </div>
            </div>
          )}

          {activeTab === 'upload' && (
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-[#12332C]">Paste CSV or Load Test Scenario</span>
                <button
                  onClick={loadDemoCsv}
                  className="text-xs text-[#006B4F] hover:text-[#004D3A] font-bold bg-[#E6F4F0] px-3 py-1 rounded-full border border-[#006B4F]/20 flex items-center space-x-1"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Load Jury Test Scenario</span>
                </button>
              </div>

              <textarea
                value={csvContent}
                onChange={(e) => setCsvContent(e.target.value)}
                rows={9}
                className="w-full font-mono text-xs p-3.5 rounded-2xl border border-[#D9E8E3] bg-[#F3FAF7] text-[#12332C] focus:outline-none focus:border-[#006B4F]"
                placeholder="medicine_code,ward_code,current_stock,safety_stock,reorder_point,avg_daily_usage,expiry_date,received_date&#10;MED-CEFTRX,WARD-ICU,140,40,60,12.5,2027-06-30,2026-01-10"
              />

              <div className="p-3 bg-blue-50 border border-blue-200 rounded-2xl text-[11px] text-blue-900 leading-relaxed">
                <strong>Governance Rule:</strong> Untrusted records (negative stock, expired, malformed) are quarantined immediately. Only records passing strict validation will receive <code className="font-mono bg-blue-100 px-1 py-0.5 rounded">VALIDATED</code> status and reach AI Agents.
              </div>
            </div>
          )}

          {activeTab === 'preview' && report && (
            <div className="space-y-4">
              {/* Summary Metric Counters */}
              <div className="grid grid-cols-4 gap-3">
                <div className="p-3 rounded-2xl bg-gray-50 border border-gray-200 text-center">
                  <div className="text-[10px] text-gray-500 font-bold uppercase">Total Rows</div>
                  <div className="text-xl font-extrabold text-gray-800 font-mono mt-0.5">{report.total_records}</div>
                </div>
                <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-center">
                  <div className="text-[10px] text-emerald-700 font-bold uppercase">Valid (Trusted)</div>
                  <div className="text-xl font-extrabold text-emerald-800 font-mono mt-0.5">{report.valid_count}</div>
                </div>
                <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200 text-center">
                  <div className="text-[10px] text-amber-700 font-bold uppercase">Warnings</div>
                  <div className="text-xl font-extrabold text-amber-800 font-mono mt-0.5">{report.warning_count}</div>
                </div>
                <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-center">
                  <div className="text-[10px] text-rose-700 font-bold uppercase">Rejected</div>
                  <div className="text-xl font-extrabold text-rose-800 font-mono mt-0.5">{report.rejected_count}</div>
                </div>
              </div>

              {/* Issues breakdown if any */}
              {report.errors.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-rose-800 flex items-center space-x-1.5">
                    <XCircle className="w-4 h-4 text-rose-600" />
                    <span>Quarantined / Rejected Rows ({report.rejected_count})</span>
                  </h4>
                  <div className="border border-rose-200 rounded-2xl overflow-hidden text-xs">
                    <table className="w-full text-left">
                      <thead className="bg-rose-100/60 text-rose-900 font-bold text-[11px]">
                        <tr>
                          <th className="py-2 px-3">Row</th>
                          <th className="py-2 px-3">Medicine</th>
                          <th className="py-2 px-3">Ward</th>
                          <th className="py-2 px-3">Violation Reason</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-rose-100">
                        {report.errors.map((err: any, idx: number) => (
                          <tr key={idx} className="bg-rose-50/40">
                            <td className="py-2 px-3 font-mono font-bold text-rose-700">#{err.row_number}</td>
                            <td className="py-2 px-3 font-medium">{err.medicine_name || err.medicine_code}</td>
                            <td className="py-2 px-3">{err.ward_name || err.ward_code}</td>
                            <td className="py-2 px-3 text-rose-800 font-semibold">{err.errors?.join(' • ')}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Valid rows preview */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-[#006B4F] flex items-center space-x-1.5">
                  <CheckCircle2 className="w-4 h-4 text-[#006B4F]" />
                  <span>Validated Operational Records Ready for AI ({report.valid_count})</span>
                </h4>
                <div className="border border-[#D9E8E3] rounded-2xl overflow-hidden text-xs max-h-48 overflow-y-auto">
                  <table className="w-full text-left">
                    <thead className="bg-[#F3FAF7] text-[#12332C] font-bold text-[11px] sticky top-0">
                      <tr>
                        <th className="py-2 px-3">Row</th>
                        <th className="py-2 px-3">Medicine</th>
                        <th className="py-2 px-3">Ward</th>
                        <th className="py-2 px-3 text-right">Stock</th>
                        <th className="py-2 px-3 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#D9E8E3]">
                      {report.valid_rows.map((row: any, idx: number) => (
                        <tr key={idx} className="hover:bg-[#F3FAF7]/50">
                          <td className="py-1.5 px-3 font-mono text-[#647772]">#{row.row_number}</td>
                          <td className="py-1.5 px-3 font-medium text-[#12332C]">{row.medicine_name}</td>
                          <td className="py-1.5 px-3 text-[#647772]">{row.ward_name}</td>
                          <td className="py-1.5 px-3 text-right font-mono font-bold text-[#006B4F]">{row.current_stock}</td>
                          <td className="py-1.5 px-3 text-center">
                            <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-emerald-100 text-emerald-800">
                              {row.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-[#F3FAF7] border-t border-[#D9E8E3] flex items-center justify-between">
          <div className="text-[11px] text-[#647772]">
            Actor: <strong>{user?.display_name || 'Alex Chen'}</strong> ({role})
          </div>
          <div className="flex space-x-2">
            {activeTab === 'upload' ? (
              <button
                onClick={handleValidate}
                disabled={validating || !csvContent.trim()}
                className={`px-5 py-2 rounded-full text-xs font-bold shadow-sm flex items-center space-x-1.5 transition-all ${
                  validating || !csvContent.trim()
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-[#006B4F] hover:bg-[#004D3A] text-white active:scale-95'
                }`}
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>{validating ? 'Validating Batch...' : 'Run Data Validation Check'}</span>
              </button>
            ) : (
              <>
                <button
                  onClick={() => setActiveTab('upload')}
                  className="px-4 py-2 rounded-full border border-[#D9E8E3] text-xs font-medium text-[#12332C] hover:bg-white"
                >
                  Edit Input
                </button>
                <button
                  onClick={handleImport}
                  disabled={importing || !report || report.valid_count === 0}
                  className={`px-5 py-2 rounded-full text-xs font-bold shadow-sm flex items-center space-x-1.5 transition-all ${
                    importing || !report || report.valid_count === 0
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-[#006B4F] hover:bg-[#004D3A] text-white active:scale-95'
                  }`}
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>{importing ? 'Committing...' : `Commit ${report?.valid_count || 0} Validated Records`}</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

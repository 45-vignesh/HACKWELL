import React, { useState, useRef } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { BatchValidationResult, BatchImportResponse } from '../types';
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
  ArrowLeft,
  Database,
  Calendar,
  Layers,
  Check,
  RefreshCw,
  ExternalLink,
  Shield
} from 'lucide-react';

interface DataManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  onViewImportedRecords?: () => void;
}

export const DataManagerModal: React.FC<DataManagerModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  onViewImportedRecords
}) => {
  const { user, role } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<'select' | 'preview' | 'validation' | 'result'>('select');
  const [fileName, setFileName] = useState<string>('');
  const [csvContent, setCsvContent] = useState<string>('');
  const [parsedRows, setParsedRows] = useState<any[]>([]);
  const [validating, setValidating] = useState<boolean>(false);
  const [importing, setImporting] = useState<boolean>(false);
  const [report, setReport] = useState<BatchValidationResult | null>(null);
  const [importResult, setImportResult] = useState<BatchImportResponse | null>(null);

  if (!isOpen) return null;

  const parseCsvText = (text: string) => {
    const lines = text.trim().split('\n').filter(l => l.trim().length > 0);
    if (lines.length < 2) return [];

    const headers = lines[0].split(',').map(h => h.trim().replace(/^["']|["']$/g, ''));
    const rows: any[] = [];

    for (let i = 1; i < lines.length; i++) {
      const parts = lines[i].split(',').map(p => p.trim().replace(/^["']|["']$/g, ''));
      const rowObj: any = {};
      headers.forEach((h, idx) => {
        rowObj[h] = parts[idx] !== undefined ? parts[idx] : '';
      });
      rows.push(rowObj);
    }
    return rows;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setCsvContent(content);
      const rows = parseCsvText(content);
      setParsedRows(rows);
      setReport(null);
      setImportResult(null);
      setStep('preview');
    };
    reader.readAsText(file);
  };

  const handleValidate = async () => {
    if (parsedRows.length === 0) {
      alert('Please select a valid CSV file containing data rows.');
      return;
    }

    setValidating(true);
    try {
      const res = await api.validateBatch(parsedRows);
      setReport(res);
      setStep('validation');
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to validate batch CSV data.');
    } finally {
      setValidating(false);
    }
  };

  const handleImport = async () => {
    if (!report || report.valid_count === 0) return;

    setImporting(true);
    try {
      const res = await api.importBatch(report.valid_rows, 'Manual CSV Dataset Ingestion by Data Manager');
      setImportResult(res);
      setStep('result');
      onSuccess();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to import validated records to database.');
    } finally {
      setImporting(false);
    }
  };

  const handleBack = () => {
    if (step === 'result') {
      setStep('validation');
    } else if (step === 'validation') {
      setStep('preview');
    } else if (step === 'preview') {
      setStep('select');
      setFileName('');
      setCsvContent('');
      setParsedRows([]);
    } else {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in font-sans text-[#12332C]">
      <div className="bg-white rounded-[32px] max-w-4xl w-full border border-[#D9E8E3] shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header with Back Arrow and Close Button */}
        <div className="px-6 py-4.5 bg-[#004D3A] text-white flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <button
              onClick={handleBack}
              title="Back"
              className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-all group"
            >
              <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" />
            </button>

            <div className="w-9 h-9 rounded-2xl bg-[#006B4F] border border-white/20 flex items-center justify-center shadow-md">
              <FileSpreadsheet className="w-5 h-5 text-white" />
            </div>

            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-base font-bold text-white tracking-wide">
                  Import Dataset
                </h2>
                <span className="text-[10px] bg-[#F4B400] text-[#12332C] px-2 py-0.5 rounded-full font-extrabold uppercase">
                  Data Manager Portal
                </span>
              </div>
              <p className="text-xs text-[#D9E8E3]/80">
                Manual operational inventory intake, invariant validation, and PostgreSQL storage
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            title="Close"
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Workflow Breadcrumb Indicator */}
        <div className="px-6 py-2.5 bg-[#F3FAF7] border-b border-[#D9E8E3] flex items-center justify-between text-xs font-semibold text-[#647772]">
          <div className="flex items-center space-x-2">
            <span className={step === 'select' ? 'text-[#006B4F] font-bold' : ''}>1. Select CSV</span>
            <span>&rarr;</span>
            <span className={step === 'preview' ? 'text-[#006B4F] font-bold' : ''}>2. Preview</span>
            <span>&rarr;</span>
            <span className={step === 'validation' ? 'text-[#006B4F] font-bold' : ''}>3. Validate</span>
            <span>&rarr;</span>
            <span className={step === 'result' ? 'text-[#006B4F] font-bold' : ''}>4. PostgreSQL Storage</span>
          </div>

          {fileName && (
            <span className="font-mono text-[11px] bg-white border border-[#D9E8E3] px-2.5 py-0.5 rounded-full text-[#12332C]">
              {fileName} ({parsedRows.length} rows)
            </span>
          )}
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {/* STEP 1: SELECT FILE */}
          {step === 'select' && (
            <div className="space-y-4">
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                className="hidden"
              />

              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-[#006B4F]/40 hover:border-[#006B4F] rounded-3xl p-10 text-center bg-[#F3FAF7] hover:bg-white cursor-pointer transition-all duration-200 group"
              >
                <div className="w-16 h-16 rounded-3xl bg-[#006B4F]/10 group-hover:bg-[#006B4F] text-[#006B4F] group-hover:text-white mx-auto flex items-center justify-center transition-all mb-4 shadow-sm">
                  <Upload className="w-8 h-8" />
                </div>
                <h3 className="text-base font-bold text-[#12332C] mb-1">
                  Select CSV File for Manual Import
                </h3>
                <p className="text-xs text-[#647772] max-w-md mx-auto mb-4">
                  Upload an external operational inventory CSV (e.g., <code className="font-mono bg-white px-1.5 py-0.5 rounded border border-[#D9E8E3] text-[#006B4F]">medisentinel_manual_entry_jury_dataset.csv</code>).
                </p>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-5 py-2.5 rounded-full bg-[#006B4F] text-white text-xs font-bold shadow-sm hover:bg-[#004D3A] transition-all"
                >
                  Choose CSV File
                </button>
              </div>

              {/* Data Governance Notice */}
              <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-2xl flex items-start space-x-3 text-xs text-emerald-950">
                <ShieldCheck className="w-5 h-5 text-[#006B4F] shrink-0 mt-0.5" />
                <div>
                  <strong className="text-[#006B4F]">Manual Entry Governance Protocol:</strong>
                  <p className="text-[#647772] mt-0.5 leading-relaxed">
                    Data will be labeled with source <code className="font-mono font-bold text-emerald-900 bg-white px-1 rounded border border-emerald-200">MANUAL</code>. Only records passing multi-echelon invariant validation will receive <code className="font-mono font-bold text-emerald-900 bg-white px-1 rounded border border-emerald-200">VALIDATED</code> status and become visible to autonomous AI agents. Existing MIMIC historical usage data remains strictly untouched.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: PREVIEW RAW CSV */}
          {step === 'preview' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-[#12332C]">File Preview: {fileName}</h3>
                  <p className="text-xs text-[#647772]">Review raw records before running validation</p>
                </div>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="text-xs text-[#006B4F] font-semibold hover:underline"
                >
                  Choose different file
                </button>
              </div>

              <div className="border border-[#D9E8E3] rounded-2xl overflow-hidden max-h-72 overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#F3FAF7] text-[#12332C] font-bold text-[11px] sticky top-0 border-b border-[#D9E8E3]">
                    <tr>
                      <th className="py-2.5 px-3">#</th>
                      <th className="py-2.5 px-3">Medicine</th>
                      <th className="py-2.5 px-3">Ward</th>
                      <th className="py-2.5 px-3">Batch</th>
                      <th className="py-2.5 px-3 text-right">Stock</th>
                      <th className="py-2.5 px-3">Expiry Date</th>
                      <th className="py-2.5 px-3">Source</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#D9E8E3]">
                    {parsedRows.map((r, idx) => (
                      <tr key={idx} className="hover:bg-[#F3FAF7]/50">
                        <td className="py-2 px-3 font-mono text-[#647772]">#{idx + 1}</td>
                        <td className="py-2 px-3 font-semibold text-[#12332C]">
                          {r.medicine_name || r.medicine_code}
                          <div className="text-[10px] text-[#647772] font-mono">{r.medicine_code}</div>
                        </td>
                        <td className="py-2 px-3 text-[#12332C]">
                          {r.ward_name || r.ward_code}
                          <div className="text-[10px] text-[#647772] font-mono">{r.ward_code}</div>
                        </td>
                        <td className="py-2 px-3 font-mono text-[11px] text-[#647772]">{r.batch_number || 'N/A'}</td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-[#006B4F]">{r.current_stock}</td>
                        <td className="py-2 px-3 font-mono text-[#647772]">{r.expiry_date || 'N/A'}</td>
                        <td className="py-2 px-3">
                          <span className="text-[9px] font-mono px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold">
                            {r.data_source || 'MANUAL'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* STEP 3: SHOW VALIDATION RESULTS */}
          {step === 'validation' && report && (
            <div className="space-y-5">
              {/* Summary Metric Counters */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3.5 rounded-2xl bg-gray-50 border border-gray-200 text-center">
                  <div className="text-[10px] text-gray-500 font-bold uppercase">Total Records</div>
                  <div className="text-2xl font-extrabold text-[#12332C] font-mono mt-0.5">{report.total_records}</div>
                </div>
                <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-center">
                  <div className="text-[10px] text-emerald-700 font-bold uppercase">Valid Records</div>
                  <div className="text-2xl font-extrabold text-emerald-800 font-mono mt-0.5">{report.valid_count}</div>
                </div>
                <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-center">
                  <div className="text-[10px] text-amber-700 font-bold uppercase">Warnings</div>
                  <div className="text-2xl font-extrabold text-amber-800 font-mono mt-0.5">{report.warning_count}</div>
                </div>
                <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-center">
                  <div className="text-[10px] text-rose-700 font-bold uppercase">Rejected Records</div>
                  <div className="text-2xl font-extrabold text-rose-800 font-mono mt-0.5">{report.rejected_count}</div>
                </div>
              </div>

              {/* Rejected Records Details */}
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

              {/* Valid Records Preview */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-[#006B4F] flex items-center space-x-1.5">
                  <CheckCircle2 className="w-4 h-4 text-[#006B4F]" />
                  <span>Valid Records Ready for PostgreSQL Storage ({report.valid_count})</span>
                </h4>
                <div className="border border-[#D9E8E3] rounded-2xl overflow-hidden max-h-56 overflow-y-auto text-xs">
                  <table className="w-full text-left">
                    <thead className="bg-[#F3FAF7] text-[#12332C] font-bold text-[11px] sticky top-0">
                      <tr>
                        <th className="py-2 px-3">Row</th>
                        <th className="py-2 px-3">Medicine</th>
                        <th className="py-2 px-3">Ward</th>
                        <th className="py-2 px-3 text-right">Stock</th>
                        <th className="py-2 px-3 text-center">Status</th>
                        <th className="py-2 px-3 text-center">Source</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#D9E8E3]">
                      {report.valid_rows.map((row: any, idx: number) => (
                        <tr key={idx} className="hover:bg-[#F3FAF7]/50">
                          <td className="py-2 px-3 font-mono text-[#647772]">#{row.row_number}</td>
                          <td className="py-2 px-3 font-medium text-[#12332C]">{row.medicine_name}</td>
                          <td className="py-2 px-3 text-[#647772]">{row.ward_name}</td>
                          <td className="py-2 px-3 text-right font-mono font-bold text-[#006B4F]">{row.current_stock}</td>
                          <td className="py-2 px-3 text-center">
                            <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-emerald-100 text-emerald-800">
                              {row.status}
                            </span>
                          </td>
                          <td className="py-2 px-3 text-center">
                            <span className="text-[10px] px-2 py-0.5 rounded-full font-mono font-bold bg-[#E6F4F0] text-[#006B4F] border border-[#006B4F]/20">
                              MANUAL
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

          {/* STEP 4: STORAGE LOCATION & DATABASE RECORD */}
          {step === 'result' && importResult && (
            <div className="space-y-5 animate-fade-in">
              {/* Success Banner */}
              <div className="p-4 bg-emerald-50 border border-emerald-300 rounded-3xl flex items-center space-x-3.5">
                <div className="w-10 h-10 rounded-2xl bg-[#006B4F] text-white flex items-center justify-center shrink-0 shadow-sm">
                  <Check className="w-6 h-6 stroke-[3]" />
                </div>
                <div>
                  <h4 className="text-sm font-extrabold text-emerald-950">
                    {importResult.imported_count} records imported successfully
                  </h4>
                  <p className="text-xs text-emerald-800 mt-0.5">
                    Stored in {importResult.database} &rarr; {importResult.primary_table} table
                  </p>
                </div>
              </div>

              {/* Storage Location Card */}
              <div className="bg-[#F3FAF7] border border-[#D9E8E3] rounded-3xl p-5 space-y-4">
                <div className="flex items-center space-x-2 border-b border-[#D9E8E3] pb-3">
                  <Database className="w-4 h-4 text-[#006B4F]" />
                  <h4 className="text-xs font-extrabold text-[#12332C] uppercase tracking-wider">
                    Database Storage Record
                  </h4>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div className="bg-white p-3 rounded-2xl border border-[#D9E8E3]">
                    <div className="text-[10px] text-[#647772] font-semibold uppercase">Database</div>
                    <div className="text-sm font-bold text-[#12332C] font-mono mt-0.5">{importResult.database}</div>
                  </div>
                  <div className="bg-white p-3 rounded-2xl border border-[#D9E8E3]">
                    <div className="text-[10px] text-[#647772] font-semibold uppercase">Primary Table</div>
                    <div className="text-sm font-bold text-[#006B4F] font-mono mt-0.5">{importResult.primary_table}</div>
                  </div>
                  <div className="bg-white p-3 rounded-2xl border border-[#D9E8E3]">
                    <div className="text-[10px] text-[#647772] font-semibold uppercase">Records Inserted</div>
                    <div className="text-sm font-bold text-emerald-700 font-mono mt-0.5">{importResult.inserted_count}</div>
                  </div>
                  <div className="bg-white p-3 rounded-2xl border border-[#D9E8E3]">
                    <div className="text-[10px] text-[#647772] font-semibold uppercase">Records Updated</div>
                    <div className="text-sm font-bold text-[#008F83] font-mono mt-0.5">{importResult.updated_count}</div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs pt-1">
                  <div className="bg-white p-3 rounded-2xl border border-[#D9E8E3] flex items-center justify-between">
                    <span className="text-[#647772]">Source</span>
                    <span className="font-mono font-bold text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                      {importResult.source}
                    </span>
                  </div>
                  <div className="bg-white p-3 rounded-2xl border border-[#D9E8E3] flex items-center justify-between">
                    <span className="text-[#647772]">Trust Status</span>
                    <span className="font-mono font-bold text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                      {importResult.trust_status}
                    </span>
                  </div>
                  <div className="bg-white p-3 rounded-2xl border border-[#D9E8E3] flex items-center justify-between">
                    <span className="text-[#647772]">Timestamp</span>
                    <span className="font-mono text-[11px] text-[#12332C]">
                      {new Date(importResult.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Audit Trail Recorded Notice */}
              <div className="bg-white border border-[#D9E8E3] rounded-3xl p-4.5 text-xs space-y-2">
                <div className="flex items-center space-x-2 text-[#006B4F] font-bold">
                  <Shield className="w-4 h-4" />
                  <span>Audit Trail Record Created</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] text-[#647772]">
                  <div>User: <strong className="text-[#12332C]">{user?.username || 'data_manager'}</strong></div>
                  <div>Role: <strong className="text-[#12332C]">{role}</strong></div>
                  <div>Action: <strong className="text-[#12332C]">CSV_IMPORT</strong></div>
                  <div>Validation: <strong className="text-emerald-700">VALIDATED</strong></div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer Controls */}
        <div className="px-6 py-4 bg-[#F3FAF7] border-t border-[#D9E8E3] flex items-center justify-between">
          <div className="text-[11px] text-[#647772]">
            Active Actor: <strong>{user?.display_name || 'Liam Patel'}</strong> ({role})
          </div>

          <div className="flex items-center space-x-2.5">
            {step === 'select' && (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-5 py-2.5 rounded-full bg-[#006B4F] hover:bg-[#004D3A] text-white text-xs font-bold shadow-sm transition-all active:scale-95"
              >
                Select CSV File
              </button>
            )}

            {step === 'preview' && (
              <button
                type="button"
                onClick={handleValidate}
                disabled={validating}
                className="px-5 py-2.5 rounded-full bg-[#006B4F] hover:bg-[#004D3A] text-white text-xs font-bold shadow-sm flex items-center space-x-1.5 transition-all active:scale-95 disabled:opacity-50"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>{validating ? 'Validating Dataset...' : 'Validate Dataset'}</span>
              </button>
            )}

            {step === 'validation' && (
              <button
                type="button"
                onClick={handleImport}
                disabled={importing || !report || report.valid_count === 0}
                className="px-5 py-2.5 rounded-full bg-[#006B4F] hover:bg-[#004D3A] text-white text-xs font-bold shadow-sm flex items-center space-x-1.5 transition-all active:scale-95 disabled:opacity-50"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>{importing ? 'Saving to Database...' : `Confirm Import to PostgreSQL (${report?.valid_count || 0})`}</span>
              </button>
            )}

            {step === 'result' && (
              <>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-full border border-[#D9E8E3] text-xs font-semibold text-[#12332C] hover:bg-white"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    if (onViewImportedRecords) onViewImportedRecords();
                  }}
                  className="px-5 py-2.5 rounded-full bg-[#006B4F] hover:bg-[#004D3A] text-white text-xs font-bold shadow-sm flex items-center space-x-1.5 transition-all active:scale-95"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>View Imported Records</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

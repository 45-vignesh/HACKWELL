import React, { useState, useEffect } from 'react';
import { Search, Eye, TrendingUp, RefreshCw, Boxes, Edit3, FileSpreadsheet, ShieldCheck, CheckCircle2, AlertTriangle, XCircle, Clock } from 'lucide-react';
import { InventoryItem } from '../types';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { StockEditModal } from '../components/StockEditModal';
import { DataManagerModal } from '../components/DataManagerModal';

interface InventoryPageProps {
  onSelectMedicine: (id: number) => void;
  onNavigateToForecast: (medicineId: number) => void;
}

export const InventoryPage: React.FC<InventoryPageProps> = ({
  onSelectMedicine,
  onNavigateToForecast
}) => {
  const { user, role } = useAuth();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [wardFilter, setWardFilter] = useState('');
  const [riskFilter, setRiskFilter] = useState('');
  const [selectedEditItem, setSelectedEditItem] = useState<InventoryItem | null>(null);
  const [isDataMgrModalOpen, setIsDataMgrModalOpen] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await api.getInventory({
        category: categoryFilter || undefined,
        risk_level: riskFilter || undefined,
        search: search || undefined
      });
      setItems(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [categoryFilter, riskFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadData();
  };

  const filteredItems = items.filter((item) => {
    if (wardFilter && item.ward_name !== wardFilter) return false;
    return true;
  });

  const categories = Array.from(new Set(items.map((i) => i.category)));
  const wards = Array.from(new Set(items.map((i) => i.ward_name)));

  const renderTrustBadge = (status?: string) => {
    switch (status) {
      case 'VALIDATED':
        return (
          <span className="inline-flex items-center space-x-1 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
            <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600" />
            <span>VALIDATED</span>
          </span>
        );
      case 'WARNING':
        return (
          <span className="inline-flex items-center space-x-1 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300">
            <AlertTriangle className="w-2.5 h-2.5 text-amber-600" />
            <span>WARNING</span>
          </span>
        );
      case 'REJECTED':
        return (
          <span className="inline-flex items-center space-x-1 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-300">
            <XCircle className="w-2.5 h-2.5 text-rose-600" />
            <span>REJECTED</span>
          </span>
        );
      case 'PENDING_REVIEW':
      default:
        return (
          <span className="inline-flex items-center space-x-1 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-cyan-100 text-cyan-800 border border-cyan-300">
            <Clock className="w-2.5 h-2.5 text-cyan-600" />
            <span>PENDING</span>
          </span>
        );
    }
  };

  return (
    <div className="p-6 space-y-5 text-[#12332C]">
      {/* Page Header matching reference */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center space-x-3">
            <h1 className="text-xl font-bold text-[#12332C] flex items-center space-x-2">
              <Boxes className="w-5 h-5 text-[#006B4F]" />
              <span>Ward & Pharmacy Inventory</span>
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono bg-[#008F83]/10 text-[#006B4F] border border-[#008F83]/25 font-semibold">
              Operational Stock: Synthetic
            </span>
          </div>
          <p className="text-xs text-[#647772] mt-0.5">
            Real-time multi-echelon stock levels, days-of-supply calculations, and risk tracking
          </p>
        </div>

        <div className="flex items-center space-x-2.5">
          {(role === 'DATA_MANAGER' || role === 'ADMIN') && (
            <button
              onClick={() => setIsDataMgrModalOpen(true)}
              className="px-3.5 py-1.5 rounded-full bg-[#006B4F] hover:bg-[#004D3A] text-white text-xs font-bold shadow-sm flex items-center space-x-1.5 transition-all active:scale-95"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Data Governance & CSV Import</span>
            </button>
          )}

          <button
            onClick={loadData}
            className="px-3.5 py-1.5 rounded-full bg-white border border-[#D9E8E3] text-[#12332C] hover:text-[#006B4F] hover:border-[#008F83] text-xs font-semibold shadow-sm flex items-center space-x-1.5 transition-all"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-[#006B4F]' : ''}`} />
            <span>Refresh Stock</span>
          </button>
        </div>
      </div>

      {/* Filter Toolbar matching reference pill styles */}
      <div className="ref-card p-3 flex flex-wrap items-center gap-3">
        {/* Search Pill */}
        <form onSubmit={handleSearchSubmit} className="relative flex-1 min-w-[220px]">
          <Search className="w-3.5 h-3.5 text-[#647772] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search medicine name, code..."
            className="w-full bg-[#F3FAF7] border border-[#D9E8E3] rounded-full pl-9 pr-4 py-1.5 text-xs text-[#12332C] placeholder-[#647772] focus:outline-none focus:border-[#006B4F]"
          />
        </form>

        {/* Dropdown Pills */}
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="bg-[#F3FAF7] border border-[#D9E8E3] text-[#12332C] text-xs rounded-full px-3.5 py-1.5 focus:outline-none focus:border-[#006B4F] cursor-pointer"
        >
          <option value="">All Categories</option>
          {categories.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>

        <select
          value={wardFilter}
          onChange={(e) => setWardFilter(e.target.value)}
          className="bg-[#F3FAF7] border border-[#D9E8E3] text-[#12332C] text-xs rounded-full px-3.5 py-1.5 focus:outline-none focus:border-[#006B4F] cursor-pointer"
        >
          <option value="">All Wards</option>
          {wards.map((w) => (
            <option key={w} value={w}>{w}</option>
          ))}
        </select>

        <select
          value={riskFilter}
          onChange={(e) => setRiskFilter(e.target.value)}
          className="bg-[#F3FAF7] border border-[#D9E8E3] text-[#12332C] text-xs rounded-full px-3.5 py-1.5 focus:outline-none focus:border-[#006B4F] cursor-pointer"
        >
          <option value="">All Risk Tiers</option>
          <option value="HIGH">Critical &le; 3 Days</option>
          <option value="MEDIUM">Medium &le; 7 Days</option>
          <option value="LOW">Low / Stable</option>
        </select>
      </div>

      {/* Main Inventory Table */}
      <div className="ref-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#D9E8E3] bg-[#F3FAF7] text-[#647772] text-[11px] uppercase tracking-wider font-mono">
                <th className="py-3 px-4">Medicine & Generic</th>
                <th className="py-3 px-4">Ward Location</th>
                <th className="py-3 px-4">Stock Level</th>
                <th className="py-3 px-4">Daily Burn</th>
                <th className="py-3 px-4">Days Left</th>
                <th className="py-3 px-4">Nearest Expiry</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#D9E8E3] text-[#12332C]">
              {loading ? (
                [...Array(6)].map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={8} className="py-4 px-4 h-12 bg-[#F3FAF7]/50"></td>
                  </tr>
                ))
              ) : filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-[#647772]">
                    No medicine inventory records found matching your filters.
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => (
                  <tr
                    key={item.id}
                    onClick={() => onSelectMedicine(item.id)}
                    className="hover:bg-[#F3FAF7]/70 cursor-pointer transition-colors"
                  >
                    <td className="py-3.5 px-4">
                      <div className="flex items-center space-x-2">
                        <span className="font-semibold text-[#12332C]">{item.medicine_name}</span>
                        {renderTrustBadge(item.trust_status || 'VALIDATED')}
                        <span className="text-[9px] font-mono px-1.5 py-0.5 rounded-full bg-[#E6F4F0] text-[#006B4F] border border-[#006B4F]/20 font-bold uppercase">
                          {item.data_source || 'SYNTHETIC'}
                        </span>
                      </div>
                      <div className="text-[10px] text-[#647772]">
                        {item.generic_name} • <span className="font-mono text-[#006B4F] font-semibold">{item.medicine_code}</span>
                        {item.supplier_name && (
                          <span className="text-[#647772]"> • {item.supplier_name}</span>
                        )}
                        {item.last_modified_by && (
                          <span className="text-emerald-700 font-medium"> • By: {item.last_modified_by}</span>
                        )}
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="font-medium text-[#12332C]">{item.ward_name}</div>
                      <div className="text-[10px] text-[#647772]">{item.department_name}</div>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="font-bold text-[#12332C] font-mono">
                        {item.current_stock} <span className="text-[10px] text-[#647772]">{item.unit}</span>
                      </div>
                      <div className="text-[10px] text-[#647772]">
                        Buffer: {item.safety_stock} | Reorder: {item.reorder_point ?? item.min_level}
                      </div>
                    </td>

                    <td className="py-3.5 px-4 font-mono">
                      {item.daily_consumption_avg} <span className="text-[10px] text-[#647772]">/day</span>
                    </td>

                    <td className="py-3.5 px-4">
                      <span
                        className={`ref-pill-badge px-2.5 py-0.5 text-[11px] font-mono font-bold ${
                          item.days_remaining <= 3.0
                            ? 'bg-[#DC2626]/15 text-[#DC2626] border border-[#DC2626]/30'
                            : item.days_remaining <= 7.0
                            ? 'bg-[#F59E0B]/15 text-[#B45309] border border-[#F59E0B]/30'
                            : 'bg-[#16A34A]/15 text-[#16A34A] border border-[#16A34A]/30'
                        }`}
                      >
                        {item.days_remaining}d left
                      </span>
                    </td>

                    <td className="py-3.5 px-4">
                      {item.nearest_expiry_date ? (
                        <div>
                          <div className="font-mono text-[#12332C]">{item.nearest_expiry_date}</div>
                          <div
                            className={`text-[10px] ${
                              item.days_to_nearest_expiry! <= 30
                                ? 'text-[#DC2626] font-bold'
                                : item.days_to_nearest_expiry! <= 90
                                ? 'text-[#B45309] font-semibold'
                                : 'text-[#647772]'
                            }`}
                          >
                            {item.days_to_nearest_expiry} days left
                          </div>
                        </div>
                      ) : (
                        <span className="text-[#647772]">N/A</span>
                      )}
                    </td>

                    <td className="py-3.5 px-4">
                      <span
                        className={`ref-pill-badge px-2.5 py-0.5 text-[10px] font-mono uppercase font-bold ${
                          item.stock_status === 'CRITICAL_LOW'
                            ? 'bg-[#DC2626]/15 text-[#DC2626] border border-[#DC2626]/30'
                            : item.stock_status === 'LOW_STOCK'
                            ? 'bg-[#F59E0B]/15 text-[#B45309] border border-[#F59E0B]/30'
                            : item.stock_status === 'SURPLUS'
                            ? 'bg-[#008F83]/15 text-[#008F83] border border-[#008F83]/30'
                            : 'bg-[#F3FAF7] text-[#12332C] border border-[#D9E8E3]'
                        }`}
                      >
                        {item.stock_status.replace('_', ' ')}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-right space-x-1.5" onClick={(e) => e.stopPropagation()}>
                      {(role === 'DATA_MANAGER' || role === 'ADMIN') ? (
                        <button
                          onClick={() => setSelectedEditItem(item)}
                          title="Edit Stock Level (Data Manager)"
                          className="w-7 h-7 rounded-full bg-[#006B4F]/15 hover:bg-[#006B4F] text-[#006B4F] hover:text-white border border-[#006B4F]/30 inline-flex items-center justify-center transition-colors shadow-sm"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                      ) : (
                        <button
                          disabled
                          title="Read-only: Stock editing restricted to Data Manager role"
                          className="w-7 h-7 rounded-full bg-gray-100 border border-gray-200 text-gray-400 cursor-not-allowed inline-flex items-center justify-center"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button
                        onClick={() => onSelectMedicine(item.id)}
                        title="View Batches & Drawer"
                        className="w-7 h-7 rounded-full bg-[#F3FAF7] hover:bg-white border border-[#D9E8E3] text-[#008F83] hover:text-[#006B4F] hover:border-[#008F83] inline-flex items-center justify-center transition-colors shadow-sm"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => onNavigateToForecast(item.medicine_id)}
                        title="Forecast Future Demand"
                        className="w-7 h-7 rounded-full bg-[#006B4F]/15 hover:bg-[#006B4F] text-[#006B4F] hover:text-white border border-[#006B4F]/30 inline-flex items-center justify-center transition-colors shadow-sm"
                      >
                        <TrendingUp className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Operational Stock Edit & Governance Modals */}
      <StockEditModal
        item={selectedEditItem}
        isOpen={!!selectedEditItem}
        onClose={() => setSelectedEditItem(null)}
        onSuccess={() => loadData()}
      />

      <DataManagerModal
        isOpen={isDataMgrModalOpen}
        onClose={() => setIsDataMgrModalOpen(false)}
        onSuccess={() => loadData()}
      />
    </div>
  );
};

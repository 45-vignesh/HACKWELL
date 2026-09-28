import axios from 'axios';
import {
  DashboardSummary,
  InventoryItem,
  ForecastData,
  AlertItem,
  ApprovalItem,
  StockTransferItem,
  PurchaseOrderItem,
  SimulationResponse,
  DataSourceItem,
  DataQualityReport
} from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const client = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
});

export const api = {
  // Dashboard & System
  getHealth: async () => {
    const res = await client.get('/api/health');
    return res.data;
  },
  getDashboardSummary: async (): Promise<DashboardSummary> => {
    const res = await client.get<DashboardSummary>('/api/dashboard/summary');
    return res.data;
  },
  getAnalytics: async () => {
    const res = await client.get('/api/analytics');
    return res.data;
  },

  // Inventory
  getInventory: async (params?: { ward_id?: number; category?: string; criticality?: string; search?: string; risk_level?: string }): Promise<InventoryItem[]> => {
    const res = await client.get<InventoryItem[]>('/api/inventory', { params });
    return res.data;
  },
  getInventoryDetail: async (id: number) => {
    const res = await client.get(`/api/inventory/${id}`);
    return res.data;
  },

  // Forecasts
  getForecast: async (medicineId?: number, wardId?: number, horizonDays: number = 14): Promise<ForecastData> => {
    const res = await client.get<ForecastData>('/api/forecasts', {
      params: { medicine_id: medicineId, ward_id: wardId, horizon_days: horizonDays }
    });
    return res.data;
  },

  // Alerts
  getAlerts: async (severity?: string): Promise<AlertItem[]> => {
    const res = await client.get<AlertItem[]>('/api/alerts', { params: { severity } });
    return res.data;
  },
  resolveAlert: async (id: number) => {
    const res = await client.post(`/api/alerts/${id}/resolve`);
    return res.data;
  },

  // Transfers
  getTransfers: async (): Promise<StockTransferItem[]> => {
    const res = await client.get<StockTransferItem[]>('/api/transfers');
    return res.data;
  },
  executeTransfer: async (id: number, executedBy: string = 'Chief Pharmacist') => {
    const res = await client.post(`/api/transfers/${id}/execute`, null, { params: { executed_by: executedBy } });
    return res.data;
  },

  // Procurement
  getPurchaseOrders: async (): Promise<PurchaseOrderItem[]> => {
    const res = await client.get<PurchaseOrderItem[]>('/api/procurement/orders');
    return res.data;
  },
  executePurchaseOrder: async (id: number, executedBy: string = 'Chief Pharmacist') => {
    const res = await client.post(`/api/procurement/${id}/execute`, null, { params: { executed_by: executedBy } });
    return res.data;
  },

  // Human-in-the-Loop Approvals
  getApprovals: async (status?: string): Promise<ApprovalItem[]> => {
    const res = await client.get<ApprovalItem[]>('/api/approvals', { params: { status } });
    return res.data;
  },
  decideApproval: async (id: number, decision: 'APPROVE' | 'REJECT', reason: string, decisionBy: string = 'Chief Pharmacist') => {
    const res = await client.post(`/api/approvals/${id}/decide`, {
      decision,
      reason,
      decision_by: decisionBy
    });
    return res.data;
  },

  // Waste Guard
  getExpiringBatches: async (horizonDays: number = 90) => {
    const res = await client.get('/api/waste/expiring', { params: { horizon_days: horizonDays } });
    return res.data;
  },

  // Multi-Agent Architecture
  getAgents: async () => {
    const res = await client.get('/api/agents');
    return res.data;
  },
  getAgentRuns: async () => {
    const res = await client.get('/api/agents/runs');
    return res.data;
  },
  triggerAgentAnalyze: async (medicineId?: number, wardId?: number, triggerReason?: string) => {
    const res = await client.post('/api/agents/analyze', null, {
      params: { medicine_id: medicineId, ward_id: wardId, trigger_reason: triggerReason }
    });
    return res.data;
  },

  // Hackathon Simulation Hero Flow
  runDengueSimulation: async (): Promise<SimulationResponse> => {
    const res = await client.post<SimulationResponse>('/api/simulation/dengue');
    return res.data;
  },
  resetSimulation: async () => {
    const res = await client.post('/api/simulation/reset');
    return res.data;
  },

  // Grounded AI Assistant Chat
  sendChatMessage: async (message: string, contextMedicineId?: number) => {
    const res = await client.post('/api/agent/chat', {
      message,
      context_medicine_id: contextMedicineId
    });
    return res.data;
  },

  // Data Sources & Provenance
  getDataSources: async (): Promise<DataSourceItem[]> => {
    const res = await client.get<DataSourceItem[]>('/api/data-sources');
    return res.data;
  },
  getDataQuality: async (): Promise<DataQualityReport> => {
    const res = await client.get<DataQualityReport>('/api/data-quality');
    return res.data;
  },
  getUsageHistory: async (medicineId: number) => {
    const res = await client.get(`/api/usage-history/${medicineId}`);
    return res.data;
  },
  triggerMimicImport: async (dataDir?: string) => {
    const res = await client.post('/api/data/import/mimic', null, { params: { data_dir: dataDir } });
    return res.data;
  }
};

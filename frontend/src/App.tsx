import React, { useState, useEffect } from 'react';
import { Sidebar, ActiveTab } from './components/Sidebar';
import { Header } from './components/Header';
import { AIAssistantDrawer } from './components/AIAssistantDrawer';
import { MedicineDetailModal } from './components/MedicineDetailModal';
import { LoginModal } from './components/LoginModal';
import { AuthProvider, useAuth } from './context/AuthContext';

import { DashboardPage } from './pages/DashboardPage';
import { InventoryPage } from './pages/InventoryPage';
import { ForecastPage } from './pages/ForecastPage';
import { AlertsPage } from './pages/AlertsPage';
import { ApprovalsPage } from './pages/ApprovalsPage';
import { ProcurementPage } from './pages/ProcurementPage';
import { DistributionPage } from './pages/DistributionPage';
import { WasteGuardPage } from './pages/WasteGuardPage';
import { AgentsPage } from './pages/AgentsPage';
import { SimulationPage } from './pages/SimulationPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { AuditLogPage } from './pages/AuditLogPage';
import { DataQualityPage } from './pages/DataQualityPage';

import { DashboardSummary } from './types';
import { api } from './services/api';

const AppContent: React.FC = () => {
  const { role, user, isLoginModalOpen, setIsLoginModalOpen } = useAuth();
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [currentRole, setCurrentRole] = useState(role);
  const [isAssistantOpen, setIsAssistantOpen] = useState(false);
  const [selectedInventoryId, setSelectedInventoryId] = useState<number | null>(null);
  const [forecastMedicineId, setForecastMedicineId] = useState<number>(1);

  const fetchSummary = async (showRefreshSpinner = false) => {
    if (showRefreshSpinner) setIsRefreshing(true);
    try {
      const data = await api.getDashboardSummary();
      setSummary(data);
    } catch (err) {
      console.error('Failed to fetch dashboard summary:', err);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchSummary();
    const interval = setInterval(() => {
      fetchSummary();
    }, 20000);
    return () => clearInterval(interval);
  }, []);

  const handleNavigateToForecast = (medId: number) => {
    setForecastMedicineId(medId);
    setActiveTab('forecasts');
  };

  return (
    <div className="bg-[#E6F4F0] min-h-screen p-3 md:p-5 lg:p-6 flex items-center justify-center font-sans antialiased text-[#12332C]">
      {/* Outer Application Window with reference rounded-3xl and border */}
      <div className="w-full max-w-[1580px] h-[92vh] min-h-[760px] bg-[#F3FAF7] border border-[#D9E8E3] rounded-[30px] shadow-app-frame flex overflow-hidden relative">
        {/* Left Navigation Sidebar */}
        <Sidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          pendingApprovalsCount={summary?.pending_approvals || 0}
          criticalAlertsCount={summary?.critical_stockout_alerts || 0}
          currentRole={role}
        />

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#F3FAF7]">
          {/* Top Navigation Header */}
          <Header
            currentRole={role}
            setCurrentRole={setCurrentRole}
            onOpenAssistant={() => setIsAssistantOpen(true)}
            onRunSimulation={() => setActiveTab('simulation')}
            onRefreshData={() => fetchSummary(true)}
            isRefreshing={isRefreshing}
          />

          {/* Dynamic Scrollable Page Body */}
          <main className="flex-1 overflow-y-auto bg-[#F3FAF7]">
            {activeTab === 'dashboard' && (
              <DashboardPage
                summary={summary}
                loading={loading}
                onNavigateTab={setActiveTab}
                onRefreshData={() => fetchSummary(true)}
                onSelectMedicine={(id) => setSelectedInventoryId(id)}
              />
            )}

            {activeTab === 'inventory' && (
              <InventoryPage
                onSelectMedicine={(id) => setSelectedInventoryId(id)}
                onNavigateToForecast={handleNavigateToForecast}
              />
            )}

            {activeTab === 'forecasts' && (
              <ForecastPage initialMedicineId={forecastMedicineId} />
            )}

            {activeTab === 'alerts' && <AlertsPage />}

            {activeTab === 'approvals' && (
              <ApprovalsPage onRefreshData={() => fetchSummary(true)} />
            )}

            {activeTab === 'procurement' && (
              <ProcurementPage onRefreshData={() => fetchSummary(true)} />
            )}

            {activeTab === 'distribution' && (
              <DistributionPage onRefreshData={() => fetchSummary(true)} />
            )}

            {activeTab === 'waste' && <WasteGuardPage />}

            {activeTab === 'agents' && <AgentsPage />}

            {activeTab === 'simulation' && (
              <SimulationPage
                onRefreshData={() => fetchSummary(true)}
                onNavigateToApprovals={() => setActiveTab('approvals')}
              />
            )}

            {activeTab === 'analytics' && <AnalyticsPage />}

            {activeTab === 'audit' && <AuditLogPage />}
            {activeTab === 'data-quality' && <DataQualityPage />}
          </main>
        </div>

        {/* Conversational AI Assistant Drawer */}
        <AIAssistantDrawer
          isOpen={isAssistantOpen}
          onClose={() => setIsAssistantOpen(false)}
        />

        {/* Medicine Detailed Modal */}
        <MedicineDetailModal
          inventoryId={selectedInventoryId}
          onClose={() => setSelectedInventoryId(null)}
          onNavigateToForecast={handleNavigateToForecast}
        />

        {/* Hospital RBAC Login & Role Switcher Modal */}
        <LoginModal
          isOpen={isLoginModalOpen}
          onClose={() => setIsLoginModalOpen(false)}
        />
      </div>
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
};

export default App;

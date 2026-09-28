import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { RoleSelectionScreen } from './RoleSelectionScreen';
import { DataManagerLoginPage } from './DataManagerLoginPage';
import { PharmacistLoginPage } from './PharmacistLoginPage';
import { AdminLoginPage } from './AdminLoginPage';

export const AuthGateway: React.FC = () => {
  const { authPortalView, setAuthPortalView } = useAuth();

  switch (authPortalView) {
    case 'data_manager':
      return <DataManagerLoginPage onBack={() => setAuthPortalView('selection')} />;
    case 'pharmacist':
      return <PharmacistLoginPage onBack={() => setAuthPortalView('selection')} />;
    case 'admin':
      return <AdminLoginPage onBack={() => setAuthPortalView('selection')} />;
    case 'selection':
    default:
      return <RoleSelectionScreen onSelectRole={(view) => setAuthPortalView(view)} />;
  }
};

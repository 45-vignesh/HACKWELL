import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { RoleSelectionScreen } from './RoleSelectionScreen';
import { DataManagerLoginPage } from './DataManagerLoginPage';
import { DataManagerRegisterPage } from './DataManagerRegisterPage';
import { PharmacistLoginPage } from './PharmacistLoginPage';
import { PharmacistRegisterPage } from './PharmacistRegisterPage';
import { AdminLoginPage } from './AdminLoginPage';
import { AdminRegisterPage } from './AdminRegisterPage';

export const AuthGateway: React.FC = () => {
  const { authPortalView, setAuthPortalView } = useAuth();

  switch (authPortalView) {
    case 'data_manager':
    case 'data_manager_login':
      return (
        <DataManagerLoginPage
          onBack={() => setAuthPortalView('selection')}
          onGoToRegister={() => setAuthPortalView('data_manager_register')}
        />
      );

    case 'data_manager_register':
      return (
        <DataManagerRegisterPage
          onBack={() => setAuthPortalView('selection')}
          onGoToLogin={() => setAuthPortalView('data_manager_login')}
        />
      );

    case 'pharmacist':
    case 'pharmacist_login':
      return (
        <PharmacistLoginPage
          onBack={() => setAuthPortalView('selection')}
          onGoToRegister={() => setAuthPortalView('pharmacist_register')}
        />
      );

    case 'pharmacist_register':
      return (
        <PharmacistRegisterPage
          onBack={() => setAuthPortalView('selection')}
          onGoToLogin={() => setAuthPortalView('pharmacist_login')}
        />
      );

    case 'admin':
    case 'admin_login':
      return (
        <AdminLoginPage
          onBack={() => setAuthPortalView('selection')}
          onGoToRegister={() => setAuthPortalView('admin_register')}
        />
      );

    case 'admin_register':
      return (
        <AdminRegisterPage
          onBack={() => setAuthPortalView('selection')}
          onGoToLogin={() => setAuthPortalView('admin_login')}
        />
      );

    case 'selection':
    default:
      return (
        <RoleSelectionScreen
          onSelectRole={(view) => setAuthPortalView(view)}
        />
      );
  }
};

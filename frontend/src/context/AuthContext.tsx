import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole } from '../types';
import { api } from '../services/api';

export type AuthPortalView =
  | 'selection'
  | 'data_manager'
  | 'data_manager_login'
  | 'data_manager_register'
  | 'pharmacist'
  | 'pharmacist_login'
  | 'pharmacist_register'
  | 'admin'
  | 'admin_login'
  | 'admin_register';

interface AuthContextType {
  user: User | null;
  role: UserRole;
  token: string | null;
  isAuthenticated: boolean;
  authPortalView: AuthPortalView;
  setAuthPortalView: (view: AuthPortalView) => void;
  loginWithCredentials: (username: string, password: string, role?: string) => Promise<any>;
  registerAccount: (payload: {
    full_name: string;
    username: string;
    email: string;
    password: string;
    confirm_password: string;
    role: string;
  }) => Promise<{ message: string; username: string; role: string }>;
  switchRole: (newRole: UserRole) => Promise<void>;
  logout: () => void;
  isLoginModalOpen: boolean;
  setIsLoginModalOpen: (open: boolean) => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  role: 'PHARMACIST',
  token: null,
  isAuthenticated: false,
  authPortalView: 'selection',
  setAuthPortalView: () => {},
  loginWithCredentials: async () => {},
  registerAccount: async () => ({ message: '', username: '', role: '' }),
  switchRole: async () => {},
  logout: () => {},
  isLoginModalOpen: false,
  setIsLoginModalOpen: () => {}
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<UserRole>('PHARMACIST');
  const [token, setToken] = useState<string | null>(null);
  const [authPortalView, setAuthPortalView] = useState<AuthPortalView>(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const p = params.get('portal');
      if (p) return p as AuthPortalView;
    } catch {}
    return 'selection';
  });
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const pr = params.get('preview_role') as UserRole;
      if (pr) {
        setRole(pr);
        setUser({
          id: pr === 'DATA_MANAGER' ? 1 : (pr === 'ADMIN' ? 3 : 2),
          username: pr.toLowerCase(),
          role: pr,
          display_name: pr === 'DATA_MANAGER' ? 'Liam Patel' : (pr === 'ADMIN' ? 'Marcus Vance' : 'Dr. Sarah Alston'),
          title: pr === 'DATA_MANAGER' ? 'Inventory Data Specialist' : (pr === 'ADMIN' ? 'Hospital Systems Administrator' : 'Chief Pharmacist & Clinical Approver')
        });
        setToken('preview_session_token');
        return;
      }
    } catch {}

    const savedToken = localStorage.getItem('medisentinel_token');
    const savedRole = localStorage.getItem('medisentinel_role') as UserRole;
    const savedUser = localStorage.getItem('medisentinel_user');
    const savedName = localStorage.getItem('medisentinel_display_name');

    if (savedToken && savedRole) {
      setRole(savedRole);
      setUser({
        id: savedRole === 'DATA_MANAGER' ? 1 : (savedRole === 'ADMIN' ? 3 : 2),
        username: savedUser || (savedRole.toLowerCase()),
        role: savedRole,
        display_name: savedName || (savedRole === 'DATA_MANAGER' ? 'Liam Patel' : (savedRole === 'ADMIN' ? 'Marcus Vance' : 'Dr. Sarah Alston')),
        title: savedRole === 'DATA_MANAGER' ? 'Inventory Data Specialist' : (savedRole === 'ADMIN' ? 'Hospital Systems Administrator' : 'Chief Pharmacist & Clinical Approver')
      });
      setToken(savedToken);
    }
  }, []);

  const loginWithCredentials = async (username: string, password: string, portalRole?: string) => {
    const res = await api.login({ username, password, role: portalRole });
    if (res?.user && res?.token) {
      setUser(res.user);
      setRole(res.user.role);
      setToken(res.token);
      setAuthPortalView('selection');
      setIsLoginModalOpen(false);
    }
    return res;
  };

  const registerAccount = async (payload: {
    full_name: string;
    username: string;
    email: string;
    password: string;
    confirm_password: string;
    role: string;
  }) => {
    return await api.register(payload);
  };

  const switchRole = async (newRole: UserRole) => {
    try {
      const res = await api.login({ demo_role: newRole });
      if (res?.user && res?.token) {
        setUser(res.user);
        setRole(res.user.role);
        setToken(res.token);
      }
    } catch (err) {
      console.warn('Backend login fallback to local role state:', err);
      setRole(newRole);
      localStorage.setItem('medisentinel_role', newRole);
    }
  };

  const logout = () => {
    localStorage.removeItem('medisentinel_token');
    localStorage.removeItem('medisentinel_role');
    localStorage.removeItem('medisentinel_user');
    localStorage.removeItem('medisentinel_display_name');
    setUser(null);
    setToken(null);
    setAuthPortalView('selection');
    setIsLoginModalOpen(false);
  };

  const isAuthenticated = !!(token && user);

  return (
    <AuthContext.Provider
      value={{
        user,
        role,
        token,
        isAuthenticated,
        authPortalView,
        setAuthPortalView,
        loginWithCredentials,
        registerAccount,
        switchRole,
        logout,
        isLoginModalOpen,
        setIsLoginModalOpen
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

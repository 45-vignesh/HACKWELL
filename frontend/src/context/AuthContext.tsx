import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole } from '../types';
import { api } from '../services/api';

interface AuthContextType {
  user: User | null;
  role: UserRole;
  token: string | null;
  switchRole: (newRole: UserRole) => Promise<void>;
  logout: () => void;
  isLoginModalOpen: boolean;
  setIsLoginModalOpen: (open: boolean) => void;
}

const defaultUser: User = {
  id: 2,
  username: 'pharmacist',
  role: 'PHARMACIST',
  display_name: 'Dr. Sarah Alston',
  title: 'Chief Pharmacist & Clinical Approver'
};

const AuthContext = createContext<AuthContextType>({
  user: defaultUser,
  role: 'PHARMACIST',
  token: null,
  switchRole: async () => {},
  logout: () => {},
  isLoginModalOpen: false,
  setIsLoginModalOpen: () => {}
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(defaultUser);
  const [role, setRole] = useState<UserRole>('PHARMACIST');
  const [token, setToken] = useState<string | null>(null);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

  useEffect(() => {
    const savedToken = localStorage.getItem('medisentinel_token');
    const savedRole = localStorage.getItem('medisentinel_role') as UserRole;
    const savedUser = localStorage.getItem('medisentinel_user');
    const savedName = localStorage.getItem('medisentinel_display_name');

    if (savedRole) {
      setRole(savedRole);
      setUser({
        id: savedRole === 'DATA_MANAGER' ? 1 : (savedRole === 'ADMIN' ? 3 : 2),
        username: savedUser || (savedRole.toLowerCase()),
        role: savedRole,
        display_name: savedName || (savedRole === 'DATA_MANAGER' ? 'Alex Chen' : (savedRole === 'ADMIN' ? 'Elena Rostova' : 'Dr. Sarah Alston')),
        title: savedRole === 'DATA_MANAGER' ? 'Inventory Data Specialist' : (savedRole === 'ADMIN' ? 'Hospital Systems Administrator' : 'Chief Pharmacist & Clinical Approver')
      });
      setToken(savedToken);
    } else {
      // Initialize with demo pharmacist token
      switchRole('PHARMACIST');
    }
  }, []);

  const switchRole = async (newRole: UserRole) => {
    try {
      const res = await api.login({ demo_role: newRole });
      if (res?.user) {
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
    setRole('PHARMACIST');
    setToken(null);
    setIsLoginModalOpen(true);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        role,
        token,
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

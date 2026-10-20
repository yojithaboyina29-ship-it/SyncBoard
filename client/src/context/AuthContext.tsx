import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, Workspace } from '../types/index.js';
import { api } from '../services/api.js';
import { initSocket, disconnectSocket } from '../services/socket.js';

interface AuthContextType {
  user: User | null;
  token: string | null;
  workspaces: Workspace[];
  currentWorkspace: Workspace | null;
  setCurrentWorkspace: (ws: Workspace | null) => void;
  login: (email: string, pass: string) => Promise<void>;
  register: (name: string, email: string, pass: string) => Promise<void>;
  logout: () => void;
  refreshWorkspaces: () => Promise<void>;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('syncboard_token'));
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [currentWorkspace, setCurrentWorkspace] = useState<Workspace | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchWorkspaces = async () => {
    try {
      const res = await api.getWorkspaces();
      setWorkspaces(res.workspaces);
      if (res.workspaces.length > 0) {
        setCurrentWorkspace((prev) => {
          if (!prev) return res.workspaces[0];
          const found = res.workspaces.find((w) => w.id === prev.id);
          return found || res.workspaces[0];
        });
      }
    } catch (err) {
      console.error('Failed to load workspaces:', err);
    }
  };

  useEffect(() => {
    async function loadUser() {
      if (!token) {
        setIsLoading(false);
        return;
      }

      try {
        const res = await api.me();
        setUser(res.user);
        initSocket(token);
        await fetchWorkspaces();
      } catch (err) {
        console.warn('Session expired or invalid, logging out');
        logout();
      } finally {
        setIsLoading(false);
      }
    }

    loadUser();
  }, [token]);

  const login = async (email: string, pass: string) => {
    const res = await api.login({ email, password: pass });
    localStorage.setItem('syncboard_token', res.token);
    setToken(res.token);
    setUser(res.user);
    initSocket(res.token);
    await fetchWorkspaces();
  };

  const register = async (name: string, email: string, pass: string) => {
    const res = await api.register({ name, email, password: pass });
    localStorage.setItem('syncboard_token', res.token);
    setToken(res.token);
    setUser(res.user);
    initSocket(res.token);
    await fetchWorkspaces();
  };

  const logout = () => {
    localStorage.removeItem('syncboard_token');
    setToken(null);
    setUser(null);
    setWorkspaces([]);
    setCurrentWorkspace(null);
    disconnectSocket();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        workspaces,
        currentWorkspace,
        setCurrentWorkspace,
        login,
        register,
        logout,
        refreshWorkspaces: fetchWorkspaces,
        isLoading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}

'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import {
  getToken,
  getUser,
  removeToken,
  removeUser,
  setToken,
  setUser,
} from '@/lib/auth';
import type { User } from '@/types/models';
import type { ApiResponse, LoginResponse, RegisterData } from '@/types/api';

interface AuthContextValue {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<User>;
  register: (data: RegisterData) => Promise<User>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUserState] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Recupera sessão do localStorage no mount
    const token = getToken();
    const savedUser = getUser();
    if (token && savedUser) {
      setUserState(savedUser);
    }
    setIsLoading(false);
  }, []);

  const login = useCallback(
    async (email: string, password: string) => {
      const response = await api.post<ApiResponse<LoginResponse>>(
        '/auth/login',
        { email, password },
      );
      const { accessToken, user: userData } = response.data.data;
      setToken(accessToken);
      setUser(userData);
      setUserState(userData);
      return userData;
    },
    [],
  );

  const register = useCallback(
    async (data: RegisterData) => {
      const response = await api.post<ApiResponse<LoginResponse>>(
        '/auth/register',
        data,
      );
      const { accessToken, user: userData } = response.data.data;
      setToken(accessToken);
      setUser(userData);
      setUserState(userData);
      return userData;
    },
    [],
  );

  const logout = useCallback(() => {
    removeToken();
    removeUser();
    setUserState(null);
    router.push('/login');
  }, [router]);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser usado dentro de AuthProvider');
  }
  return context;
}

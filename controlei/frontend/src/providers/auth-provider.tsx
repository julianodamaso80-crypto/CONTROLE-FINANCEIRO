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
import {
  getStoredClickIds,
  getStoredUtms,
  getFbp,
  getFbc,
  getGaClientId,
  newEventId,
  trackLeadSignup,
  trackTrialStarted,
} from '@/lib/tracking';

/**
 * Constrói o payload de tracking enviado no /auth/register.
 * Inclui UTMs, click IDs, _fbp/_fbc, GA client_id, landing, referrer.
 * Tudo opcional — se cookies/storage estiverem bloqueados, manda só o que tiver.
 */
async function buildTrackingPayload() {
  if (typeof window === 'undefined') return undefined;
  const clickIds = getStoredClickIds();
  const utms = getStoredUtms();
  return {
    event_id: newEventId(),
    external_id: undefined as string | undefined,
    ga_client_id: getGaClientId() || undefined,
    fbp: getFbp() || undefined,
    fbc: getFbc() || undefined,
    ...clickIds,
    ...utms,
    landing_page: document.referrer || window.location.href,
    page_referrer: document.referrer || undefined,
  };
}

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
      // Anexa atribuição capturada (UTMs + click IDs + cookies _fbp/_fbc/_ga + landing)
      // Backend usa pra preencher utm_attribution + disparar lead_signup + trial_started no Meta CAPI
      const tracking = await buildTrackingPayload();
      const response = await api.post<ApiResponse<LoginResponse>>(
        '/auth/register',
        { ...data, tracking },
      );
      const { accessToken, user: userData } = response.data.data;
      setToken(accessToken);
      setUser(userData);
      setUserState(userData);

      // Tracking client-side: dispara Lead + StartTrial (dual-fire com CAPI via dedup event_id)
      // O backend já disparou os mesmos eventos via CAPI no /auth/register — o event_id passado
      // como external_id faz Meta deduplicar em 7d.
      try {
        const externalId = (userData as { companyId?: string } | null)?.companyId;
        trackLeadSignup({ external_id: externalId, user_id: externalId });
        trackTrialStarted({ external_id: externalId, user_id: externalId });
      } catch {
        // tracking nunca pode quebrar UX
      }

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

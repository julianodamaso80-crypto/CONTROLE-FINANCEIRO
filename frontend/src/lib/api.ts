import axios from 'axios';
import { getToken, removeToken, removeUser } from './auth';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
});

// Adiciona token JWT em todas as requests
api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Trata erros de resposta
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (axios.isAxiosError(error)) {
      // Token expirado ou inválido — redireciona para login
      if (error.response?.status === 401 && typeof window !== 'undefined') {
        removeToken();
        removeUser();
        window.location.href = '/login';
      }

      // Extrai mensagem de erro do backend
      const backendMessage =
        error.response?.data?.message ?? error.response?.data?.error;
      const backendCode = error.response?.data?.code as string | undefined;
      if (backendMessage) {
        const e = new Error(backendMessage) as Error & { code?: string };
        if (backendCode) e.code = backendCode;
        return Promise.reject(e);
      }
    }

    return Promise.reject(error);
  },
);

/** Helper que desembrulha a resposta padrão { success, data } do backend */
export async function apiGet<T>(url: string, params?: Record<string, string | undefined>): Promise<T> {
  const cleanParams: Record<string, string> = {};
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== '') {
        cleanParams[key] = value;
      }
    }
  }
  const res = await api.get(url, { params: cleanParams });
  return res.data.data as T;
}

export default api;

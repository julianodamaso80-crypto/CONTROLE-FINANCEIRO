import type { User } from '@/types/models';

const TOKEN_KEY = 'meucaixa_token';
const USER_KEY = 'meucaixa_user';

function isBrowser(): boolean {
  return typeof window !== 'undefined';
}

export function getToken(): string | null {
  if (!isBrowser()) return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  if (!isBrowser()) return;
  localStorage.setItem(TOKEN_KEY, token);
}

export function removeToken(): void {
  if (!isBrowser()) return;
  localStorage.removeItem(TOKEN_KEY);
}

export function isAuthenticated(): boolean {
  return !!getToken();
}

export function getUser(): User | null {
  if (!isBrowser()) return null;
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as User;
  } catch {
    return null;
  }
}

export function setUser(user: User): void {
  if (!isBrowser()) return;
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function removeUser(): void {
  if (!isBrowser()) return;
  localStorage.removeItem(USER_KEY);
}

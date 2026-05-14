'use client';

import { create } from 'zustand';
import type { User } from '@/lib/core/types';
import { CSRF_HEADER } from '@/lib/auth/csrf-constants';
import { decodeJwtPayloadBrowser, isSessionTokenAlive } from '@/lib/client/session-token';

// ============================================================
// AUTH STORE - Manages authentication state
// Dual storage: localStorage + cookie for maximum reliability
// ============================================================

// Delete a cookie (non-httpOnly only; `erp_session` is cleared via `/api/auth/logout`)
function deleteCookie(name: string) {
  if (typeof document === 'undefined') return;
  document.cookie = `${name}=; max-age=0; path=/; SameSite=Lax`;
}

// Get cookie value by name
function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const cookies = document.cookie.split(';');
  for (const cookie of cookies) {
    const [cookieName, ...rest] = cookie.trim().split('=');
    if (cookieName === name) {
      return rest.join('=') || null;
    }
  }
  return null;
}

// Save user to localStorage
function saveUser(user: User) {
  if (typeof window === 'undefined') return;
  localStorage.setItem('erp_user', JSON.stringify(user));
}

// Load user from localStorage
function loadUser(): User | null {
  if (typeof window === 'undefined') return null;
  try {
    const data = localStorage.getItem('erp_user');
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
}

// Token in localStorage + Authorization; `erp_session` cookie is httpOnly (set by `/api/auth/login`).
function saveToken(token: string) {
  if (typeof window === 'undefined') return;
  localStorage.setItem('erp_session', token);
}

// Clear all auth data
function clearAuth() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('erp_session');
  localStorage.removeItem('erp_user');
  deleteCookie('erp_session');
  deleteCookie('erp_csrf');
}

function validateToken(token: string): { userId: string; fullName: string; email: string; roles: string[]; exp: number } | null {
  if (!isSessionTokenAlive(token)) return null;
  const trimmed = token.trim();
  let decoded: Record<string, unknown> | null = null;

  if (trimmed.split('.').length === 3) {
    decoded = decodeJwtPayloadBrowser(trimmed);
  } else {
    try {
      decoded = JSON.parse(atob(trimmed)) as Record<string, unknown>;
    } catch {
      return null;
    }
  }

  if (!decoded?.userId) return null;
  const exp = typeof decoded.exp === 'number' ? decoded.exp : 0;

  return {
    userId: String(decoded.userId),
    fullName: String(decoded.fullName || decoded.userId),
    email: String(decoded.email || ''),
    roles: Array.isArray(decoded.roles) ? (decoded.roles as string[]).filter((r): r is string => typeof r === 'string' && Boolean(r)) : [],
    exp,
  };
}

interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: User | null;
  error: string | null;
  login: (username: string, password: string, rememberMe?: boolean) => Promise<boolean>;
  logout: () => void;
  checkAuth: () => boolean;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  isAuthenticated: false,
  isLoading: false,
  user: null,
  error: null,

  login: async (username: string, password: string, rememberMe?: boolean) => {
    set({ isLoading: true, error: null });

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, rememberMe: rememberMe === true }),
        credentials: 'same-origin',
      });

      if (!response.ok) {
        set({
          isAuthenticated: false,
          isLoading: false,
          user: null,
          error: 'فشل الاتصال بالخادم',
        });
        return false;
      }

      const result = await response.json();

      if (result.success && result.data) {
        const { token, user: apiUser } = result.data;

        const user: User = {
          id: apiUser.id,
          name: apiUser.name,
          fullName: apiUser.fullName || apiUser.name,
          email: apiUser.email,
          roles: apiUser.roles,
        };

        // Save token to BOTH localStorage and cookie
        saveToken(token);
        saveUser(user);

        set({ isAuthenticated: true, isLoading: false, user, error: null });
        return true;
      } else {
        set({
          isAuthenticated: false,
          isLoading: false,
          user: null,
          error: result.error || 'فشل تسجيل الدخول',
        });
        return false;
      }
    } catch {
      set({
        isAuthenticated: false,
        isLoading: false,
        user: null,
        error: 'فشل الاتصال بالخادم',
      });
      return false;
    }
  },

  logout: () => {
    const csrf = getCookie('erp_csrf');
    const headers: Record<string, string> = {};
    if (csrf) headers[CSRF_HEADER] = csrf;
    fetch('/api/auth/logout', {
      method: 'POST',
      credentials: 'same-origin',
      headers: Object.keys(headers).length ? headers : undefined,
    }).catch(() => {});
    clearAuth();
    set({ isAuthenticated: false, user: null, error: null });
  },

  checkAuth: () => {
    if (typeof window === 'undefined') return false;

    // First try localStorage
    let token = localStorage.getItem('erp_session');

    // If not in localStorage, try cookie
    if (!token) {
      const cookieValue = getCookie('erp_session');
      if (cookieValue) {
        token = cookieValue;
        localStorage.setItem('erp_session', token);
      }
    }

    if (!token) {
      clearAuth();
      set({ isAuthenticated: false, user: null });
      return false;
    }

    // Validate the token
    const decoded = validateToken(token);
    if (!decoded) {
      // Token is invalid or expired → clean up everything
      clearAuth();
      set({ isAuthenticated: false, user: null });
      return false;
    }

    // Load user from localStorage
    const user = loadUser();
    if (user) {
      set({ isAuthenticated: true, user });
      return true;
    } else {
      // Reconstruct user from token
      const reconstructedUser: User = {
        id: decoded.userId,
        name: decoded.fullName || decoded.userId,
        fullName: decoded.fullName || decoded.userId,
        email: decoded.email || '',
        roles: decoded.roles || [],
      };
      saveUser(reconstructedUser);
      set({ isAuthenticated: true, user: reconstructedUser });
      return true;
    }
  },

  clearError: () => set({ error: null }),
}));

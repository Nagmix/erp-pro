'use client';

import { create } from 'zustand';
import type { User } from '@/lib/core/types';
import { CSRF_HEADER } from '@/lib/auth/csrf-constants';
import {
  storeClientExpFromToken,
  clearClientExp,
  isClientSessionAlive,
  CLIENT_EXP_KEY,
} from '@/lib/client/session-token';

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

// SEC-08: لا توكن في localStorage. الكوكي httpOnly erp_session (يضبطه الخادم)
// هو الاعتماد الوحيد. في المتصفح يبقى فقط ملف تعريف المستخدم + طابع انتهاء غير حساس.
function saveToken(token: string) {
  // يحفظ طابع الانتهاء فقط (غير حساس) — التوكن نفسه لا يُكتب في أي تخزين
  storeClientExpFromToken(token);
}

// Clear all auth data
function clearAuth() {
  if (typeof window === 'undefined') return;
  // تنظيف مفاتيح قديمة من نموذج التوكن السابق
  localStorage.removeItem('erp_session');
  localStorage.removeItem(CLIENT_EXP_KEY);
  clearClientExp();
  localStorage.removeItem('erp_user');
  deleteCookie('erp_session');
  deleteCookie('erp_csrf');
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

    // SEC-08: حالة الواجهة تعتمد على erp_user + erp_exp (غير حساسين).
    // الصلاحية الفعلية يفرضها الخادم عبر كوكي httpOnly على كل طلب.
    if (!isClientSessionAlive()) {
      clearAuth();
      set({ isAuthenticated: false, user: null });
      return false;
    }

    const user = loadUser();
    if (user) {
      set({ isAuthenticated: true, user });
      return true;
    }

    // لا ملف تعريف محلي؟ الجلسة قد تكون سليمة لكن المتصفح جديد —
    // اعتبر المستخدم غير مسجل من منظور الواجهة (الـ middleware سيعيد التوجيه للدخول)
    clearAuth();
    set({ isAuthenticated: false, user: null });
    return false;
  },

  clearError: () => set({ error: null }),
}));

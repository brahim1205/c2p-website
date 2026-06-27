import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { apiRequest, clearApiSessionCache, toApiError } from '@/lib/api';
import { queryClient } from '@/lib/queryClient';
import { isUserRole, ROLE_DASHBOARD_PATHS, type AuthUser, type UserRole } from '@/lib/roles';

export interface RegisterData {
  firstName?: string;
  lastName?: string;
  email: string;
  phone?: string;
  password: string;
  role: string;
  bio?: string;
  location?: string;
  publicTitle?: string;
  website?: string;
  preferredLanguage?: string;
  skills?: string[];
  publicProfileEnabled?: boolean;
}

interface PendingTwoFactorState {
  challengeId: string;
  user: AuthUser;
  devCodePreview?: string;
}

interface AuthContextType {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  pendingTwoFactor: PendingTwoFactorState | null;
  login: (email: string, password: string) => Promise<{ success: boolean; message?: string; requires2FA?: boolean; devCodePreview?: string; user?: AuthUser }>;
  logout: () => Promise<void>;
  register: (data: RegisterData) => Promise<{ success: boolean; message?: string; user?: AuthUser }>;
  updateUser: (data: Partial<AuthUser>) => void;
  verify2FA: (code: string) => Promise<{ success: boolean; message?: string; user?: AuthUser }>;
  resend2FA: () => Promise<{ success: boolean; message?: string; devCodePreview?: string }>;
  refreshUser: () => Promise<void>;
}

declare global {
  var __c2p_auth_context__: ReturnType<typeof createContext<AuthContextType | null>> | undefined;
}

const AuthContext = globalThis.__c2p_auth_context__ ?? createContext<AuthContextType | null>(null);
globalThis.__c2p_auth_context__ = AuthContext;

const TWO_FACTOR_STORAGE_KEY = 'c2p_2fa_pending';

function readPendingTwoFactor(): PendingTwoFactorState | null {
  try {
    const stored = sessionStorage.getItem(TWO_FACTOR_STORAGE_KEY);
    return stored ? JSON.parse(stored) as PendingTwoFactorState : null;
  } catch {
    return null;
  }
}

function persistPendingTwoFactor(value: PendingTwoFactorState | null) {
  if (!value) {
    sessionStorage.removeItem(TWO_FACTOR_STORAGE_KEY);
    return;
  }
  sessionStorage.setItem(TWO_FACTOR_STORAGE_KEY, JSON.stringify(value));
}

function clearSecuritySensitiveStorage() {
  const keysToRemove = Object.keys(localStorage).filter((key) => (
    key.startsWith('c2p_')
    || key === 'c2p-dark-mode'
    || key.startsWith('course-')
    || key.startsWith('learning-')
    || key.startsWith('daily-xp-')
    || key.startsWith('resume-banner-dismissed-')
    || key === 'leaderboard-entries'
    || key === 'total-learning-time-seconds'
  ));

  for (const key of keysToRemove) {
    localStorage.removeItem(key);
  }

  sessionStorage.removeItem(TWO_FACTOR_STORAGE_KEY);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [pendingTwoFactor, setPendingTwoFactor] = useState<PendingTwoFactorState | null>(readPendingTwoFactor);
  const [isLoading, setIsLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    try {
      const currentUser = await apiRequest<AuthUser | null>('/auth/me', {}, { retryOnAuth: true });
      setUser(currentUser);
    } catch {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  useEffect(() => {
    const handleExpired = () => {
      void queryClient.cancelQueries();
      queryClient.clear();
      clearApiSessionCache();
      setUser(null);
      setPendingTwoFactor(null);
      persistPendingTwoFactor(null);
      clearSecuritySensitiveStorage();
    };

    window.addEventListener('c2p:auth-expired', handleExpired);
    return () => window.removeEventListener('c2p:auth-expired', handleExpired);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const result = await apiRequest<{
        user: AuthUser;
        requires2FA?: boolean;
        challengeId?: string;
        devCodePreview?: string;
      }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      }, { retryOnAuth: false });

      if (result.requires2FA && result.challengeId) {
        const nextPending = {
          challengeId: result.challengeId,
          user: result.user,
          devCodePreview: result.devCodePreview,
        } satisfies PendingTwoFactorState;
        setPendingTwoFactor(nextPending);
        persistPendingTwoFactor(nextPending);
        return { success: true, requires2FA: true, devCodePreview: result.devCodePreview, user: result.user };
      }

      setPendingTwoFactor(null);
      persistPendingTwoFactor(null);
      setUser(result.user);
      return { success: true, user: result.user };
    } catch (error) {
      const apiError = toApiError(error);
      return { success: false, message: apiError.message };
    } finally {
      setIsLoading(false);
    }
  }, []);

  const verify2FA = useCallback(async (code: string) => {
    setIsLoading(true);
    try {
      const pending = readPendingTwoFactor();
      if (!pending) {
        return { success: false, message: 'Session expirée. Veuillez vous reconnecter.' };
      }

      const result = await apiRequest<{ user: AuthUser }>('/auth/verify-2fa', {
        method: 'POST',
        body: JSON.stringify({
          challengeId: pending.challengeId,
          userId: pending.user.id,
          code,
        }),
      }, { retryOnAuth: false });

      setUser(result.user);
      setPendingTwoFactor(null);
      persistPendingTwoFactor(null);
      return { success: true, user: result.user };
    } catch (error) {
      const apiError = toApiError(error);
      return { success: false, message: apiError.message };
    } finally {
      setIsLoading(false);
    }
  }, []);

  const resend2FA = useCallback(async () => {
    setIsLoading(true);
    try {
      const pending = readPendingTwoFactor();
      if (!pending) {
        return { success: false, message: 'Session expirée. Veuillez vous reconnecter.' };
      }

      const result = await apiRequest<{ success: boolean; devCodePreview?: string }>('/auth/resend-2fa', {
        method: 'POST',
        body: JSON.stringify({ challengeId: pending.challengeId }),
      }, { retryOnAuth: false });

      const nextPending = {
        ...pending,
        devCodePreview: result.devCodePreview,
      };
      setPendingTwoFactor(nextPending);
      persistPendingTwoFactor(nextPending);
      return { success: true, devCodePreview: result.devCodePreview };
    } catch (error) {
      const apiError = toApiError(error);
      return { success: false, message: apiError.message };
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    setIsLoading(true);
    try {
      await apiRequest('/auth/logout', { method: 'POST' });
    } catch {
      // ignore logout transport errors
    } finally {
      await queryClient.cancelQueries();
      queryClient.clear();
      clearApiSessionCache();
      setUser(null);
      setPendingTwoFactor(null);
      persistPendingTwoFactor(null);
      clearSecuritySensitiveStorage();
      setIsLoading(false);
    }
  }, []);

  const register = useCallback(async (data: RegisterData) => {
    setIsLoading(true);
    try {
      const result = await apiRequest<{ user: AuthUser }>('/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          ...data,
          role: isUserRole(data.role) ? data.role : 'client',
        }),
      }, { retryOnAuth: false });
      setUser(result.user);
      return { success: true, user: result.user };
    } catch (error) {
      const apiError = toApiError(error);
      return { success: false, message: apiError.message };
    } finally {
      setIsLoading(false);
    }
  }, []);

  const updateUser = useCallback((data: Partial<AuthUser>) => {
    setUser((prev) => (prev ? { ...prev, ...data } : prev));
  }, []);

  const value = useMemo<AuthContextType>(() => ({
    user,
    isAuthenticated: !!user,
    isLoading,
    pendingTwoFactor,
    login,
    logout,
    register,
    updateUser,
    verify2FA,
    resend2FA,
    refreshUser,
  }), [isLoading, login, logout, pendingTwoFactor, refreshUser, register, resend2FA, updateUser, user, verify2FA]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export function getDashboardPathForRole(role: string): string {
  return isUserRole(role) ? ROLE_DASHBOARD_PATHS[role] : '/dashboard';
}

export type { AuthUser, UserRole };

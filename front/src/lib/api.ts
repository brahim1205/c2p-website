const API_BASE_URL = (import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '');
const DEFAULT_TIMEOUT_MS = 30000;
const GET_CACHE_TTL_MS = 1500;
let lastRequestId: string | null = null;
let refreshInFlight: Promise<boolean> | null = null;
const responseCache = new Map<string, { expiresAt: number; data: unknown }>();
const inflightGetRequests = new Map<string, Promise<unknown>>();

export interface ApiError {
  message: string;
  status?: number;
  code?: string;
  requestId?: string | null;
}

function readCookie(name: string) {
  if (typeof document === 'undefined') return null;
  const prefix = `${name}=`;
  return document.cookie
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(prefix))
    ?.slice(prefix.length) ?? null;
}

function isUnsafeMethod(method: string) {
  return ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method.toUpperCase());
}

function isAuthRefreshCandidate(path: string) {
  return ![
    '/auth/login',
    '/auth/register',
    '/auth/verify-2fa',
    '/auth/resend-2fa',
    '/auth/refresh',
    '/auth/forgot-password',
    '/auth/reset-password',
  ].includes(path);
}

function dispatchAuthExpired() {
  window.dispatchEvent(new CustomEvent('c2p:auth-expired'));
}

async function refreshSession() {
  if (!refreshInFlight) {
    refreshInFlight = (async () => {
      const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
        },
      });

      if (!response.ok) {
        dispatchAuthExpired();
        return false;
      }

      lastRequestId = response.headers.get('x-request-id');
      return true;
    })().finally(() => {
      refreshInFlight = null;
    });
  }

  return refreshInFlight;
}

async function parseApiError(response: Response): Promise<ApiError> {
  let message = response.status >= 500 ? 'Une erreur est survenue. Veuillez reessayer plus tard.' : 'Requete invalide.';
  let code: string | undefined;

  try {
    const body = await response.json() as { message?: string; code?: string };
    message = body.message ?? message;
    code = body.code;
  } catch {
    // keep safe default
  }

  return {
    message,
    status: response.status,
    code,
    requestId: response.headers.get('x-request-id'),
  };
}

export async function apiRequest<T>(
  path: string,
  init: RequestInit = {},
  options: { retryOnAuth?: boolean; timeoutMs?: number } = {},
): Promise<T> {
  const method = (init.method || 'GET').toUpperCase();
  const isSafeGet = method === 'GET';
  const cacheKey = isSafeGet ? `${method}:${path}` : null;
  const csrfToken = isUnsafeMethod(method) ? readCookie('c2p_csrf') : null;

  if (cacheKey) {
    const cached = responseCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.data as T;
    }

    const inflight = inflightGetRequests.get(cacheKey);
    if (inflight) {
      return inflight as Promise<T>;
    }
  }

  const executeRequest = async () => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? DEFAULT_TIMEOUT_MS);

    try {
      const response = await fetch(`${API_BASE_URL}${path}`, {
        ...init,
        credentials: 'include',
        signal: controller.signal,
        headers: {
          Accept: 'application/json',
          ...(init.body ? { 'Content-Type': 'application/json' } : {}),
          ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {}),
          'X-Requested-With': 'XMLHttpRequest',
          ...(lastRequestId ? { 'X-Request-Id': lastRequestId } : {}),
          ...(init.headers ?? {}),
        },
      });

      lastRequestId = response.headers.get('x-request-id');

      if (response.status === 401 && options.retryOnAuth !== false && isAuthRefreshCandidate(path)) {
        const refreshed = await refreshSession();
        if (refreshed) {
          return apiRequest<T>(path, init, { ...options, retryOnAuth: false });
        }
      }

      if (!response.ok) {
        throw await parseApiError(response);
      }

      if (response.status === 204) {
        if (isUnsafeMethod(method)) {
          responseCache.clear();
        }
        return undefined as T;
      }

      const data = await response.json() as T;
      if (isUnsafeMethod(method)) {
        responseCache.clear();
      }
      return data;
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        throw {
          message: 'La requete a expire. Veuillez reessayer.',
          status: 408,
          code: 'REQUEST_TIMEOUT',
          requestId: lastRequestId,
        } satisfies ApiError;
      }
      if (error instanceof TypeError) {
        throw {
          message: 'Erreur reseau.',
          code: 'NETWORK_ERROR',
          requestId: lastRequestId,
        } satisfies ApiError;
      }
      throw toApiError(error);
    } finally {
      clearTimeout(timeout);
    }
  };

  if (cacheKey) {
    const requestPromise = executeRequest()
      .then((data) => {
        responseCache.set(cacheKey, {
          expiresAt: Date.now() + GET_CACHE_TTL_MS,
          data,
        });
        return data;
      })
      .finally(() => {
        inflightGetRequests.delete(cacheKey);
      });

    inflightGetRequests.set(cacheKey, requestPromise);
    return requestPromise as Promise<T>;
  }

  return executeRequest();
}

export function toApiError(error: unknown): ApiError {
  if (error && typeof error === 'object' && 'message' in error) {
    return error as ApiError;
  }
  return {
    message: 'Erreur reseau.',
    requestId: lastRequestId,
  };
}

export function getLastRequestId() {
  return lastRequestId;
}

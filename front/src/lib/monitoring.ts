import { onCLS, onINP, onLCP, onFCP, onTTFB } from 'web-vitals';
import { getLastRequestId } from './api';

function readCookie(name: string) {
  const prefix = `${name}=`;
  return document.cookie
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(prefix))
    ?.slice(prefix.length) ?? null;
}

function isSameOrigin(url: string) {
  return new URL(url, window.location.origin).origin === window.location.origin;
}

function postJson(path: string, payload: unknown) {
  const url = `${(import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '')}${path}`;
  const body = JSON.stringify(payload);

  if (navigator.sendBeacon && isSameOrigin(url)) {
    const blob = new Blob([body], { type: 'application/json' });
    navigator.sendBeacon(url, blob);
    return;
  }

  void fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Requested-With': 'XMLHttpRequest',
      ...(readCookie('c2p_csrf') ? { 'X-CSRF-Token': readCookie('c2p_csrf') as string } : {}),
    },
    credentials: 'include',
    body,
    keepalive: true,
  }).catch(() => undefined);
}

export function reportFrontendError(payload: {
  type: string;
  message: string;
  route?: string;
  stack?: string;
}) {
  postJson('/monitoring/frontend-errors', {
    ...payload,
    route: payload.route || window.location.pathname,
    requestId: getLastRequestId(),
  });
}

export function initFrontendMonitoring() {
  window.addEventListener('error', (event) => {
    reportFrontendError({
      type: 'window-error',
      message: event.message || 'Unhandled window error',
      stack: event.error?.stack,
    });
  });

  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason instanceof Error ? event.reason.message : String(event.reason ?? 'Unhandled rejection');
    reportFrontendError({
      type: 'unhandled-rejection',
      message: reason,
      stack: event.reason instanceof Error ? event.reason.stack : undefined,
    });
  });

  const sendVital = (name: string, value: number) => {
    postJson('/monitoring/web-vitals', {
      name,
      value,
      route: window.location.pathname,
    });
  };

  onCLS((metric) => sendVital(metric.name, metric.value));
  onFCP((metric) => sendVital(metric.name, metric.value));
  onINP((metric) => sendVital(metric.name, metric.value));
  onLCP((metric) => sendVital(metric.name, metric.value));
  onTTFB((metric) => sendVital(metric.name, metric.value));
}

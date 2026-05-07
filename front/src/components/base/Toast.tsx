import { useEffect } from 'react';

export interface ToastData {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
  duration?: number;
}

interface ToastProps {
  toast: ToastData;
  onRemove: (id: string) => void;
}

const toastConfig = {
  success: {
    icon: 'ri-check-line',
    border: 'border-teal-500',
    bg: 'bg-white',
    iconColor: 'text-teal-500',
    iconBg: 'bg-teal-50',
  },
  error: {
    icon: 'ri-close-line',
    border: 'border-red-500',
    bg: 'bg-white',
    iconColor: 'text-red-500',
    iconBg: 'bg-red-50',
  },
  warning: {
    icon: 'ri-alert-line',
    border: 'border-amber-500',
    bg: 'bg-white',
    iconColor: 'text-amber-500',
    iconBg: 'bg-amber-50',
  },
  info: {
    icon: 'ri-information-line',
    border: 'border-teal-500',
    bg: 'bg-white',
    iconColor: 'text-teal-500',
    iconBg: 'bg-teal-50',
  },
};

export default function Toast({ toast, onRemove }: ToastProps) {
  const config = toastConfig[toast.type];
  const duration = toast.duration ?? 5000;

  useEffect(() => {
    const timer = setTimeout(() => {
      onRemove(toast.id);
    }, duration);
    return () => clearTimeout(timer);
  }, [toast.id, duration, onRemove]);

  return (
    <div
      className={`pointer-events-none flex items-start gap-3 w-full max-w-sm p-4 rounded-lg shadow-lg border-l-4 ${config.border} ${config.bg} animate-in slide-in-from-right-4 fade-in duration-300`}
    >
      <div
        className={`w-8 h-8 flex items-center justify-center rounded-full shrink-0 ${config.iconBg}`}
      >
        <i className={`${config.icon} ${config.iconColor} text-lg`}></i>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-900">{toast.title}</p>
        {toast.message && (
          <p className="text-xs text-gray-500 mt-0.5">{toast.message}</p>
        )}
      </div>
      <button
        onClick={() => onRemove(toast.id)}
        className="pointer-events-auto w-6 h-6 flex items-center justify-center rounded hover:bg-gray-100 shrink-0 text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
      >
        <i className="ri-close-line text-sm"></i>
      </button>
    </div>
  );
}

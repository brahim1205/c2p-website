import { createContext, useState, useCallback, ReactNode } from 'react';
import { ToastData } from './Toast';
import ToastContainer from './ToastContainer';
import { createClientRandomId } from '@/lib/randomId';

interface ToastContextValue {
  addToast: (toast: Omit<ToastData, 'id'>) => void;
}

export const ToastContext = createContext<ToastContextValue | null>(null);

export default function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastData[]>([]);

  const addToast = useCallback((toast: Omit<ToastData, 'id'>) => {
    const id = createClientRandomId('toast');
    setToasts((prev) => [...prev, { ...toast, id }]);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </ToastContext.Provider>
  );
}

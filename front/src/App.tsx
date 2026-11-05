import { Suspense } from 'react';
import { BrowserRouter } from "react-router-dom";
import { QueryClientProvider } from '@tanstack/react-query';
import { AppRoutes } from "./router";
import { AuthProvider } from "@/hooks/useAuth";
import { queryClient } from '@/lib/queryClient';
import ToastProvider from "./components/base/ToastProvider";
import AppErrorBoundary from "./components/base/AppErrorBoundary";

function App() {
  return (
    <AppErrorBoundary>
      <BrowserRouter basename={__BASE_PATH__}>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <ToastProvider>
              <Suspense fallback={
                <div className="min-h-screen flex items-center justify-center bg-c2p-bg">
                  <div className="flex flex-col items-center gap-4">
                    <div className="w-10 h-10 border-4 border-c2p-primary border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-c2p-muted text-sm font-medium">Chargement...</p>
                  </div>
                </div>
              }>
                <AppRoutes />
              </Suspense>
            </ToastProvider>
          </AuthProvider>
        </QueryClientProvider>
      </BrowserRouter>
    </AppErrorBoundary>
  );
}

export default App;

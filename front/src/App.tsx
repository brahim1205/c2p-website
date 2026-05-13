import { Suspense } from 'react';
import { BrowserRouter } from "react-router-dom";
import { AppRoutes } from "./router";
import { I18nextProvider } from "react-i18next";
import i18n from "./i18n";
import { AuthProvider } from "@/hooks/useAuth";
import { useDarkMode } from "./hooks/useDarkMode";
import ToastProvider from "./components/base/ToastProvider";
import AppErrorBoundary from "./components/base/AppErrorBoundary";

function App() {
  useDarkMode();
  return (
    <I18nextProvider i18n={i18n}>
      <AppErrorBoundary>
        <BrowserRouter basename={__BASE_PATH__}>
          <AuthProvider>
            <ToastProvider>
              <Suspense fallback={
                <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
                  <div className="flex flex-col items-center gap-4">
                    <div className="w-10 h-10 border-4 border-[#5fa6f3] border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-gray-600 dark:text-gray-400 text-sm font-medium">Chargement...</p>
                  </div>
                </div>
              }>
                <AppRoutes />
              </Suspense>
            </ToastProvider>
          </AuthProvider>
        </BrowserRouter>
      </AppErrorBoundary>
    </I18nextProvider>
  );
}

export default App;

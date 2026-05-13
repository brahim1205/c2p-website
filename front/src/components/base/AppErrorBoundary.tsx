import { Component, type ErrorInfo, type ReactNode } from 'react';
import { reportFrontendError } from '@/lib/monitoring';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export default class AppErrorBoundary extends Component<Props, State> {
  state: State = {
    hasError: false,
  };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    reportFrontendError({
      type: 'react-boundary',
      message: error.message,
      stack: `${error.stack || ''}\n${info.componentStack || ''}`.trim(),
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-c2p-bg px-6 text-c2p-text">
          <div className="c2p-card max-w-md rounded-[28px] p-8 text-center shadow-c2p-lg">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.32em] text-[#d5b46f]">Incident</p>
            <h1 className="text-2xl font-semibold">Une erreur est survenue</h1>
            <p className="mt-3 text-sm leading-7 text-[#5b6778]">
              L&apos;interface a ete reinitialisee pour proteger votre session. Rechargez la page pour continuer.
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="c2p-btn-accent mt-6 px-6 py-3"
            >
              Recharger
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

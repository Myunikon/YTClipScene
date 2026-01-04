import { Component, ErrorInfo, ReactNode } from 'react';
import { useAppStore } from '../store';
import { translations } from '../lib/locales';

interface Props {
  children?: ReactNode;
  t: any;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundaryClass extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      const { t } = this.props;
      return (
        <div className="p-10 bg-red-50 text-red-900 h-screen w-screen overflow-auto">
            <h1 className="text-2xl font-bold mb-4">{t.title}</h1>
            <pre className="p-4 bg-red-100 rounded text-sm font-mono whitespace-pre-wrap">
                {this.state.error?.toString()}
            </pre>
            <button onClick={() => window.location.reload()} className="mt-4 px-4 py-2 bg-red-600 text-white rounded">
                {t.reload}
            </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export function ErrorBoundary({ children }: { children?: ReactNode }) {
    const { settings } = useAppStore();
    const t = translations[settings.language].error_boundary;

    return <ErrorBoundaryClass t={t}>{children}</ErrorBoundaryClass>;
}

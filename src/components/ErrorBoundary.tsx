import { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center pt-16 px-4">
          <div className="text-center max-w-md">
            <div className="text-8xl mb-6">💥</div>
            <h1 className="font-bebas text-4xl text-text mb-4">Algo correu mal</h1>
            <p className="text-text2 mb-6">
              Ocorreu um erro inesperado. Tenta recarregar a página.
            </p>
            {this.state.error && (
              <div className="bg-bg2 border border-border rounded-xl p-4 mb-6 text-left">
                <code className="text-xs text-red break-all">
                  {this.state.error.message}
                </code>
              </div>
            )}
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => {
                  this.setState({ hasError: false, error: null });
                }}
                className="btn btn-ghost"
              >
                Tentar Novamente
              </button>
              <button
                onClick={() => window.location.reload()}
                className="btn btn-primary"
              >
                Recarregar Página
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
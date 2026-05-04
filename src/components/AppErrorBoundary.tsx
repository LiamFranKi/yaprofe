import { Component, type ErrorInfo, type ReactNode } from 'react';
import YaProFeLogo from './YaProFeLogo';

type Props = { children: ReactNode };

export class AppErrorBoundary extends Component<Props, { error: Error | null }> {
  state: { error: Error | null } = { error: null };

  static getDerivedStateFromError(error: Error): { error: Error } {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('[AppErrorBoundary]', error.message, info.componentStack);
  }

  render(): ReactNode {
    if (this.state.error) {
      return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col items-center justify-center px-4 py-16 text-center">
          <YaProFeLogo height={44} variant="color" />
          <h1 className="mt-8 text-xl font-bold text-gray-900 dark:text-white">
            Algo salió mal en la página
          </h1>
          <p className="mt-3 max-w-md text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
            Puedes recargar o volver al inicio. Si el problema continúa, abre las herramientas de desarrollo
            (F12) y revisa la consola.
          </p>
          {this.state.error.message ? (
            <pre className="mt-6 max-w-lg w-full overflow-x-auto rounded-xl border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/40 p-4 text-left text-xs text-red-800 dark:text-red-200 whitespace-pre-wrap break-words">
              {this.state.error.message}
            </pre>
          ) : null}
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-8 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold"
          >
            Recargar página
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

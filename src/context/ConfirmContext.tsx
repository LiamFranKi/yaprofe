import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { AlertTriangle, Info } from 'lucide-react';
import { useLang } from './LangContext';

export type ConfirmOptions = {
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  /** danger = acción destructiva (rojo); default = confirmación neutra (azul) */
  variant?: 'danger' | 'default';
};

export type ConfirmFn = (options: ConfirmOptions | string) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn | null>(null);

export function useConfirm(): ConfirmFn {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error('useConfirm debe usarse dentro de ConfirmProvider');
  return ctx;
}

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const { lang } = useLang();
  const [state, setState] = useState<null | { options: ConfirmOptions; resolve: (v: boolean) => void }>(
    null
  );

  const confirm = useCallback<ConfirmFn>((options) => {
    const opts: ConfirmOptions = typeof options === 'string' ? { message: options } : options;
    return new Promise((resolve) => {
      setState({ options: opts, resolve });
    });
  }, []);

  const finish = useCallback((value: boolean) => {
    setState((s) => {
      if (s) s.resolve(value);
      return null;
    });
  }, []);

  useEffect(() => {
    if (!state) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') finish(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [state, finish]);

  const opts = state?.options;
  const isDanger = opts?.variant !== 'default';
  const defaultConfirm = lang === 'es' ? 'Confirmar' : 'Confirm';
  const defaultCancel = lang === 'es' ? 'Cancelar' : 'Cancel';

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {state && opts && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4" role="dialog" aria-modal="true">
          <button
            type="button"
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            aria-label={lang === 'es' ? 'Cerrar' : 'Close'}
            onClick={() => finish(false)}
          />
          <div className="relative w-full max-w-md rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-2xl p-6 text-left">
            <div className="flex gap-4">
              <div
                className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
                  isDanger
                    ? 'bg-red-100 dark:bg-red-950'
                    : 'bg-blue-100 dark:bg-blue-950'
                }`}
              >
                {isDanger ? (
                  <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
                ) : (
                  <Info className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                {opts.title && (
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">{opts.title}</h3>
                )}
                <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
                  {opts.message}
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                type="button"
                onClick={() => finish(false)}
                className="px-4 py-2 rounded-xl text-sm font-medium text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              >
                {opts.cancelText ?? defaultCancel}
              </button>
              <button
                type="button"
                onClick={() => finish(true)}
                className={`px-4 py-2 rounded-xl text-sm font-semibold text-white transition-colors ${
                  isDanger ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                {opts.confirmText ?? defaultConfirm}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}

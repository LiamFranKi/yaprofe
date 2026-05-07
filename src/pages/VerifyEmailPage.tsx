import { useEffect, useState } from 'react';
import { ArrowLeft, CheckCircle, Loader2, Mail } from 'lucide-react';
import YaProFeLogo from '../components/YaProFeLogo';
import { useLang } from '../context/LangContext';
import { verifyEmailWithToken } from '../lib/api';
import type { OrderConfirmationNavParams } from './OrderConfirmationPage';

type VerifyEmailPageProps = {
  token?: string;
  onNavigate: (page: string, params?: OrderConfirmationNavParams) => void;
};

export default function VerifyEmailPage({ token, onNavigate }: VerifyEmailPageProps) {
  const { lang } = useLang();
  const [status, setStatus] = useState<'loading' | 'ok' | 'err'>('loading');
  const [message, setMessage] = useState('');

  const valid = Boolean(token && token.length >= 32);

  useEffect(() => {
    if (!valid || !token) {
      setStatus('err');
      setMessage(
        lang === 'es'
          ? 'El enlace no es válido o está incompleto.'
          : 'The link is invalid or incomplete.'
      );
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        await verifyEmailWithToken(token);
        if (!cancelled) {
          setStatus('ok');
          setMessage(
            lang === 'es'
              ? 'Tu correo quedó confirmado. Ya puedes iniciar sesión.'
              : 'Your email is confirmed. You can sign in now.'
          );
        }
      } catch (e) {
        if (!cancelled) {
          setStatus('err');
          setMessage(e instanceof Error ? e.message : lang === 'es' ? 'No se pudo verificar.' : 'Verification failed.');
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token, valid, lang]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col items-center justify-center pt-16 px-4 pb-12">
      <div className="w-full max-w-md">
        <button
          type="button"
          onClick={() => onNavigate('login')}
          className="inline-flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-8"
        >
          <ArrowLeft className="w-4 h-4" />
          {lang === 'es' ? 'Ir a iniciar sesión' : 'Go to sign in'}
        </button>

        <div className="flex justify-center mb-8">
          <YaProFeLogo height={40} variant="color" />
        </div>

        <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-8 text-center shadow-sm">
          {status === 'loading' && (
            <>
              <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
              <p className="text-gray-600 dark:text-gray-300 text-sm">
                {lang === 'es' ? 'Confirmando tu correo…' : 'Confirming your email…'}
              </p>
            </>
          )}
          {status === 'ok' && (
            <>
              <CheckCircle className="w-12 h-12 text-emerald-600 dark:text-emerald-400 mx-auto mb-4" />
              <p className="text-emerald-800 dark:text-emerald-200 font-medium mb-6">{message}</p>
              <button
                type="button"
                onClick={() => onNavigate('login')}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl"
              >
                {lang === 'es' ? 'Iniciar sesión' : 'Sign in'}
              </button>
            </>
          )}
          {status === 'err' && (
            <>
              <Mail className="w-12 h-12 text-amber-600 dark:text-amber-400 mx-auto mb-4" />
              <p className="text-gray-700 dark:text-gray-200 text-sm mb-6">{message}</p>
              <button
                type="button"
                onClick={() => onNavigate('login')}
                className="w-full py-3 bg-gray-900 dark:bg-gray-100 hover:bg-gray-800 dark:hover:bg-white text-white dark:text-gray-900 font-semibold rounded-xl"
              >
                {lang === 'es' ? 'Volver al inicio de sesión' : 'Back to sign in'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

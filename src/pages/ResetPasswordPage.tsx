import { useState } from 'react';
import { Eye, EyeOff, Loader2, ArrowLeft, CheckCircle } from 'lucide-react';
import YaProFeLogo from '../components/YaProFeLogo';
import { useLang } from '../context/LangContext';
import { resetPasswordWithToken } from '../lib/api';
import type { OrderConfirmationNavParams } from './OrderConfirmationPage';

type ResetPasswordPageProps = {
  token?: string;
  onNavigate: (page: string, params?: OrderConfirmationNavParams) => void;
};

export default function ResetPasswordPage({ token, onNavigate }: ResetPasswordPageProps) {
  const { t, lang } = useLang();
  const [password, setPassword] = useState('');
  const [password2, setPassword2] = useState('');
  const [show1, setShow1] = useState(false);
  const [show2, setShow2] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const validToken = Boolean(token && token.length >= 32);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validToken || !token) return;
    setError('');
    if (password !== password2) {
      setError(t('auth.reset.mismatch'));
      return;
    }
    if (password.length < 6) {
      setError(lang === 'es' ? 'Mínimo 6 caracteres' : 'At least 6 characters');
      return;
    }
    setLoading(true);
    try {
      await resetPasswordWithToken(token, password);
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('auth.reset.invalid'));
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col items-center justify-center pt-16 px-4 pb-12">
      <div className="w-full max-w-md">
        <button
          type="button"
          onClick={() => onNavigate('login')}
          className="inline-flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-8"
        >
          <ArrowLeft className="w-4 h-4" />
          {lang === 'es' ? 'Volver a iniciar sesión' : 'Back to sign in'}
        </button>

        <div className="flex justify-center mb-8">
          <YaProFeLogo height={40} variant="color" />
        </div>

        {!validToken ? (
          <div className="rounded-2xl border border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/40 p-6 text-center">
            <p className="text-amber-900 dark:text-amber-100 text-sm">{t('auth.reset.invalid')}</p>
            <button
              type="button"
              onClick={() => onNavigate('login')}
              className="mt-4 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl"
            >
              {lang === 'es' ? 'Ir al inicio de sesión' : 'Go to login'}
            </button>
          </div>
        ) : done ? (
          <div className="rounded-2xl border border-emerald-200 dark:border-emerald-900 bg-emerald-50 dark:bg-emerald-950/40 p-8 text-center">
            <CheckCircle className="w-12 h-12 text-emerald-600 dark:text-emerald-400 mx-auto mb-4" />
            <p className="text-emerald-900 dark:text-emerald-100 font-medium">{t('auth.reset.success')}</p>
            <button
              type="button"
              onClick={() => onNavigate('login')}
              className="mt-6 w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl"
            >
              {lang === 'es' ? 'Iniciar sesión' : 'Sign in'}
            </button>
          </div>
        ) : (
          <>
            <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white mb-2 text-center">
              {t('auth.reset.title')}
            </h1>
            <p className="text-gray-500 dark:text-gray-400 text-sm text-center mb-8">{t('auth.reset.subtitle')}</p>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('auth.reset.password')}
                </label>
                <div className="relative">
                  <input
                    type={show1 ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    autoComplete="new-password"
                    className="w-full px-4 py-3 pr-12 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                    minLength={6}
                  />
                  <button
                    type="button"
                    onClick={() => setShow1(!show1)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    {show1 ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('auth.reset.password2')}
                </label>
                <div className="relative">
                  <input
                    type={show2 ? 'text' : 'password'}
                    value={password2}
                    onChange={e => setPassword2(e.target.value)}
                    autoComplete="new-password"
                    className="w-full px-4 py-3 pr-12 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                    minLength={6}
                  />
                  <button
                    type="button"
                    onClick={() => setShow2(!show2)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    {show2 ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>
              {error && (
                <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-400 text-sm px-4 py-3 rounded-xl">
                  {error}
                </div>
              )}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold rounded-xl flex items-center justify-center gap-2"
              >
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                {t('auth.reset.submit')}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

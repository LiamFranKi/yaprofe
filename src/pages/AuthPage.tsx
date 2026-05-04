import { useState, useEffect } from 'react';
import { Eye, EyeOff, Loader2, ArrowLeft, X, KeyRound } from 'lucide-react';
import YaProFeLogo from '../components/YaProFeLogo';
import { useLang } from '../context/LangContext';
import { useAuth } from '../context/AuthContext';
import { requestPasswordReset } from '../lib/api';
import type { OrderConfirmationNavParams } from './OrderConfirmationPage';

interface AuthPageProps {
  mode: 'login' | 'register';
  onNavigate: (page: string, params?: OrderConfirmationNavParams) => void;
}

function formatAuthErr(err: unknown, lang: string): string {
  const fromError = err instanceof Error && typeof err.message === 'string' ? err.message.trim() : '';
  const fromString = typeof err === 'string' ? err.trim() : '';
  const m = fromError || fromString;
  if (m && m !== 'undefined') return m;
  return lang === 'es'
    ? 'No se pudo completar la acción. Revisa tus datos o tu conexión con el servidor.'
    : 'Could not complete the action. Check your credentials or server connection.';
}

/** Imágenes distintas: login = biblioteca; registro = aprendizaje colaborativo (Pexels). */
const AUTH_HERO = {
  login: {
    src: 'https://images.pexels.com/photos/2041540/pexels-photo-2041540.jpeg?auto=compress&cs=tinysrgb&w=1920',
    overlay: 'from-slate-950/92 via-blue-950/78 to-indigo-900/65',
  },
  register: {
    src: 'https://images.pexels.com/photos/3184292/pexels-photo-3184292.jpeg?auto=compress&cs=tinysrgb&w=1920',
    overlay: 'from-indigo-950/90 via-slate-900/82 to-cyan-950/68',
  },
} as const;

export default function AuthPage({ mode, onNavigate }: AuthPageProps) {
  const { t, lang } = useLang();
  const { signIn, signUp } = useAuth();

  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'buyer' });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotSent, setForgotSent] = useState(false);
  const [forgotError, setForgotError] = useState('');

  const hero = mode === 'login' ? AUTH_HERO.login : AUTH_HERO.register;

  useEffect(() => {
    if (forgotOpen) {
      setForgotSent(false);
      setForgotError('');
      setForgotEmail(form.email);
    }
  }, [forgotOpen, form.email]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (mode === 'login') {
      const { error } = await signIn(form.email, form.password);
      if (error) {
        setError(formatAuthErr(error, lang));
      } else {
        onNavigate('home');
      }
    } else {
      if (!form.name.trim()) {
        setError(lang === 'es' ? 'El nombre es obligatorio' : 'Name is required');
        setLoading(false);
        return;
      }
      const { error } = await signUp(form.email, form.password, form.name, form.role);
      if (error) {
        setError(formatAuthErr(error, lang));
      } else {
        onNavigate(form.role === 'seller' ? 'dashboard' : 'marketplace');
      }
    }

    setLoading(false);
  };

  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const em = forgotEmail.trim().toLowerCase();
    if (!em) {
      setForgotError(lang === 'es' ? 'Introduce tu correo' : 'Enter your email');
      return;
    }
    setForgotLoading(true);
    setForgotError('');
    try {
      await requestPasswordReset(em);
      setForgotSent(true);
    } catch (err) {
      setForgotError(err instanceof Error ? err.message : 'Error');
    }
    setForgotLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex pt-16">
      <div className="hidden lg:flex lg:flex-1 relative min-h-[calc(100vh-4rem)] overflow-hidden">
        <img
          src={hero.src}
          alt=""
          className="absolute inset-0 w-full h-full object-cover scale-105"
        />
        <div
          className={`absolute inset-0 bg-gradient-to-br ${hero.overlay}`}
          aria-hidden
        />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(255,255,255,0.12),_transparent_55%)]" />

        <div className="relative z-10 flex flex-col justify-center px-12 xl:px-16 text-white w-full max-w-xl">
          <button type="button" onClick={() => onNavigate('home')} className="flex items-center mb-12 xl:mb-16">
            <YaProFeLogo height={44} variant="white" />
          </button>
          <h2 className="text-4xl xl:text-5xl font-extrabold mb-6 leading-tight drop-shadow-sm">
            {mode === 'login' ? (
              lang === 'es' ? (
                <>
                  Bienvenido de nuevo
                  <br />
                  a YaProFe
                </>
              ) : (
                <>
                  Welcome back
                  <br />
                  to YaProFe
                </>
              )
            ) : lang === 'es' ? (
              <>
                Únete a la
                <br />
                comunidad docente
              </>
            ) : (
              <>
                Join the
                <br />
                teacher community
              </>
            )}
          </h2>
          <p className="text-blue-50/95 text-lg leading-relaxed max-w-md drop-shadow-sm">
            {mode === 'login'
              ? lang === 'es'
                ? 'Miles de docentes ya comparten y venden sus recursos educativos aquí.'
                : 'Thousands of teachers already share and sell their educational resources here.'
              : lang === 'es'
                ? 'Crea tu portal, sube tus recursos y empieza a generar ingresos compartiendo tu conocimiento.'
                : 'Create your portal, upload your resources and start earning income by sharing your knowledge.'}
          </p>
          <div className="flex flex-wrap items-center gap-8 mt-12 xl:mt-14">
            {[
              { num: '2.4K+', label: lang === 'es' ? 'docentes' : 'teachers' },
              { num: '18K+', label: lang === 'es' ? 'recursos' : 'resources' },
              { num: '45K+', label: lang === 'es' ? 'compradores' : 'buyers' },
            ].map(stat => (
              <div key={stat.label} className="text-center">
                <p className="font-bold text-2xl tracking-tight">{stat.num}</p>
                <p className="text-blue-200/90 text-xs uppercase tracking-wider mt-1">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center px-4 sm:px-8 py-12">
        <div className="w-full max-w-md">
          <button
            type="button"
            onClick={() => onNavigate('home')}
            className="inline-flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-8 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            {t('nav.marketplace') === 'Marketplace' ? 'Back to home' : 'Volver al inicio'}
          </button>

          <div className="lg:hidden flex items-center mb-8">
            <YaProFeLogo height={36} variant="color" />
          </div>

          <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white mb-2">
            {mode === 'login' ? t('auth.login.title') : t('auth.register.title')}
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mb-8">
            {mode === 'login' ? t('auth.login.subtitle') : t('auth.register.subtitle')}
          </p>

          <form onSubmit={handleSubmit} className="space-y-5">
            {mode === 'register' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('auth.register.name')}
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow"
                  placeholder="Ana García"
                  required
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {mode === 'login' ? t('auth.login.email') : t('auth.register.email')}
              </label>
              <input
                type="email"
                value={form.email}
                onChange={e => setForm({ ...form, email: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow"
                placeholder="tu@email.com"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {mode === 'login' ? t('auth.login.password') : t('auth.register.password')}
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={form.password}
                  onChange={e => setForm({ ...form, password: e.target.value })}
                  className="w-full px-4 py-3 pr-12 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow"
                  placeholder="••••••••"
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {mode === 'login' && (
              <div className="rounded-xl border-2 border-blue-200 dark:border-blue-700/80 bg-blue-50/90 dark:bg-blue-950/40 px-4 py-3.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="mt-0.5 rounded-lg bg-blue-600/15 dark:bg-blue-400/15 p-2 flex-shrink-0">
                    <KeyRound className="w-5 h-5 text-blue-600 dark:text-blue-300" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">
                      {lang === 'es' ? '¿No recuerdas tu contraseña?' : "Can't remember your password?"}
                    </p>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
                      {lang === 'es' ? 'Te ayudamos a recuperar el acceso.' : 'We can help you regain access.'}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setForgotOpen(true)}
                  className="w-full sm:w-auto shrink-0 px-4 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold shadow-sm transition-colors"
                >
                  {t('auth.login.forgot')}
                </button>
              </div>
            )}

            {mode === 'register' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  {t('auth.register.role')}
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { value: 'buyer', label: t('auth.register.role.buyer') },
                    { value: 'seller', label: t('auth.register.role.seller') },
                  ].map(opt => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setForm({ ...form, role: opt.value })}
                      className={`py-3 px-4 rounded-xl border-2 text-sm font-medium transition-all ${
                        form.role === opt.value
                          ? 'border-blue-600 bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300'
                          : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-300'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {error && (
              <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-400 text-sm px-4 py-3 rounded-xl">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {mode === 'login' ? t('auth.login.btn') : t('auth.register.btn')}
            </button>
          </form>

          <p className="text-center text-sm text-gray-600 dark:text-gray-400 mt-8">
            {mode === 'login' ? t('auth.login.noAccount') : t('auth.register.hasAccount')}{' '}
            <button
              type="button"
              onClick={() => onNavigate(mode === 'login' ? 'register' : 'login')}
              className="text-blue-600 dark:text-blue-400 font-semibold hover:underline"
            >
              {mode === 'login' ? t('auth.login.register') : t('auth.register.login')}
            </button>
          </p>
        </div>
      </div>

      {forgotOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="forgot-title"
        >
          <div className="relative w-full max-w-md rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-xl p-6">
            <button
              type="button"
              onClick={() => setForgotOpen(false)}
              className="absolute right-3 top-3 p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
              aria-label={lang === 'es' ? 'Cerrar' : 'Close'}
            >
              <X className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-3 mb-4 pr-8">
              <div className="rounded-xl bg-blue-100 dark:bg-blue-950 p-2">
                <KeyRound className="w-6 h-6 text-blue-600 dark:text-blue-300" />
              </div>
              <h2 id="forgot-title" className="text-lg font-bold text-gray-900 dark:text-white">
                {t('auth.forgotModal.title')}
              </h2>
            </div>

            {forgotSent ? (
              <>
                <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed mb-6">
                  {t('auth.forgotModal.sent')}
                </p>
                <button
                  type="button"
                  onClick={() => setForgotOpen(false)}
                  className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold"
                >
                  {t('auth.forgotModal.close')}
                </button>
              </>
            ) : (
              <form onSubmit={handleForgotSubmit}>
                <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
                  {t('auth.forgotModal.hint')}
                </p>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('auth.forgotModal.emailLabel')}
                </label>
                <input
                  type="email"
                  value={forgotEmail}
                  onChange={e => setForgotEmail(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="tu@email.com"
                  autoComplete="email"
                  required
                />
                {forgotError && (
                  <div className="mb-4 text-sm text-red-600 dark:text-red-400">{forgotError}</div>
                )}
                <button
                  type="submit"
                  disabled={forgotLoading}
                  className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-semibold flex items-center justify-center gap-2"
                >
                  {forgotLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                  {t('auth.forgotModal.send')}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

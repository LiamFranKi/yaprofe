import { useState } from 'react';
import { ArrowLeft, Save, Loader2, User, Eye, EyeOff, Lock } from 'lucide-react';
import { useLang } from '../context/LangContext';
import { useAuth } from '../context/AuthContext';
import { updateMyProfile, uploadFile, changePassword } from '../lib/api';
import { FileUpload } from '../components/FileUpload';
import type { NavParams } from '../App';

interface ProfileEditPageProps {
  onNavigate: (page: string, params?: NavParams) => void;
}

export default function ProfileEditPage({ onNavigate }: ProfileEditPageProps) {
  const { lang } = useLang();
  const { user, profile, refreshProfile } = useAuth();

  const [form, setForm] = useState({
    display_name: profile?.display_name || '',
    bio: profile?.bio || '',
    avatar_url: profile?.avatar_url || '',
    banner_url: profile?.banner_url || '',
    seller_handle: profile?.seller_handle || '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [pwd, setPwd] = useState({ current: '', next: '', next2: '' });
  const [pwdSaving, setPwdSaving] = useState(false);
  const [pwdError, setPwdError] = useState('');
  const [pwdSuccess, setPwdSuccess] = useState('');
  const [showPwd, setShowPwd] = useState({ current: false, next: false, next2: false });

  const handleAvatarUpload = async (file: File): Promise<string | null> => {
    if (!user) return null;
    const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    const path = `${user.id}/avatar.${ext}`;
    const { url, error } = await uploadFile('avatars', path, file);
    if (error) return null;
    setForm(prev => ({ ...prev, avatar_url: url }));
    return url;
  };

  const handleBannerUpload = async (file: File): Promise<string | null> => {
    if (!user) return null;
    const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    const path = `${user.id}/banner.${ext}`;
    const { url, error } = await uploadFile('banners', path, file);
    if (error) return null;
    setForm(prev => ({ ...prev, banner_url: url }));
    return url;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    setError('');
    setSuccess('');

    const updateData: Record<string, unknown> = {
      display_name: form.display_name,
      bio: form.bio || null,
      avatar_url: form.avatar_url || null,
      banner_url: form.banner_url || null,
    };

    if (profile?.role === 'seller' && form.seller_handle) {
      updateData.seller_handle = form.seller_handle.toLowerCase().replace(/[^a-z0-9-]/g, '');
    }

    try {
      await updateMyProfile(updateData);
      setSuccess(lang === 'es' ? 'Perfil actualizado' : 'Profile updated');
      await refreshProfile();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error');
    }
    setSaving(false);
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setPwdError('');
    setPwdSuccess('');
    if (pwd.next !== pwd.next2) {
      setPwdError(lang === 'es' ? 'Las contraseñas nuevas no coinciden' : 'New passwords do not match');
      return;
    }
    if (pwd.next.length < 6) {
      setPwdError(lang === 'es' ? 'La nueva contraseña debe tener al menos 6 caracteres' : 'New password must be at least 6 characters');
      return;
    }
    setPwdSaving(true);
    try {
      await changePassword(pwd.current, pwd.next);
      setPwdSuccess(lang === 'es' ? 'Contraseña actualizada correctamente' : 'Password updated successfully');
      setPwd({ current: '', next: '', next2: '' });
    } catch (err) {
      setPwdError(err instanceof Error ? err.message : 'Error');
    }
    setPwdSaving(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 pt-16">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <button
          onClick={() => onNavigate(profile?.role === 'seller' ? 'dashboard' : 'home')}
          className="inline-flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          {lang === 'es' ? 'Volver' : 'Back'}
        </button>

        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 sm:p-8">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-16 h-16 rounded-2xl overflow-hidden bg-gray-100 dark:bg-gray-800 flex-shrink-0">
              {form.avatar_url ? (
                <img src={form.avatar_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <User className="w-8 h-8 text-gray-400" />
                </div>
              )}
            </div>
            <div>
              <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white">
                {lang === 'es' ? 'Editar perfil' : 'Edit profile'}
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {profile?.role === 'seller' ? (lang === 'es' ? 'Vendedor' : 'Seller') : profile?.role === 'admin' ? 'Admin' : (lang === 'es' ? 'Comprador' : 'Buyer')}
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {lang === 'es' ? 'Nombre para mostrar' : 'Display name'} *
              </label>
              <input
                type="text"
                required
                value={form.display_name}
                onChange={e => setForm({ ...form, display_name: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {profile?.role === 'seller' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {lang === 'es' ? 'Handle de vendedor' : 'Seller handle'}
                </label>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-400">@</span>
                  <input
                    type="text"
                    value={form.seller_handle}
                    onChange={e => setForm({ ...form, seller_handle: e.target.value })}
                    placeholder="miprofe"
                    className="flex-1 px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <p className="text-xs text-gray-400 mt-1">{lang === 'es' ? 'Solo letras, numeros y guiones' : 'Letters, numbers and hyphens only'}</p>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {lang === 'es' ? 'Biografia' : 'Bio'}
              </label>
              <textarea
                value={form.bio}
                onChange={e => setForm({ ...form, bio: e.target.value })}
                rows={3}
                maxLength={500}
                placeholder={lang === 'es' ? 'Cuentanos sobre ti...' : 'Tell us about yourself...'}
                className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
            </div>

            <FileUpload
              label={lang === 'es' ? 'Foto de perfil' : 'Profile photo'}
              accept="image/jpeg,image/png,image/webp,image/gif"
              currentUrl={form.avatar_url || null}
              onUpload={handleAvatarUpload}
              onRemove={() => setForm(prev => ({ ...prev, avatar_url: '' }))}
              preview="image"
              previewClass="h-32 w-32 rounded-2xl"
              hint={lang === 'es' ? 'JPG, PNG o WebP. Max 2MB.' : 'JPG, PNG or WebP. Max 2MB.'}
            />

            {profile?.role === 'seller' && (
              <FileUpload
                label={lang === 'es' ? 'Imagen de banner' : 'Banner image'}
                accept="image/jpeg,image/png,image/webp"
                currentUrl={form.banner_url || null}
                onUpload={handleBannerUpload}
                onRemove={() => setForm(prev => ({ ...prev, banner_url: '' }))}
                preview="image"
                previewClass="h-36"
                hint={lang === 'es' ? 'JPG, PNG o WebP. Recomendado 1200x400px. Max 5MB.' : 'JPG, PNG or WebP. Recommended 1200x400px. Max 5MB.'}
              />
            )}

            {error && (
              <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-400 text-sm px-4 py-3 rounded-xl">
                {error}
              </div>
            )}
            {success && (
              <div className="bg-emerald-50 dark:bg-emerald-950 border border-emerald-200 dark:border-emerald-900 text-emerald-700 dark:text-emerald-400 text-sm px-4 py-3 rounded-xl">
                {success}
              </div>
            )}

            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold rounded-xl transition-colors"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {lang === 'es' ? 'Guardar cambios' : 'Save changes'}
            </button>
          </form>

          <div className="mt-10 pt-10 border-t border-gray-200 dark:border-gray-800">
            <div className="flex items-center gap-2 mb-6">
              <Lock className="w-5 h-5 text-gray-500" />
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                {lang === 'es' ? 'Contraseña' : 'Password'}
              </h2>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
              {lang === 'es'
                ? 'Para cambiar la contraseña, escribe la actual y la nueva dos veces.'
                : 'To change your password, enter your current password and the new one twice.'}
            </p>
            <form onSubmit={handlePasswordSubmit} className="space-y-4 max-w-md">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {lang === 'es' ? 'Contraseña actual' : 'Current password'}
                </label>
                <div className="relative">
                  <input
                    type={showPwd.current ? 'text' : 'password'}
                    autoComplete="current-password"
                    value={pwd.current}
                    onChange={e => setPwd({ ...pwd, current: e.target.value })}
                    className="w-full px-4 py-3 pr-12 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPwd(s => ({ ...s, current: !s.current }))}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    aria-label={lang === 'es' ? 'Mostrar u ocultar' : 'Show or hide'}
                  >
                    {showPwd.current ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {lang === 'es' ? 'Nueva contraseña' : 'New password'}
                </label>
                <div className="relative">
                  <input
                    type={showPwd.next ? 'text' : 'password'}
                    autoComplete="new-password"
                    value={pwd.next}
                    onChange={e => setPwd({ ...pwd, next: e.target.value })}
                    minLength={6}
                    className="w-full px-4 py-3 pr-12 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPwd(s => ({ ...s, next: !s.next }))}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    aria-label={lang === 'es' ? 'Mostrar u ocultar' : 'Show or hide'}
                  >
                    {showPwd.next ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {lang === 'es' ? 'Confirmar nueva contraseña' : 'Confirm new password'}
                </label>
                <div className="relative">
                  <input
                    type={showPwd.next2 ? 'text' : 'password'}
                    autoComplete="new-password"
                    value={pwd.next2}
                    onChange={e => setPwd({ ...pwd, next2: e.target.value })}
                    className="w-full px-4 py-3 pr-12 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPwd(s => ({ ...s, next2: !s.next2 }))}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    aria-label={lang === 'es' ? 'Mostrar u ocultar' : 'Show or hide'}
                  >
                    {showPwd.next2 ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>
              {pwdError && (
                <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-400 text-sm px-4 py-3 rounded-xl">
                  {pwdError}
                </div>
              )}
              {pwdSuccess && (
                <div className="bg-emerald-50 dark:bg-emerald-950 border border-emerald-200 dark:border-emerald-900 text-emerald-700 dark:text-emerald-400 text-sm px-4 py-3 rounded-xl">
                  {pwdSuccess}
                </div>
              )}
              <button
                type="submit"
                disabled={pwdSaving || !pwd.current || !pwd.next}
                className="flex items-center gap-2 px-6 py-3 bg-gray-900 dark:bg-gray-100 hover:bg-gray-800 dark:hover:bg-white disabled:opacity-50 text-white dark:text-gray-900 font-semibold rounded-xl transition-colors"
              >
                {pwdSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
                {lang === 'es' ? 'Actualizar contraseña' : 'Update password'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

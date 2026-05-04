import { useState } from 'react';
import { Sun, Moon, Globe, Menu, X, ChevronDown, LayoutDashboard, User, LogOut, ShoppingBag, ShoppingCart, Settings, Shield } from 'lucide-react';
import YaProFeLogo from './YaProFeLogo';
import { useTheme } from '../context/ThemeContext';
import { useLang } from '../context/LangContext';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import type { NavParams } from '../App';

interface NavbarProps {
  currentPage: string;
  onNavigate: (page: string, params?: NavParams) => void;
}

export default function Navbar({ currentPage, onNavigate }: NavbarProps) {
  const { theme, toggleTheme } = useTheme();
  const { lang, setLang, t } = useLang();
  const { user, profile, signOut } = useAuth();
  const { count: cartCount } = useCart();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const handleNav = (page: string, params?: NavParams) => {
    onNavigate(page, params);
    setMobileOpen(false);
    setUserMenuOpen(false);
  };

  const handleSignOut = async () => {
    await signOut();
    handleNav('home');
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 dark:bg-gray-950/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <button
            type="button"
            onClick={() => handleNav('home')}
            className="flex items-center shrink-0 md:ml-4 lg:ml-6"
          >
            <YaProFeLogo height={48} variant="color" />
          </button>

          <div className="hidden md:flex items-center gap-1">
            <button
              onClick={() => handleNav('marketplace')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                currentPage === 'marketplace'
                  ? 'bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
            >
              {t('nav.marketplace')}
            </button>
            <button
              onClick={() => handleNav('how-it-works')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                currentPage === 'how-it-works'
                  ? 'bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
            >
              {t('nav.howItWorks')}
            </button>
          </div>

          <div className="hidden md:flex items-center gap-3">
            <button
              onClick={() => setLang(lang === 'es' ? 'en' : 'es')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              <Globe className="w-4 h-4" />
              <span>{lang === 'es' ? 'ES' : 'EN'}</span>
            </button>

            <button
              onClick={toggleTheme}
              className="w-9 h-9 flex items-center justify-center rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
            </button>

            <button
              type="button"
              onClick={() => handleNav('cart')}
              className={`relative w-9 h-9 flex items-center justify-center rounded-lg transition-colors ${
                currentPage === 'cart'
                  ? 'bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
              title={lang === 'es' ? 'Carrito' : 'Cart'}
            >
              <ShoppingCart className="w-5 h-5" />
              {cartCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[1.125rem] h-[1.125rem] px-1 flex items-center justify-center rounded-full bg-blue-600 text-white text-[10px] font-bold">
                  {cartCount > 9 ? '9+' : cartCount}
                </span>
              )}
            </button>

            {user ? (
              <div className="relative">
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 transition-colors"
                >
                  {profile?.avatar_url ? (
                    <img src={profile.avatar_url} alt="" className="w-7 h-7 rounded-full object-cover" />
                  ) : (
                    <div className="w-7 h-7 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-blue-700 dark:text-blue-300 text-xs font-bold">
                      {profile?.display_name?.[0]?.toUpperCase() || 'U'}
                    </div>
                  )}
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300 max-w-[100px] truncate">
                    {profile?.display_name || 'User'}
                  </span>
                  <ChevronDown className="w-3 h-3 text-gray-500" />
                </button>
                {userMenuOpen && (
                  <div className="absolute right-0 top-full mt-2 w-52 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl overflow-hidden">
                    <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800">
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {profile?.role === 'seller' ? (lang === 'es' ? 'Vendedor' : 'Seller') : profile?.role === 'admin' ? 'Admin' : (lang === 'es' ? 'Comprador' : 'Buyer')}
                      </p>
                      <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 truncate">{profile?.display_name}</p>
                    </div>
                    <div className="py-1">
                      {profile?.role === 'admin' && (
                        <button
                          onClick={() => handleNav('admin')}
                          className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950 transition-colors"
                        >
                          <Shield className="w-4 h-4" />
                          {lang === 'es' ? 'Panel admin' : 'Admin panel'}
                        </button>
                      )}
                      {profile?.role === 'seller' && (
                        <button
                          onClick={() => handleNav('dashboard')}
                          className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                        >
                          <LayoutDashboard className="w-4 h-4" />
                          {t('nav.dashboard')}
                        </button>
                      )}
                      {profile?.role === 'buyer' && (
                        <button
                          onClick={() => handleNav('buyer-dashboard')}
                          className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                        >
                          <ShoppingBag className="w-4 h-4" />
                          {lang === 'es' ? 'Mis compras' : 'My purchases'}
                        </button>
                      )}
                      <button
                        onClick={() => handleNav('profile-edit')}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                      >
                        <Settings className="w-4 h-4" />
                        {lang === 'es' ? 'Editar perfil' : 'Edit profile'}
                      </button>
                      {(profile?.role === 'seller' || profile?.role === 'admin') && (
                        <button
                          onClick={() => handleNav('seller-profile', { sellerId: user.id })}
                          className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                        >
                          <User className="w-4 h-4" />
                          {lang === 'es' ? 'Mi portal' : 'My portal'}
                        </button>
                      )}
                      <button
                        onClick={handleSignOut}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950 transition-colors"
                      >
                        <LogOut className="w-4 h-4" />
                        {t('nav.logout')}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleNav('login')}
                  className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
                >
                  {t('nav.login')}
                </button>
                <button
                  onClick={() => handleNav('register')}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
                >
                  {t('nav.register')}
                </button>
              </div>
            )}
          </div>

          <div className="md:hidden flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleNav('cart')}
              className="relative w-9 h-9 flex items-center justify-center rounded-lg text-gray-600 dark:text-gray-400"
            >
              <ShoppingCart className="w-5 h-5" />
              {cartCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[1.125rem] h-[1.125rem] px-1 flex items-center justify-center rounded-full bg-blue-600 text-white text-[10px] font-bold">
                  {cartCount > 9 ? '9+' : cartCount}
                </span>
              )}
            </button>
            <button
              onClick={toggleTheme}
              className="w-9 h-9 flex items-center justify-center rounded-lg text-gray-600 dark:text-gray-400"
            >
              {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
            </button>
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="w-9 h-9 flex items-center justify-center rounded-lg text-gray-600 dark:text-gray-400"
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {mobileOpen && (
        <div className="md:hidden border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 px-4 py-4 space-y-1">
          <button onClick={() => handleNav('marketplace')} className="w-full text-left px-4 py-3 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800">
            {t('nav.marketplace')}
          </button>
          <button onClick={() => handleNav('how-it-works')} className="w-full text-left px-4 py-3 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800">
            {t('nav.howItWorks')}
          </button>
          <div className="pt-2 border-t border-gray-100 dark:border-gray-800 flex items-center gap-3">
            <button onClick={() => setLang(lang === 'es' ? 'en' : 'es')} className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700">
              <Globe className="w-4 h-4" />
              {lang === 'es' ? 'ES / EN' : 'EN / ES'}
            </button>
          </div>
          {user ? (
            <>
              {profile?.role === 'admin' && (
                <button onClick={() => handleNav('admin')} className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950">
                  <Shield className="w-4 h-4" />
                  {lang === 'es' ? 'Panel admin' : 'Admin panel'}
                </button>
              )}
              {profile?.role === 'seller' && (
                <button onClick={() => handleNav('dashboard')} className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800">
                  <LayoutDashboard className="w-4 h-4" />
                  {t('nav.dashboard')}
                </button>
              )}
              {profile?.role === 'buyer' && (
                <button onClick={() => handleNav('buyer-dashboard')} className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800">
                  <ShoppingBag className="w-4 h-4" />
                  {lang === 'es' ? 'Mis compras' : 'My purchases'}
                </button>
              )}
              <button onClick={() => handleNav('profile-edit')} className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800">
                <Settings className="w-4 h-4" />
                {lang === 'es' ? 'Editar perfil' : 'Edit profile'}
              </button>
              <button onClick={handleSignOut} className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-950">
                <LogOut className="w-4 h-4" />
                {t('nav.logout')}
              </button>
            </>
          ) : (
            <div className="pt-2 space-y-2">
              <button onClick={() => handleNav('login')} className="w-full px-4 py-3 rounded-lg text-sm font-medium text-center text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700">
                {t('nav.login')}
              </button>
              <button onClick={() => handleNav('register')} className="w-full px-4 py-3 bg-blue-600 rounded-lg text-sm font-medium text-white text-center">
                {t('nav.register')}
              </button>
            </div>
          )}
        </div>
      )}
    </nav>
  );
}

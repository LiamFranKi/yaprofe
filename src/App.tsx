import { useState, useCallback, useEffect } from 'react';
import { ThemeProvider } from './context/ThemeContext';
import { LangProvider } from './context/LangContext';
import { AuthProvider } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import { ConfirmProvider } from './context/ConfirmContext';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import LandingPage from './pages/LandingPage';
import MarketplacePage from './pages/MarketplacePage';
import AuthPage from './pages/AuthPage';
import SellerProfilePage from './pages/SellerProfilePage';
import DashboardPage from './pages/DashboardPage';
import HowItWorksPage from './pages/HowItWorksPage';
import BuyerDashboardPage from './pages/BuyerDashboardPage';
import ProfileEditPage from './pages/ProfileEditPage';
import ProductFormPage from './pages/ProductFormPage';
import AdminPage from './pages/AdminPage';
import ProductDetailPage from './pages/ProductDetailPage';
import CartPage from './pages/CartPage';
import OrderConfirmationPage from './pages/OrderConfirmationPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import type { OrderConfirmationNavParams } from './pages/OrderConfirmationPage';
import { AppErrorBoundary } from './components/AppErrorBoundary';

export type Page =
  | 'home'
  | 'marketplace'
  | 'how-it-works'
  | 'login'
  | 'register'
  | 'reset-password'
  | 'seller-profile'
  | 'product-detail'
  | 'dashboard'
  | 'buyer-dashboard'
  | 'profile-edit'
  | 'product-form'
  | 'admin'
  | 'cart'
  | 'order-confirmation';

export type NavParams = OrderConfirmationNavParams;

const PAGES_WITHOUT_FOOTER: Page[] = [
  'login',
  'register',
  'reset-password',
  'dashboard',
  'buyer-dashboard',
  'profile-edit',
  'product-form',
  'product-detail',
  'admin',
  'cart',
  'order-confirmation',
];

function AppContent() {
  const [currentPage, setCurrentPage] = useState<Page>('home');
  const [navParams, setNavParams] = useState<NavParams>({});

  /** Enlaces: `/?reset_token=…`, `/?order=…`, `/?seller=<uuid>`, `/?product=<id>`. */
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const resetTok = params.get('reset_token');
    if (resetTok && resetTok.length >= 32) {
      setCurrentPage('reset-password');
      setNavParams({ resetToken: resetTok });
      return;
    }
    const orderRaw = params.get('order');
    if (orderRaw) {
      const oid = Number(orderRaw);
      if (Number.isFinite(oid)) {
        const st = params.get('order_status') || 'pending';
        const tcRaw = params.get('total_cents');
        const tc = tcRaw != null && tcRaw !== '' ? Number(tcRaw) : undefined;
        const productsRaw = params.get('products');
        const confirmProductIds = productsRaw
          ? productsRaw
              .split(',')
              .map(s => Number(s.trim()))
              .filter(n => Number.isFinite(n) && n > 0)
          : undefined;
        setCurrentPage('order-confirmation');
        setNavParams({
          orderId: oid,
          orderStatus: st,
          orderTotalCents: tc !== undefined && Number.isFinite(tc) ? tc : undefined,
          confirmProductIds,
        });
        return;
      }
    }
    const sid = params.get('seller');
    const pid = params.get('product');
    const adminPreview = params.get('admin_preview') === '1';
    if (pid) {
      const n = Number(pid);
      if (Number.isFinite(n)) {
        setCurrentPage('product-detail');
        setNavParams({ productId: n, adminPreview });
        return;
      }
    }
    if (sid) {
      setCurrentPage('seller-profile');
      setNavParams({ sellerId: sid });
    }
  }, []);

  const navigate = useCallback((page: string, params?: NavParams) => {
    setCurrentPage(page as Page);
    setNavParams(params || {});
    window.scrollTo({ top: 0, behavior: 'smooth' });

    const url = new URL(window.location.href);
    if (page === 'order-confirmation' && params?.orderId != null) {
      url.search = '';
      url.searchParams.set('order', String(params.orderId));
      url.searchParams.set('order_status', params.orderStatus || 'pending');
      if (params.orderTotalCents != null) url.searchParams.set('total_cents', String(params.orderTotalCents));
      if (params.confirmProductIds?.length) url.searchParams.set('products', params.confirmProductIds.join(','));
      window.history.replaceState({}, '', `${url.pathname}?${url.searchParams.toString()}`);
      return;
    }
    if (page === 'reset-password' && params?.resetToken) {
      url.search = '';
      url.searchParams.set('reset_token', params.resetToken);
      window.history.replaceState({}, '', `${url.pathname}?${url.searchParams.toString()}`);
      return;
    }
    url.searchParams.delete('reset_token');
    url.searchParams.delete('order');
    url.searchParams.delete('order_status');
    url.searchParams.delete('total_cents');
    url.searchParams.delete('products');
    if (page !== 'seller-profile') url.searchParams.delete('seller');
    if (page !== 'product-detail') {
      url.searchParams.delete('product');
      url.searchParams.delete('admin_preview');
    }
    const q = url.searchParams.toString();
    window.history.replaceState({}, '', url.pathname + (q ? `?${q}` : ''));
  }, []);

  const showFooter = !PAGES_WITHOUT_FOOTER.includes(currentPage);

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 text-gray-900 dark:text-white">
      <Navbar currentPage={currentPage} onNavigate={navigate} />

      <div className="flex flex-col min-h-screen">
        <main className="flex-1">
          {currentPage === 'home' && <LandingPage onNavigate={navigate} />}
          {currentPage === 'marketplace' && <MarketplacePage onNavigate={navigate} />}
          {currentPage === 'how-it-works' && <HowItWorksPage onNavigate={navigate} />}
          {currentPage === 'login' && <AuthPage mode="login" onNavigate={navigate} />}
          {currentPage === 'register' && <AuthPage mode="register" onNavigate={navigate} />}
          {currentPage === 'reset-password' && (
            <ResetPasswordPage token={navParams.resetToken} onNavigate={navigate} />
          )}
          {currentPage === 'seller-profile' && (
            <SellerProfilePage sellerId={navParams.sellerId} onNavigate={navigate} />
          )}
          {currentPage === 'product-detail' && (
            <ProductDetailPage
              productId={navParams.productId}
              adminPreview={navParams.adminPreview}
              onNavigate={navigate}
            />
          )}
          {currentPage === 'dashboard' && <DashboardPage onNavigate={navigate} />}
          {currentPage === 'buyer-dashboard' && <BuyerDashboardPage onNavigate={navigate} />}
          {currentPage === 'profile-edit' && <ProfileEditPage onNavigate={navigate} />}
          {currentPage === 'product-form' && <ProductFormPage onNavigate={navigate} productId={navParams.productId} />}
          {currentPage === 'admin' && <AdminPage />}
          {currentPage === 'cart' && <CartPage onNavigate={navigate} />}
          {currentPage === 'order-confirmation' && (
            <OrderConfirmationPage
              orderId={navParams.orderId}
              orderStatus={navParams.orderStatus}
              orderTotalCents={navParams.orderTotalCents}
              confirmProductIds={navParams.confirmProductIds}
              onNavigate={navigate}
            />
          )}
        </main>

        {showFooter && <Footer onNavigate={navigate} />}
      </div>
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <LangProvider>
        <ConfirmProvider>
          <AuthProvider>
            <CartProvider>
              <AppErrorBoundary>
                <AppContent />
              </AppErrorBoundary>
            </CartProvider>
          </AuthProvider>
        </ConfirmProvider>
      </LangProvider>
    </ThemeProvider>
  );
}

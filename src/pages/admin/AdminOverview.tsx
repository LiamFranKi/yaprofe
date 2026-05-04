import { useState, useEffect } from 'react';
import { Users, Package, ShoppingBag, DollarSign, Clock, AlertTriangle, Loader2, Percent, Save, Share2 } from 'lucide-react';
import {
  fetchAdminDashboardStats,
  fetchAdminCommissionSummary,
  fetchAdminPlatformSettings,
  patchAdminPlatformSettings,
} from '../../lib/api';

interface Stats {
  totalUsers: number;
  sellers: number;
  buyers: number;
  totalProducts: number;
  publishedProducts: number;
  pendingReview: number;
  rejectedProducts: number;
  totalOrders: number;
  totalRevenue: number;
  totalReviews: number;
}

export default function AdminOverview({ lang, onSwitchTab }: { lang: string; onSwitchTab: (tab: string) => void }) {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [platformCommissionCents, setPlatformCommissionCents] = useState(0);
  const [sellersRevenueCents, setSellersRevenueCents] = useState(0);
  const [defaultCommissionPct, setDefaultCommissionPct] = useState(15);
  const [commissionInput, setCommissionInput] = useState('15');
  const [savingCommission, setSavingCommission] = useState(false);
  const [socialTwitter, setSocialTwitter] = useState('');
  const [socialInstagram, setSocialInstagram] = useState('');
  const [socialFacebook, setSocialFacebook] = useState('');
  const [socialYoutube, setSocialYoutube] = useState('');
  const [savingSocial, setSavingSocial] = useState(false);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const { profiles, products, orders, totalReviews } = await fetchAdminDashboardStats();
        const [comm, plat] = await Promise.all([
          fetchAdminCommissionSummary().catch(() => null),
          fetchAdminPlatformSettings().catch(() => null),
        ]);

        setStats({
          totalUsers: profiles.length,
          sellers: profiles.filter(p => p.role === 'seller').length,
          buyers: profiles.filter(p => p.role === 'buyer').length,
          totalProducts: products.length,
          publishedProducts: products.filter(p => p.status === 'published').length,
          pendingReview: products.filter(p => p.status === 'pending_review').length,
          rejectedProducts: products.filter(p => p.status === 'rejected').length,
          totalOrders: orders.filter(o => o.status === 'paid').length,
          totalRevenue: orders.filter(o => o.status === 'paid').reduce((s, o) => s + o.total_cents, 0),
          totalReviews,
        });
        if (comm) {
          setPlatformCommissionCents(comm.platform_commission_cents);
          setSellersRevenueCents(comm.sellers_revenue_cents);
        }
        if (plat) {
          setDefaultCommissionPct(plat.default_commission_percent);
          setCommissionInput(String(plat.default_commission_percent));
          setSocialTwitter(plat.social_twitter || '');
          setSocialInstagram(plat.social_instagram || '');
          setSocialFacebook(plat.social_facebook || '');
          setSocialYoutube(plat.social_youtube || '');
        }
      } catch {
        setStats({
          totalUsers: 0,
          sellers: 0,
          buyers: 0,
          totalProducts: 0,
          publishedProducts: 0,
          pendingReview: 0,
          rejectedProducts: 0,
          totalOrders: 0,
          totalRevenue: 0,
          totalReviews: 0,
        });
      }
      setLoading(false);
    };
    fetchStats();
  }, []);

  const saveGlobalCommission = async () => {
    const n = Number(commissionInput.replace(',', '.'));
    if (!Number.isFinite(n) || n < 0 || n > 100) return;
    setSavingCommission(true);
    try {
      const r = await patchAdminPlatformSettings({ default_commission_percent: n });
      setDefaultCommissionPct(r.default_commission_percent);
    } catch {
      /* ignore */
    }
    setSavingCommission(false);
  };

  const saveSocialLinks = async () => {
    setSavingSocial(true);
    try {
      const r = await patchAdminPlatformSettings({
        social_twitter: socialTwitter,
        social_instagram: socialInstagram,
        social_facebook: socialFacebook,
        social_youtube: socialYoutube,
      });
      setSocialTwitter(r.social_twitter);
      setSocialInstagram(r.social_instagram);
      setSocialFacebook(r.social_facebook);
      setSocialYoutube(r.social_youtube);
    } catch {
      /* ignore */
    }
    setSavingSocial(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!stats) return null;

  const cards = [
    {
      icon: <Percent className="w-5 h-5" />,
      color: 'text-violet-600 dark:text-violet-400 bg-violet-100 dark:bg-violet-900',
      label: lang === 'es' ? 'Comisión YaProFe (acum.)' : 'YaProFe commission (acc.)',
      value: `S/ ${(platformCommissionCents / 100).toFixed(2)}`,
      sub:
        lang === 'es'
          ? `S/ ${(sellersRevenueCents / 100).toFixed(2)} para vendedores (registrado)`
          : `S/ ${(sellersRevenueCents / 100).toFixed(2)} to sellers (recorded)`,
    },
    {
      icon: <Users className="w-5 h-5" />,
      color: 'text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900',
      label: lang === 'es' ? 'Total usuarios' : 'Total users',
      value: stats.totalUsers,
      sub: `${stats.sellers} ${lang === 'es' ? 'vendedores' : 'sellers'} / ${stats.buyers} ${lang === 'es' ? 'compradores' : 'buyers'}`,
    },
    {
      icon: <Package className="w-5 h-5" />,
      color: 'text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900',
      label: lang === 'es' ? 'Productos' : 'Products',
      value: stats.totalProducts,
      sub: `${stats.publishedProducts} ${lang === 'es' ? 'publicados' : 'published'}`,
    },
    {
      icon: <Clock className="w-5 h-5" />,
      color: 'text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-900',
      label: lang === 'es' ? 'Pendientes de revision' : 'Pending review',
      value: stats.pendingReview,
      sub: lang === 'es' ? 'Requieren aprobacion' : 'Need approval',
    },
    {
      icon: <ShoppingBag className="w-5 h-5" />,
      color: 'text-teal-600 dark:text-teal-400 bg-teal-100 dark:bg-teal-900',
      label: lang === 'es' ? 'Ordenes pagadas' : 'Paid orders',
      value: stats.totalOrders,
    },
    {
      icon: <DollarSign className="w-5 h-5" />,
      color: 'text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900',
      label: lang === 'es' ? 'Ingresos totales' : 'Total revenue',
      value: `S/ ${(stats.totalRevenue / 100).toFixed(2)}`,
    },
  ];

  return (
    <div className="space-y-8">
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-5 space-y-3">
        <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <Percent className="w-4 h-4" />
          {lang === 'es' ? 'Comisión general de la plataforma' : 'Platform default commission'}
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {lang === 'es'
            ? 'Porcentaje que retiene YaProFe por venta cuando el vendedor no tiene comisión personal. Puedes dejar comisión personal vacía en cada usuario para que use este valor.'
            : 'Percentage YaProFe keeps per sale when the seller has no custom rate. Leave seller commission empty to use this value.'}
        </p>
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-xs text-gray-500">{lang === 'es' ? 'Porcentaje (0–100)' : 'Percent (0–100)'}</span>
            <input
              type="text"
              inputMode="decimal"
              value={commissionInput}
              onChange={e => setCommissionInput(e.target.value)}
              className="w-28 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800"
            />
          </label>
          <button
            type="button"
            onClick={saveGlobalCommission}
            disabled={savingCommission}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold disabled:opacity-50"
          >
            {savingCommission ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {lang === 'es' ? 'Guardar' : 'Save'}
          </button>
          <span className="text-xs text-gray-400 pb-2">
            {lang === 'es' ? 'Actual:' : 'Current:'} {defaultCommissionPct}%
          </span>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-5 space-y-4">
        <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <Share2 className="w-4 h-4" />
          {lang === 'es' ? 'Redes sociales (pie de página)' : 'Social links (footer)'}
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {lang === 'es'
            ? 'Pega la URL completa de cada perfil (https://...). Deja vacío para ocultar ese icono en el sitio.'
            : 'Paste each profile URL (https://...). Leave empty to hide that icon.'}
        </p>
        <div className="grid sm:grid-cols-2 gap-3 text-sm">
          <label className="flex flex-col gap-1">
            <span className="text-xs text-gray-500">X / Twitter</span>
            <input
              type="url"
              value={socialTwitter}
              onChange={e => setSocialTwitter(e.target.value)}
              placeholder="https://x.com/..."
              className="px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs text-gray-500">Instagram</span>
            <input
              type="url"
              value={socialInstagram}
              onChange={e => setSocialInstagram(e.target.value)}
              placeholder="https://instagram.com/..."
              className="px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs text-gray-500">Facebook</span>
            <input
              type="url"
              value={socialFacebook}
              onChange={e => setSocialFacebook(e.target.value)}
              placeholder="https://facebook.com/..."
              className="px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs text-gray-500">YouTube</span>
            <input
              type="url"
              value={socialYoutube}
              onChange={e => setSocialYoutube(e.target.value)}
              placeholder="https://youtube.com/@..."
              className="px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800"
            />
          </label>
        </div>
        <button
          type="button"
          onClick={saveSocialLinks}
          disabled={savingSocial}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-700 hover:bg-slate-800 text-white text-sm font-semibold disabled:opacity-50"
        >
          {savingSocial ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {lang === 'es' ? 'Guardar redes' : 'Save social links'}
        </button>
      </div>

      <div className="rounded-2xl border border-dashed border-gray-200 dark:border-gray-700 p-4 text-sm text-gray-600 dark:text-gray-400">
        <p className="font-medium text-gray-800 dark:text-gray-200 mb-1">
          {lang === 'es' ? 'Pagos y reparto' : 'Payments and split'}
        </p>
        <p>
          {lang === 'es'
            ? 'El cobro al comprador es manual o por la pasarela que configures. El sistema registra en cada pedido pagado cuánto corresponde a comisión de la plataforma y cuánto al vendedor; no transfiere dinero automáticamente entre cuentas.'
            : 'Buyer payment is manual or via your payment provider. The system records platform fee and seller share on each paid order; it does not move money between bank accounts automatically.'}
        </p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-5">
        {cards.map(card => (
          <div key={card.label} className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-5">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${card.color}`}>{card.icon}</div>
            <p className="text-2xl font-extrabold text-gray-900 dark:text-white">{card.value}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{card.label}</p>
            {card.sub && <p className="text-xs text-gray-400 mt-1">{card.sub}</p>}
          </div>
        ))}
      </div>

      {stats.pendingReview > 0 && (
        <div className="bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-900 rounded-2xl p-5 flex items-center gap-4">
          <AlertTriangle className="w-6 h-6 text-amber-600 dark:text-amber-400 flex-shrink-0" />
          <div className="flex-1">
            <p className="font-semibold text-amber-800 dark:text-amber-200">
              {lang === 'es'
                ? `Tienes ${stats.pendingReview} producto(s) esperando revision`
                : `You have ${stats.pendingReview} product(s) awaiting review`}
            </p>
            <p className="text-sm text-amber-600 dark:text-amber-400 mt-0.5">
              {lang === 'es'
                ? 'Los vendedores esperan tu aprobacion para publicar.'
                : 'Sellers are waiting for your approval to publish.'}
            </p>
          </div>
          <button
            onClick={() => onSwitchTab('products')}
            className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-sm font-semibold rounded-xl transition-colors flex-shrink-0"
          >
            {lang === 'es' ? 'Revisar' : 'Review'}
          </button>
        </div>
      )}
    </div>
  );
}

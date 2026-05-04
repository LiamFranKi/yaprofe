import { useState, useEffect } from 'react';
import { Package, ShoppingBag, DollarSign, Plus, Eye, Pencil, Trash2, CheckCircle, Clock, XCircle, BarChart2, Loader2, Users, Star } from 'lucide-react';
import { useLang } from '../context/LangContext';
import { useAuth } from '../context/AuthContext';
import {
  deleteSellerProduct,
  fetchSellerProducts,
  fetchSellerSales,
  fetchSellerFollowers,
  fetchSellerReviews,
  deleteSellerReview,
  type Product,
  type SellerReviewRow,
} from '../lib/api';
import type { NavParams } from '../App';
import DateField from '../components/DateField';
import { useConfirm } from '../context/ConfirmContext';

interface DashboardPageProps {
  onNavigate: (page: string, params?: NavParams) => void;
}

type Tab = 'overview' | 'products' | 'sales' | 'reviews';

interface OrderItem {
  id: number;
  unit_price_cents: number;
  commission_cents: number;
  seller_revenue_cents: number;
  created_at: string;
  orders: { buyer_id: string; status: string; created_at: string } | null;
  products: { title: string } | null;
  buyer_profile?: { display_name: string } | null;
}

const statusConfig: Record<string, { label: string; labelEn: string; icon: React.ReactNode; color: string }> = {
  published: { label: 'Publicado', labelEn: 'Published', icon: <CheckCircle className="w-3.5 h-3.5" />, color: 'text-emerald-700 bg-emerald-100 dark:text-emerald-300 dark:bg-emerald-900' },
  pending_review: { label: 'En revision', labelEn: 'Under review', icon: <Clock className="w-3.5 h-3.5" />, color: 'text-amber-700 bg-amber-100 dark:text-amber-300 dark:bg-amber-900' },
  draft: { label: 'Borrador', labelEn: 'Draft', icon: <Pencil className="w-3.5 h-3.5" />, color: 'text-gray-600 bg-gray-100 dark:text-gray-300 dark:bg-gray-800' },
  rejected: { label: 'Rechazado', labelEn: 'Rejected', icon: <XCircle className="w-3.5 h-3.5" />, color: 'text-red-700 bg-red-100 dark:text-red-300 dark:bg-red-900' },
};

export default function DashboardPage({ onNavigate }: DashboardPageProps) {
  const { t, lang } = useLang();
  const { user, profile } = useAuth();
  const confirm = useConfirm();
  const [tab, setTab] = useState<Tab>('overview');
  const [products, setProducts] = useState<Product[]>([]);
  /** Ventas de toda la vida (resumen / ventas recientes). */
  const [salesOverview, setSalesOverview] = useState<OrderItem[]>([]);
  /** Ventas con filtro por fecha (pestaña Ventas). */
  const [salesFiltered, setSalesFiltered] = useState<OrderItem[]>([]);
  const [salesDateFrom, setSalesDateFrom] = useState('');
  const [salesDateTo, setSalesDateTo] = useState('');
  const [followersCount, setFollowersCount] = useState(0);
  const [followers, setFollowers] = useState<
    Array<{ follower_id: string; display_name: string; avatar_url: string | null; followed_at: string }>
  >([]);
  const [loading, setLoading] = useState(true);
  const [sellerReviews, setSellerReviews] = useState<SellerReviewRow[]>([]);
  const [sellerReviewsLoading, setSellerReviewsLoading] = useState(false);

  useEffect(() => {
    if (!user) return;
    const fetchData = async () => {
      setLoading(true);
      try {
        const prodData = await fetchSellerProducts();
        setProducts(prodData);
      } catch {
        setProducts([]);
      }
      if (profile?.role === 'seller' || profile?.role === 'admin') {
        try {
          const f = await fetchSellerFollowers();
          setFollowersCount(f.count);
          setFollowers(f.followers);
        } catch {
          setFollowersCount(0);
          setFollowers([]);
        }
      } else {
        setFollowersCount(0);
        setFollowers([]);
      }
      setLoading(false);
    };
    fetchData();
  }, [user, profile?.role]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      try {
        const data = (await fetchSellerSales({
          date_from: salesDateFrom || undefined,
          date_to: salesDateTo || undefined,
        })) as OrderItem[];
        if (cancelled) return;
        setSalesFiltered(data);
        if (!salesDateFrom && !salesDateTo) setSalesOverview(data);
      } catch {
        if (cancelled) return;
        setSalesFiltered([]);
        if (!salesDateFrom && !salesDateTo) setSalesOverview([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user, salesDateFrom, salesDateTo]);

  useEffect(() => {
    if (!user || tab !== 'reviews') return;
    let cancelled = false;
    (async () => {
      setSellerReviewsLoading(true);
      try {
        const data = await fetchSellerReviews();
        if (!cancelled) setSellerReviews(data);
      } catch {
        if (!cancelled) setSellerReviews([]);
      }
      if (!cancelled) setSellerReviewsLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [user, tab]);

  const handleDeleteSellerReview = async (id: number) => {
    const ok = await confirm({
      message: lang === 'es' ? '¿Eliminar esta reseña de tu producto?' : 'Delete this review from your product?',
      variant: 'danger',
    });
    if (!ok) return;
    try {
      await deleteSellerReview(id);
      setSellerReviews(prev => prev.filter(r => r.id !== id));
    } catch {
      /* ignore */
    }
  };

  const totalRevenue = salesOverview.reduce((sum, s) => sum + s.seller_revenue_cents, 0);
  const totalSalesCount = salesOverview.length;
  const publishedCount = products.filter(p => p.status === 'published').length;
  const pendingCount = products.filter(p => p.status === 'pending_review').length;

  const formatPrice = (cents: number) => `S/ ${(cents / 100).toFixed(2)}`;
  const displayName = profile?.display_name || 'Docente';

  const handleDeleteProduct = async (id: number) => {
    try {
      await deleteSellerProduct(id);
      setProducts(prev => prev.filter(p => p.id !== id));
    } catch {
      /* ignore */
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 pt-16 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 pt-16">
      <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">{lang === 'es' ? 'Bienvenido/a,' : 'Welcome,'}</p>
              <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white">{displayName}</h1>
            </div>
            <button
              onClick={() => onNavigate('product-form')}
              className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition-colors"
            >
              <Plus className="w-4 h-4" />
              {t('dashboard.newProduct')}
            </button>
          </div>

          <div className="flex gap-1 mt-6 border-b border-gray-200 dark:border-gray-800 -mb-px">
            {([
              { key: 'overview', icon: <BarChart2 className="w-4 h-4" />, label: t('dashboard.overview') },
              { key: 'products', icon: <Package className="w-4 h-4" />, label: t('dashboard.products') },
              { key: 'sales', icon: <ShoppingBag className="w-4 h-4" />, label: t('dashboard.orders') },
              { key: 'reviews', icon: <Star className="w-4 h-4" />, label: lang === 'es' ? 'Reseñas' : 'Reviews' },
            ] as { key: Tab; icon: React.ReactNode; label: string }[]).map(item => (
              <button
                key={item.key}
                onClick={() => setTab(item.key)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                  tab === item.key
                    ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                {item.icon}
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {tab === 'overview' && (
          <div className="space-y-8">
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {[
                { icon: <DollarSign className="w-5 h-5" />, color: 'text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900', label: t('dashboard.totalEarnings'), value: formatPrice(totalRevenue) },
                { icon: <ShoppingBag className="w-5 h-5" />, color: 'text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900', label: t('dashboard.totalSales'), value: totalSalesCount },
                { icon: <Package className="w-5 h-5" />, color: 'text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-900', label: t('dashboard.published'), value: publishedCount },
                { icon: <Clock className="w-5 h-5" />, color: 'text-orange-600 dark:text-orange-400 bg-orange-100 dark:bg-orange-900', label: t('dashboard.pendingReview'), value: pendingCount },
              ].map(card => (
                <div key={card.label} className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 ${card.color}`}>{card.icon}</div>
                  <p className="text-2xl font-extrabold text-gray-900 dark:text-white">{card.value}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{card.label}</p>
                </div>
              ))}
            </div>

            {(profile?.role === 'seller' || profile?.role === 'admin') && (
              <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6">
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-violet-100 dark:bg-violet-950 text-violet-600 dark:text-violet-400">
                    <Users className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 dark:text-white">{lang === 'es' ? 'Seguidores' : 'Followers'}</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {lang === 'es' ? 'Personas que siguen tu perfil de vendedor' : 'People following your seller profile'}
                    </p>
                  </div>
                  <span className="ml-auto text-2xl font-extrabold text-gray-900 dark:text-white">{followersCount}</span>
                </div>
                {followers.length === 0 ? (
                  <p className="text-sm text-gray-400 py-2">{lang === 'es' ? 'Aun no tienes seguidores' : 'No followers yet'}</p>
                ) : (
                  <ul className="space-y-3 max-h-56 overflow-y-auto">
                    {followers.slice(0, 12).map(f => (
                      <li key={f.follower_id} className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden flex-shrink-0">
                          {f.avatar_url ? (
                            <img src={f.avatar_url} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-xs font-bold text-gray-500">
                              {f.display_name.slice(0, 1).toUpperCase()}
                            </div>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{f.display_name}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {new Date(f.followed_at).toLocaleDateString()}
                          </p>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            <div className="grid lg:grid-cols-2 gap-6">
              <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6">
                <div className="flex items-center justify-between mb-5">
                  <h3 className="font-bold text-gray-900 dark:text-white">{lang === 'es' ? 'Ventas recientes' : 'Recent sales'}</h3>
                  <button onClick={() => setTab('sales')} className="text-xs text-blue-600 dark:text-blue-400 font-medium hover:underline">{lang === 'es' ? 'Ver todas' : 'View all'}</button>
                </div>
                {salesOverview.length === 0 ? (
                  <p className="text-sm text-gray-400 py-4">{lang === 'es' ? 'Aun no tienes ventas' : 'No sales yet'}</p>
                ) : (
                  <div className="space-y-4">
                    {salesOverview.slice(0, 4).map(sale => (
                      <div key={sale.id} className="flex items-center justify-between py-2 border-b border-gray-50 dark:border-gray-800 last:border-0">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{sale.products?.title}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">{new Date(sale.created_at).toLocaleDateString()}</p>
                        </div>
                        <div className="text-right flex-shrink-0 ml-4">
                          <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">+{formatPrice(sale.seller_revenue_cents)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6">
                <div className="flex items-center justify-between mb-5">
                  <h3 className="font-bold text-gray-900 dark:text-white">{lang === 'es' ? 'Mis recursos' : 'My resources'}</h3>
                  <button onClick={() => setTab('products')} className="text-xs text-blue-600 dark:text-blue-400 font-medium hover:underline">{lang === 'es' ? 'Ver todos' : 'View all'}</button>
                </div>
                <div className="space-y-3">
                  {products.slice(0, 4).map(p => {
                    const s = statusConfig[p.status] || statusConfig.draft;
                    return (
                      <div key={p.id} className="flex items-center gap-3 py-2 border-b border-gray-50 dark:border-gray-800 last:border-0">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{p.title}</p>
                          <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${s.color}`}>
                            {s.icon}
                            {lang === 'es' ? s.label : s.labelEn}
                          </span>
                        </div>
                        <p className="text-sm font-bold text-gray-900 dark:text-white flex-shrink-0">{formatPrice(p.price_cents)}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {tab === 'products' && (
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
              <h2 className="font-bold text-gray-900 dark:text-white">{t('dashboard.products')}</h2>
              <button onClick={() => onNavigate('product-form')} className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition-colors">
                <Plus className="w-4 h-4" />
                {t('dashboard.newProduct')}
              </button>
            </div>
            {products.length === 0 ? (
              <div className="text-center py-16 text-gray-500 dark:text-gray-400">
                <Package className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p>{lang === 'es' ? 'Aun no tienes recursos' : 'No resources yet'}</p>
                <button onClick={() => onNavigate('product-form')} className="mt-4 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition-colors">
                  {t('dashboard.newProduct')}
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-100 dark:border-gray-800">
                      <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{lang === 'es' ? 'Recurso' : 'Resource'}</th>
                      <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{lang === 'es' ? 'Estado' : 'Status'}</th>
                      <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{lang === 'es' ? 'Precio' : 'Price'}</th>
                      <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{lang === 'es' ? 'Vistas' : 'Views'}</th>
                      <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{lang === 'es' ? 'Ventas' : 'Sales'}</th>
                      <th className="px-6 py-3" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                    {products.map(p => {
                      const s = statusConfig[p.status] || statusConfig.draft;
                      return (
                        <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                          <td className="px-6 py-4">
                            <p className="text-sm font-medium text-gray-900 dark:text-white">{p.title}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{p.product_type}</p>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${s.color}`}>
                              {s.icon}
                              {lang === 'es' ? s.label : s.labelEn}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm font-semibold text-gray-900 dark:text-white">{formatPrice(p.price_cents)}</td>
                          <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                            <span className="flex items-center gap-1"><Eye className="w-3.5 h-3.5" />{p.view_count}</span>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">{p.download_count}</td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <button onClick={() => onNavigate('product-form', { productId: p.id })} className="p-1.5 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                                <Pencil className="w-4 h-4" />
                              </button>
                              {p.status === 'draft' && (
                                <button onClick={() => handleDeleteProduct(p.id)} className="p-1.5 text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors">
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {tab === 'sales' && (
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="font-bold text-gray-900 dark:text-white">{t('dashboard.orders')}</h2>
              <div className="flex flex-wrap items-end gap-3">
                <DateField
                  label={lang === 'es' ? 'Desde' : 'From'}
                  value={salesDateFrom}
                  onChange={setSalesDateFrom}
                />
                <DateField
                  label={lang === 'es' ? 'Hasta' : 'To'}
                  value={salesDateTo}
                  onChange={setSalesDateTo}
                />
                <button
                  type="button"
                  onClick={() => {
                    setSalesDateFrom('');
                    setSalesDateTo('');
                  }}
                  className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline px-2 py-2"
                >
                  {lang === 'es' ? 'Limpiar fechas' : 'Clear dates'}
                </button>
              </div>
              <div className="text-right sm:ml-auto">
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {lang === 'es' ? 'Ganancias netas (periodo)' : 'Net earnings (period)'}
                </p>
                <p className="text-lg font-extrabold text-emerald-600 dark:text-emerald-400">
                  {formatPrice(salesFiltered.reduce((sum, s) => sum + s.seller_revenue_cents, 0))}
                </p>
              </div>
            </div>
            {salesFiltered.length === 0 ? (
              <div className="text-center py-16 text-gray-500 dark:text-gray-400">
                <ShoppingBag className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p>{lang === 'es' ? 'Aun no tienes ventas' : 'No sales yet'}</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-100 dark:border-gray-800">
                      <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{lang === 'es' ? 'Recurso' : 'Resource'}</th>
                      <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{lang === 'es' ? 'Total' : 'Total'}</th>
                      <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{lang === 'es' ? 'Comision' : 'Commission'}</th>
                      <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{lang === 'es' ? 'Ganancia neta' : 'Net earning'}</th>
                      <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{lang === 'es' ? 'Fecha' : 'Date'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                    {salesFiltered.map(sale => (
                      <tr key={sale.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                        <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-white">{sale.products?.title}</td>
                        <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">{formatPrice(sale.unit_price_cents)}</td>
                        <td className="px-6 py-4 text-sm text-red-500">-{formatPrice(sale.commission_cents)}</td>
                        <td className="px-6 py-4 text-sm font-bold text-emerald-600 dark:text-emerald-400">+{formatPrice(sale.seller_revenue_cents)}</td>
                        <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">{new Date(sale.created_at).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {tab === 'reviews' && (
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800">
              <h2 className="font-bold text-gray-900 dark:text-white">
                {lang === 'es' ? 'Reseñas en tus productos' : 'Reviews on your products'} ({sellerReviews.length})
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {lang === 'es'
                  ? 'Puedes eliminar reseñas que consideres inapropiadas.'
                  : 'You can delete reviews you consider inappropriate.'}
              </p>
            </div>
            {sellerReviewsLoading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
              </div>
            ) : sellerReviews.length === 0 ? (
              <div className="text-center py-16 text-gray-500 dark:text-gray-400">
                <Star className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p>{lang === 'es' ? 'Aun no hay reseñas en tus recursos' : 'No reviews on your resources yet'}</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-50 dark:divide-gray-800">
                {sellerReviews.map(r => (
                  <div key={r.id} className="px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden flex-shrink-0">
                          {r.profiles.avatar_url ? (
                            <img src={r.profiles.avatar_url} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-sm font-bold text-gray-500">
                              {(r.profiles.display_name || 'U')[0].toUpperCase()}
                            </div>
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-semibold text-gray-900 dark:text-white">{r.profiles.display_name}</p>
                            <div className="flex items-center gap-0.5">
                              {[1, 2, 3, 4, 5].map(i => (
                                <Star
                                  key={i}
                                  className={`w-3 h-3 ${i <= r.rating ? 'fill-amber-400 text-amber-400' : 'text-gray-200 dark:text-gray-700'}`}
                                />
                              ))}
                            </div>
                            <span className="text-xs text-gray-400">{new Date(r.created_at).toLocaleDateString()}</span>
                          </div>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                            {lang === 'es' ? 'Producto' : 'Product'}:{' '}
                            <button
                              type="button"
                              onClick={() => onNavigate('product-detail', { productId: r.products.id })}
                              className="font-medium text-blue-600 dark:text-blue-400 hover:underline"
                            >
                              {r.products.title}
                            </button>
                          </p>
                          {r.comment && (
                            <p className="text-sm text-gray-600 dark:text-gray-300 mt-2 leading-relaxed">{r.comment}</p>
                          )}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDeleteSellerReview(r.id)}
                        title={lang === 'es' ? 'Eliminar reseña' : 'Delete review'}
                        className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950 rounded-lg transition-colors flex-shrink-0"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

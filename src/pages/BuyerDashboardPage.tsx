import { useState, useEffect } from 'react';
import { ShoppingBag, BookOpen, Download, Loader2, UserPlus } from 'lucide-react';
import { useLang } from '../context/LangContext';
import { useAuth } from '../context/AuthContext';
import { fetchBuyerOrders, fetchMyFollowing } from '../lib/api';
import type { NavParams } from '../App';
import DateField from '../components/DateField';

interface BuyerDashboardPageProps {
  onNavigate: (page: string, params?: NavParams) => void;
}

interface OrderWithItems {
  id: number;
  status: string;
  total_cents: number;
  currency: string;
  created_at: string;
  order_items: {
    id: number;
    unit_price_cents: number;
    products: {
      id: number;
      title: string;
      cover_url: string | null;
      product_type: string;
      seller_id: string;
    } | null;
  }[];
}

export default function BuyerDashboardPage({ onNavigate }: BuyerDashboardPageProps) {
  const { lang } = useLang();
  const { user, profile } = useAuth();
  const [orders, setOrders] = useState<OrderWithItems[]>([]);
  const [followingCount, setFollowingCount] = useState(0);
  const [following, setFollowing] = useState<
    Array<{
      seller_id: string;
      display_name: string;
      avatar_url: string | null;
      seller_handle: string | null;
      followed_at: string;
    }>
  >([]);
  const [loading, setLoading] = useState(true);
  const [ordersLifetime, setOrdersLifetime] = useState<OrderWithItems[]>([]);
  const [orderDateFrom, setOrderDateFrom] = useState('');
  const [orderDateTo, setOrderDateTo] = useState('');

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    const run = async () => {
      setLoading(true);
      try {
        const fol = await fetchMyFollowing();
        if (!cancelled) {
          setFollowingCount(fol.count);
          setFollowing(fol.following);
        }
      } catch {
        if (!cancelled) {
          setFollowingCount(0);
          setFollowing([]);
        }
      }
      try {
        const data = (await fetchBuyerOrders({
          date_from: orderDateFrom || undefined,
          date_to: orderDateTo || undefined,
        })) as OrderWithItems[];
        if (cancelled) return;
        setOrders(data);
        if (!orderDateFrom && !orderDateTo) setOrdersLifetime(data);
      } catch {
        if (!cancelled) {
          setOrders([]);
          if (!orderDateFrom && !orderDateTo) setOrdersLifetime([]);
        }
      }
      if (!cancelled) setLoading(false);
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [user, orderDateFrom, orderDateTo]);

  const formatPrice = (cents: number) => `S/ ${(cents / 100).toFixed(2)}`;
  const totalSpent = ordersLifetime.filter(o => o.status === 'paid').reduce((sum, o) => sum + o.total_cents, 0);
  const totalItems = ordersLifetime.filter(o => o.status === 'paid').reduce((sum, o) => sum + o.order_items.length, 0);
  const hasOrderDateFilter = Boolean(orderDateFrom || orderDateTo);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 pt-16">
      <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <p className="text-sm text-gray-500 dark:text-gray-400">{lang === 'es' ? 'Bienvenido/a,' : 'Welcome,'}</p>
          <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white">{profile?.display_name || 'Usuario'}</h1>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid sm:grid-cols-3 gap-5 mb-8">
          {[
            { icon: <ShoppingBag className="w-5 h-5" />, color: 'text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900', label: lang === 'es' ? 'Total compras' : 'Total orders', value: ordersLifetime.filter(o => o.status === 'paid').length },
            { icon: <BookOpen className="w-5 h-5" />, color: 'text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900', label: lang === 'es' ? 'Recursos adquiridos' : 'Resources acquired', value: totalItems },
            { icon: <Download className="w-5 h-5" />, color: 'text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-900', label: lang === 'es' ? 'Total invertido' : 'Total spent', value: formatPrice(totalSpent) },
          ].map(card => (
            <div key={card.label} className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 ${card.color}`}>{card.icon}</div>
              <p className="text-2xl font-extrabold text-gray-900 dark:text-white">{card.value}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{card.label}</p>
            </div>
          ))}
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400">
              <UserPlus className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <h2 className="font-bold text-gray-900 dark:text-white">{lang === 'es' ? 'Vendedores que sigues' : 'Sellers you follow'}</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {lang === 'es' ? 'Desde aquí puedes ir al perfil de cada uno' : 'Open each seller profile from here'}
              </p>
            </div>
            <span className="text-2xl font-extrabold text-gray-900 dark:text-white">{followingCount}</span>
          </div>
          {following.length === 0 ? (
            <p className="text-sm text-gray-400">{lang === 'es' ? 'Aun no sigues a ningun vendedor' : "You're not following any sellers yet"}</p>
          ) : (
            <ul className="grid sm:grid-cols-2 gap-3">
              {following.map(row => (
                <li key={row.seller_id}>
                  <button
                    type="button"
                    onClick={() => onNavigate('seller-profile', { sellerId: row.seller_id })}
                    className="w-full flex items-center gap-3 p-3 rounded-xl border border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/80 text-left transition-colors"
                  >
                    <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden flex-shrink-0">
                      {row.avatar_url ? (
                        <img src={row.avatar_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-sm font-bold text-gray-500">
                          {row.display_name.slice(0, 1).toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{row.display_name}</p>
                      {row.seller_handle && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">@{row.seller_handle}</p>
                      )}
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <h2 className="font-bold text-gray-900 dark:text-white">{lang === 'es' ? 'Historial de compras' : 'Purchase history'}</h2>
            <div className="flex flex-wrap items-end gap-3">
              <DateField
                label={lang === 'es' ? 'Desde' : 'From'}
                value={orderDateFrom}
                onChange={setOrderDateFrom}
              />
              <DateField
                label={lang === 'es' ? 'Hasta' : 'To'}
                value={orderDateTo}
                onChange={setOrderDateTo}
              />
              <button
                type="button"
                onClick={() => {
                  setOrderDateFrom('');
                  setOrderDateTo('');
                }}
                className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline px-2 py-2"
              >
                {lang === 'es' ? 'Limpiar fechas' : 'Clear dates'}
              </button>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
          ) : orders.length === 0 ? (
            <div className="text-center py-16 text-gray-500 dark:text-gray-400">
              <ShoppingBag className="w-10 h-10 mx-auto mb-3 opacity-30" />
              {hasOrderDateFilter ? (
                <p className="mb-4">{lang === 'es' ? 'No hay compras en este periodo.' : 'No purchases in this period.'}</p>
              ) : (
                <>
                  <p className="mb-4">{lang === 'es' ? 'Aun no has realizado compras' : "You haven't made any purchases yet"}</p>
                  <button
                    onClick={() => onNavigate('marketplace')}
                    className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition-colors"
                  >
                    {lang === 'es' ? 'Explorar marketplace' : 'Explore marketplace'}
                  </button>
                </>
              )}
            </div>
          ) : (
            <div className="divide-y divide-gray-50 dark:divide-gray-800">
              {orders.map(order => (
                <div key={order.id} className="px-6 py-5">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                        order.status === 'paid'
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300'
                          : order.status === 'pending'
                          ? 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300'
                          : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300'
                      }`}>
                        {order.status === 'paid' ? (lang === 'es' ? 'Pagado' : 'Paid') : order.status === 'pending' ? (lang === 'es' ? 'Pendiente' : 'Pending') : order.status}
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">{new Date(order.created_at).toLocaleDateString()}</span>
                    </div>
                    <span className="text-sm font-bold text-gray-900 dark:text-white">{formatPrice(order.total_cents)}</span>
                  </div>
                  <div className="space-y-2">
                    {order.order_items.map(item => (
                      <div
                        key={item.id}
                        className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                      >
                        <button
                          type="button"
                          className="flex flex-1 items-center gap-3 min-w-0 text-left cursor-pointer"
                          onClick={() => item.products?.id && onNavigate('product-detail', { productId: item.products.id })}
                        >
                          <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800 flex-shrink-0">
                            {item.products?.cover_url ? (
                              <img src={item.products.cover_url} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <BookOpen className="w-5 h-5 text-gray-400" />
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{item.products?.title || 'Producto'}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">{item.products?.product_type}</p>
                          </div>
                          <span className="text-sm text-gray-700 dark:text-gray-300 font-medium">{formatPrice(item.unit_price_cents)}</span>
                        </button>
                        {item.products?.seller_id && (
                          <a
                            href={`${window.location.origin}${window.location.pathname}?seller=${encodeURIComponent(item.products.seller_id)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs font-semibold text-blue-600 dark:text-blue-400 whitespace-nowrap hover:underline flex-shrink-0"
                          >
                            {lang === 'es' ? 'Ver vendedor' : 'View seller'}
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

import { useState, useEffect, useCallback } from 'react';
import { Star, Download, BadgeCheck, Shield, Share2, BookOpen, Video, FileText, Package, Calendar, Loader2, UserPlus, UserMinus } from 'lucide-react';
import { useLang } from '../context/LangContext';
import { useAuth } from '../context/AuthContext';
import {
  fetchProfileById,
  fetchSellerPublishedProducts,
  fetchFollowStatus,
  followSeller,
  unfollowSeller,
  type Profile,
  type Product,
} from '../lib/api';
import { getProductTypeLabel, getProductTypeHint } from '../lib/productTypeLabels';
import type { NavParams } from '../App';

interface SellerProfilePageProps {
  sellerId?: string;
  onNavigate?: (page: string, params?: NavParams) => void;
}

const typeIcons: Record<string, React.ReactNode> = {
  course: <Video className="w-3.5 h-3.5" />,
  resource: <FileText className="w-3.5 h-3.5" />,
  template: <FileText className="w-3.5 h-3.5" />,
  ebook: <BookOpen className="w-3.5 h-3.5" />,
  bundle: <Package className="w-3.5 h-3.5" />,
};

const typeColors: Record<string, string> = {
  course: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
  resource: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300',
  template: 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300',
  ebook: 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300',
  bundle: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900 dark:text-cyan-300',
};

export default function SellerProfilePage({ sellerId, onNavigate }: SellerProfilePageProps) {
  const { lang } = useLang();
  const { user } = useAuth();
  const [seller, setSeller] = useState<Profile | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [shareFeedback, setShareFeedback] = useState<'idle' | 'copied' | 'shared'>('idle');
  const [following, setFollowing] = useState<boolean | null>(null);
  const [followBusy, setFollowBusy] = useState(false);

  const targetId = sellerId || user?.id;

  /** URL compartible: mismo origen + `?seller=<id>` (sincroniza barra de direcciones). */
  useEffect(() => {
    if (!targetId || !seller) return;
    const url = new URL(window.location.href);
    url.searchParams.set('seller', targetId);
    const q = url.searchParams.toString();
    window.history.replaceState({}, '', `${url.pathname}?${q}`);
  }, [targetId, seller]);

  const handleShare = useCallback(async () => {
    if (!targetId || !seller) return;
    const shareUrl = `${window.location.origin}${window.location.pathname}?seller=${encodeURIComponent(targetId)}`;
    const title = seller.display_name;
    const text =
      lang === 'es' ? `Perfil de ${title} en YaProFe` : `${title} on YaProFe`;
    try {
      if (typeof navigator !== 'undefined' && navigator.share) {
        await navigator.share({ title, text, url: shareUrl });
        setShareFeedback('shared');
        window.setTimeout(() => setShareFeedback('idle'), 2800);
        return;
      }
    } catch (e) {
      if ((e as Error).name === 'AbortError') return;
    }
    try {
      await navigator.clipboard.writeText(shareUrl);
      setShareFeedback('copied');
      window.setTimeout(() => setShareFeedback('idle'), 2800);
    } catch {
      /* ignore */
    }
  }, [targetId, seller, lang]);

  useEffect(() => {
    if (!targetId) { setLoading(false); return; }
    const fetchData = async () => {
      setLoading(true);
      try {
        const [prof, prods] = await Promise.all([
          fetchProfileById(targetId),
          fetchSellerPublishedProducts(targetId),
        ]);
        setSeller(prof);
        setProducts(prods);
      } catch {
        setSeller(null);
        setProducts([]);
      }
      setLoading(false);
    };
    fetchData();
  }, [targetId]);

  useEffect(() => {
    if (!user || !targetId || user.id === targetId) {
      setFollowing(null);
      return;
    }
    let cancelled = false;
    fetchFollowStatus(targetId)
      .then(r => {
        if (!cancelled) setFollowing(r.following);
      })
      .catch(() => {
        if (!cancelled) setFollowing(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user, targetId]);

  const handleToggleFollow = async () => {
    if (!targetId || following === null || followBusy) return;
    setFollowBusy(true);
    try {
      if (following) {
        await unfollowSeller(targetId);
        setFollowing(false);
      } else {
        await followSeller(targetId);
        setFollowing(true);
      }
    } catch {
      /* ignore */
    }
    setFollowBusy(false);
  };

  const formatPrice = (cents: number) => {
    if (cents === 0) return lang === 'es' ? 'Gratis' : 'Free';
    return `S/ ${(cents / 100).toFixed(2)}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 pt-16 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!seller) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 pt-16 flex items-center justify-center">
        <p className="text-gray-500 dark:text-gray-400">{lang === 'es' ? 'Vendedor no encontrado' : 'Seller not found'}</p>
      </div>
    );
  }

  const avgRating = products.length > 0
    ? products.reduce((sum, p) => sum + p.rating_avg * p.rating_count, 0) / Math.max(products.reduce((sum, p) => sum + p.rating_count, 0), 1)
    : 0;
  const totalReviews = products.reduce((sum, p) => sum + p.rating_count, 0);
  const joinedYear = new Date(seller.created_at).getFullYear();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 pt-16">
      <div className="relative h-56 sm:h-72 overflow-hidden bg-gray-200 dark:bg-gray-900">
        <img
          src={seller.banner_url || 'https://images.pexels.com/photos/3183150/pexels-photo-3183150.jpeg?auto=compress&cs=tinysrgb&w=1200'}
          alt=""
          className="h-full w-full object-cover object-center"
          decoding="async"
        />
        <div
          className="pointer-events-none absolute inset-0 bg-black/30"
          aria-hidden
        />
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative -mt-14 mb-6 pt-4 sm:pt-6 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div className="flex items-end gap-4">
            <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl border-4 border-white dark:border-gray-950 overflow-hidden shadow-xl flex-shrink-0 bg-gray-200 dark:bg-gray-800">
              {seller.avatar_url ? (
                <img src={seller.avatar_url} alt={seller.display_name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-3xl font-bold text-gray-400">
                  {seller.display_name[0]?.toUpperCase()}
                </div>
              )}
            </div>
            <div className="pb-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-extrabold text-gray-900 dark:text-white">{seller.display_name}</h1>
                {seller.role === 'seller' && seller.is_verified && (
                  <span
                    className="inline-flex items-center gap-1 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 px-2 py-0.5 text-xs font-semibold"
                    title={lang === 'es' ? 'Cuenta revisada por YaProFe como vendedor' : 'YaProFe–verified seller account'}
                  >
                    <BadgeCheck className="w-4 h-4 flex-shrink-0" aria-hidden />
                    {lang === 'es' ? 'Vendedor verificado' : 'Verified seller'}
                  </span>
                )}
                {seller.role === 'admin' && (
                  <span
                    className="inline-flex items-center gap-1 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-200 px-2 py-0.5 text-xs font-semibold"
                    title={lang === 'es' ? 'Administración de la plataforma (no es un sello de vendedor)' : 'Platform staff (not a seller verification badge)'}
                  >
                    <Shield className="w-4 h-4 flex-shrink-0" aria-hidden />
                    {lang === 'es' ? 'Equipo YaProFe' : 'YaProFe team'}
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400">{seller.seller_handle ? `@${seller.seller_handle}` : ''}</p>
            </div>
          </div>
          <div className="flex flex-col gap-1 sm:items-end sm:pb-1">
            <div className="flex flex-wrap items-center gap-3 justify-end">
              <button
                type="button"
                onClick={handleShare}
                className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 text-sm font-medium hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                <Share2 className="w-4 h-4" />
                {lang === 'es' ? 'Compartir' : 'Share'}
              </button>
              {user?.id !== targetId && following !== null && (
                <button
                  type="button"
                  disabled={followBusy}
                  onClick={handleToggleFollow}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition-colors"
                >
                  {followBusy ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : following ? (
                    <UserMinus className="w-4 h-4" />
                  ) : (
                    <UserPlus className="w-4 h-4" />
                  )}
                  {following
                    ? lang === 'es'
                      ? 'Dejar de seguir'
                      : 'Unfollow'
                    : lang === 'es'
                      ? 'Seguir'
                      : 'Follow'}
                </button>
              )}
            </div>
            {shareFeedback === 'copied' && (
              <span className="text-xs text-emerald-600 dark:text-emerald-400 text-right w-full">
                {lang === 'es' ? 'Enlace copiado al portapapeles' : 'Link copied to clipboard'}
              </span>
            )}
            {shareFeedback === 'shared' && (
              <span className="text-xs text-emerald-600 dark:text-emerald-400 text-right w-full">
                {lang === 'es' ? 'Listo para compartir' : 'Ready to share'}
              </span>
            )}
          </div>
        </div>

        <div className="grid lg:grid-cols-4 gap-8">
          <div className="lg:col-span-1 space-y-5">
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-5">
              {seller.bio && <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed mb-4">{seller.bio}</p>}
              <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                <Calendar className="w-4 h-4" />
                {lang === 'es' ? `Miembro desde ${joinedYear}` : `Member since ${joinedYear}`}
              </div>
            </div>

            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-5">
              <h3 className="font-semibold text-gray-900 dark:text-white text-sm mb-4">{lang === 'es' ? 'Estadisticas' : 'Stats'}</h3>
              <div className="space-y-4">
                {[
                  { label: lang === 'es' ? 'Recursos' : 'Resources', value: products.length },
                  { label: lang === 'es' ? 'Ventas totales' : 'Total sales', value: seller.total_sales.toLocaleString() },
                  { label: lang === 'es' ? 'Valoracion' : 'Rating', value: avgRating > 0 ? `${avgRating.toFixed(1)} / 5.0` : '-' },
                  { label: lang === 'es' ? 'Resenas' : 'Reviews', value: totalReviews },
                ].map(stat => (
                  <div key={stat.label} className="flex items-center justify-between">
                    <span className="text-sm text-gray-500 dark:text-gray-400">{stat.label}</span>
                    <span className="text-sm font-bold text-gray-900 dark:text-white">{stat.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="lg:col-span-3">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">{lang === 'es' ? 'Recursos disponibles' : 'Available resources'}</h2>
              <span className="text-sm text-gray-500 dark:text-gray-400">{products.length} {lang === 'es' ? 'recursos' : 'resources'}</span>
            </div>

            {products.length === 0 ? (
              <div className="text-center py-16 text-gray-500 dark:text-gray-400">
                <BookOpen className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p>{lang === 'es' ? 'Este vendedor aun no tiene recursos publicados' : 'This seller has no published resources yet'}</p>
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-5">
                {products.map(product => (
                  <div
                    key={product.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => onNavigate?.('product-detail', { productId: product.id })}
                    onKeyDown={e => {
                      if (e.key === 'Enter' || e.key === ' ') onNavigate?.('product-detail', { productId: product.id });
                    }}
                    className="group bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 cursor-pointer"
                  >
                    <div className="relative h-40 overflow-hidden">
                      <img src={product.cover_url || 'https://images.pexels.com/photos/256541/pexels-photo-256541.jpeg?auto=compress&cs=tinysrgb&w=400'} alt={product.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                      {product.featured && (
                        <div className="absolute top-2 left-2">
                          <span className="bg-amber-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">{lang === 'es' ? 'Destacado' : 'Featured'}</span>
                        </div>
                      )}
                      <div className="absolute top-2 right-2">
                        <span
                          className={`flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${typeColors[product.product_type]}`}
                          title={getProductTypeHint(product.product_type, lang) || undefined}
                        >
                          {typeIcons[product.product_type] ?? <FileText className="w-3.5 h-3.5" />}
                          {getProductTypeLabel(product.product_type, lang)}
                        </span>
                      </div>
                    </div>
                    <div className="p-4">
                      <h3 className="font-bold text-gray-900 dark:text-white text-sm leading-snug mb-2 line-clamp-2">{product.title}</h3>
                      <div className="flex items-center gap-2 mb-3">
                        <div className="flex items-center gap-0.5">
                          {[1,2,3,4,5].map(i => (
                            <Star key={i} className={`w-3 h-3 ${i <= Math.round(product.rating_avg) ? 'fill-amber-400 text-amber-400' : 'text-gray-200 dark:text-gray-700'}`} />
                          ))}
                        </div>
                        <span className="text-xs text-gray-500">({product.rating_count})</span>
                        <span className="text-gray-300 dark:text-gray-700">·</span>
                        <span className="flex items-center gap-1 text-xs text-gray-500"><Download className="w-3 h-3" />{product.download_count}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-baseline gap-2">
                          <span className={`font-extrabold ${product.price_cents === 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-900 dark:text-white'}`}>{formatPrice(product.price_cents)}</span>
                          {product.original_price_cents && <span className="text-xs text-gray-400 line-through">{formatPrice(product.original_price_cents)}</span>}
                        </div>
                        <button
                          type="button"
                          onClick={e => {
                            e.stopPropagation();
                            onNavigate?.('product-detail', { productId: product.id });
                          }}
                          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg transition-colors"
                        >
                          {product.price_cents === 0 ? (lang === 'es' ? 'Descargar' : 'Download') : (lang === 'es' ? 'Comprar' : 'Buy')}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
      <div className="py-12" />
    </div>
  );
}

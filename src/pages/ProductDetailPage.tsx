import { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Loader2,
  Star,
  Download,
  BookOpen,
  Video,
  FileText,
  Package,
  ExternalLink,
  UserPlus,
  UserMinus,
  ShoppingCart,
  MessageSquare,
} from 'lucide-react';
import { useLang } from '../context/LangContext';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import {
  fetchPublicProduct,
  fetchAdminProduct,
  checkout,
  fetchPurchaseStatus,
  fetchBuyerLibraryFiles,
  fetchFollowStatus,
  followSeller,
  unfollowSeller,
  uploadFile,
  fetchProductReviews,
  submitProductReview,
  type Product,
  type ProductFile,
  type ProductReviewsResponse,
} from '../lib/api';
import type { NavParams } from '../App';
import SafeHtml from '../components/SafeHtml';
import FileTypeIcon from '../components/FileTypeIcon';
import { getProductTypeLabel, getProductTypeHint } from '../lib/productTypeLabels';

function formatBytes(n: number): string {
  if (n == null || !Number.isFinite(n) || n < 0) return '—';
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

const typeIcons: Record<string, React.ReactNode> = {
  course: <Video className="w-4 h-4" />,
  resource: <FileText className="w-4 h-4" />,
  template: <FileText className="w-4 h-4" />,
  ebook: <BookOpen className="w-4 h-4" />,
  bundle: <Package className="w-4 h-4" />,
};

interface ProductDetailPageProps {
  productId?: number;
  /** Si true y el usuario es admin, carga el producto aunque no esté publicado (vista previa). */
  adminPreview?: boolean;
  onNavigate: (page: string, params?: NavParams) => void;
}

export default function ProductDetailPage({ productId, adminPreview, onNavigate }: ProductDetailPageProps) {
  const { lang } = useLang();
  const { user } = useAuth();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [purchased, setPurchased] = useState(false);
  const [files, setFiles] = useState<ProductFile[]>([]);
  const [filesLoading, setFilesLoading] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutMsg, setCheckoutMsg] = useState('');
  const [payRef, setPayRef] = useState('');
  const [payMethod, setPayMethod] = useState<'manual_yape' | 'manual_transfer'>('manual_yape');
  const [payProofUrl, setPayProofUrl] = useState<string | null>(null);
  const [payProofUploading, setPayProofUploading] = useState(false);
  const [following, setFollowing] = useState<boolean | null>(null);
  const [followBusy, setFollowBusy] = useState(false);
  const [reviewsData, setReviewsData] = useState<ProductReviewsResponse | null>(null);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewError, setReviewError] = useState('');
  /** Contenido principal: descripción en pestaña "Ficha", reseñas aparte para no empujar precio/pago. */
  const [productDetailTab, setProductDetailTab] = useState<'ficha' | 'reseñas'>('ficha');

  const { addItem, hasItem } = useCart();

  const resolveAssetUrl = (url: string) => {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    const base = import.meta.env.VITE_API_URL || '';
    return `${base}${url}`;
  };

  const openSellerProfile = (sellerId: string) => {
    const u = new URL(window.location.href);
    u.search = '';
    u.searchParams.set('seller', sellerId);
    window.open(u.toString(), '_blank', 'noopener,noreferrer');
  };

  useEffect(() => {
    if (productId) {
      const url = new URL(window.location.href);
      url.searchParams.set('product', String(productId));
      if (adminPreview) url.searchParams.set('admin_preview', '1');
      else url.searchParams.delete('admin_preview');
      window.history.replaceState({}, '', `${url.pathname}?${url.searchParams.toString()}`);
    }
  }, [productId, adminPreview]);

  useEffect(() => {
    if (!productId) {
      setLoading(false);
      setError(lang === 'es' ? 'Producto no especificado' : 'Product not specified');
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError('');
      try {
        const p = adminPreview ? await fetchAdminProduct(productId) : await fetchPublicProduct(productId);
        if (!cancelled) setProduct(p);
        if (user && !cancelled && !adminPreview) {
          const st = await fetchPurchaseStatus(productId);
          if (!cancelled) {
            setPurchased(st.purchased);
            if (st.purchased) {
              setFilesLoading(true);
              try {
                const f = await fetchBuyerLibraryFiles(productId);
                if (!cancelled) setFiles(f);
              } catch {
                if (!cancelled) setFiles([]);
              }
              setFilesLoading(false);
            }
          }
        } else if (adminPreview && !cancelled) {
          setPurchased(false);
          setFiles([]);
        }
      } catch {
        if (!cancelled) {
          setError(
            adminPreview
              ? lang === 'es'
                ? 'No se pudo cargar la vista previa (¿iniciaste sesión como admin?)'
                : 'Could not load preview (sign in as admin?)'
              : lang === 'es'
                ? 'No se pudo cargar el producto'
                : 'Could not load product'
          );
          setProduct(null);
        }
      }
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [productId, user?.id, lang, adminPreview]);

  useEffect(() => {
    if (!user || !product || adminPreview) return;
    const sid = (product.profiles as { id?: string } | undefined)?.id;
    if (!sid || sid === user.id) {
      setFollowing(null);
      return;
    }
    let cancelled = false;
    fetchFollowStatus(sid)
      .then(r => {
        if (!cancelled) setFollowing(r.following);
      })
      .catch(() => {
        if (!cancelled) setFollowing(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user, product, adminPreview]);

  useEffect(() => {
    if (!productId || adminPreview || !product) return;
    let cancelled = false;
    setReviewsLoading(true);
    fetchProductReviews(productId)
      .then(data => {
        if (cancelled) return;
        setReviewsData(data);
        if (data.viewer?.my_review) {
          setReviewRating(data.viewer.my_review.rating);
          setReviewComment(data.viewer.my_review.comment || '');
        } else {
          setReviewRating(5);
          setReviewComment('');
        }
      })
      .catch(() => {
        if (!cancelled) setReviewsData(null);
      })
      .finally(() => {
        if (!cancelled) setReviewsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [productId, adminPreview, product?.id, user?.id]);

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productId || !reviewsData?.viewer?.can_review) return;
    setReviewSubmitting(true);
    setReviewError('');
    try {
      await submitProductReview({
        product_id: productId,
        rating: reviewRating,
        comment: reviewComment.trim() || null,
      });
      const [r, p] = await Promise.all([fetchProductReviews(productId), fetchPublicProduct(productId)]);
      setReviewsData(r);
      setProduct(p);
      if (r.viewer?.my_review) {
        setReviewRating(r.viewer.my_review.rating);
        setReviewComment(r.viewer.my_review.comment || '');
      }
    } catch (err) {
      setReviewError(err instanceof Error ? err.message : 'Error');
    }
    setReviewSubmitting(false);
  };

  const formatPrice = (cents: number) =>
    cents === 0 ? (lang === 'es' ? 'Gratis' : 'Free') : `S/ ${(cents / 100).toFixed(2)}`;

  const seller = product?.profiles as
    | {
        id?: string;
        display_name?: string;
        avatar_url?: string | null;
        is_verified?: boolean;
        seller_handle?: string | null;
        commission_rate?: number;
      }
    | undefined;

  const commissionPct = seller?.commission_rate ?? 15;
  const isOwner = Boolean(user && product && user.id === product.seller_id);
  const showCommissionBlurb = adminPreview || isOwner;

  const handleToggleFollow = async () => {
    if (!seller?.id || following === null || followBusy) return;
    setFollowBusy(true);
    try {
      if (following) {
        await unfollowSeller(seller.id);
        setFollowing(false);
      } else {
        await followSeller(seller.id);
        setFollowing(true);
      }
    } catch {
      /* ignore */
    }
    setFollowBusy(false);
  };

  const handlePaymentProofChange = async (file: File | null) => {
    if (!file || !user) return;
    if (!file.type.startsWith('image/')) return;
    setPayProofUploading(true);
    const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const path = `${user.id}/${Date.now()}-${safe}`;
    const { url, error: upErr } = await uploadFile('payment-proofs', path, file);
    setPayProofUploading(false);
    if (!upErr && url) setPayProofUrl(url);
  };

  const handleCheckout = async () => {
    if (!productId || !user || !product) return;
    setCheckoutLoading(true);
    setCheckoutMsg('');
    try {
      const isFree = product.price_cents === 0;
      const res = await checkout({
        product_ids: [productId],
        payment_method: isFree ? undefined : payMethod,
        payment_reference: isFree ? null : payRef.trim() || null,
        payment_proof_url: isFree ? null : payProofUrl,
      });
      if (res.status === 'paid') {
        setPurchased(true);
        const f = await fetchBuyerLibraryFiles(productId);
        setFiles(f);
      }
      onNavigate('order-confirmation', {
        orderId: res.order_id,
        orderStatus: res.status,
        orderTotalCents: res.total_cents,
        confirmProductIds: [productId],
      });
    } catch (e) {
      setCheckoutMsg(e instanceof Error ? e.message : 'Error');
    }
    setCheckoutLoading(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 pt-16 flex items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 pt-16 flex flex-col items-center justify-center px-4">
        <p className="text-gray-600 dark:text-gray-400 mb-6">{error || '—'}</p>
        <button
          type="button"
          onClick={() => onNavigate('marketplace')}
          className="text-blue-600 dark:text-blue-400 font-medium"
        >
          {lang === 'es' ? 'Volver al marketplace' : 'Back to marketplace'}
        </button>
      </div>
    );
  }

  const cover =
    product.cover_url ||
    'https://images.pexels.com/photos/256541/pexels-photo-256541.jpeg?auto=format&fit=crop&w=800&q=80';

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 pt-16">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <button
          type="button"
          onClick={() => onNavigate(adminPreview ? 'admin' : 'marketplace')}
          className="inline-flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          {adminPreview ? (lang === 'es' ? 'Volver al admin' : 'Back to admin') : lang === 'es' ? 'Marketplace' : 'Marketplace'}
        </button>

        {adminPreview && (
          <div className="mb-6 p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-950 dark:text-amber-100 text-sm">
            <p className="font-semibold">{lang === 'es' ? 'Vista previa de administrador' : 'Admin preview'}</p>
            <p className="mt-1 opacity-90">
              {lang === 'es'
                ? `Estado: ${product.status === 'pending_review' ? 'En revisión' : product.status === 'published' ? 'Publicado' : product.status === 'draft' ? 'Borrador' : product.status}. Así verá el comprador la ficha cuando esté publicada.`
                : `Status: ${product.status}. This is how buyers will see the listing once published.`}
            </p>
          </div>
        )}

        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">
          <div className="aspect-[21/9] sm:h-72 w-full overflow-hidden bg-gray-200 dark:bg-gray-800">
            <img src={cover} alt="" className="w-full h-full object-cover" />
          </div>

          <div className="p-6 sm:p-8">
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <span
                className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300"
                title={getProductTypeHint(product.product_type, lang) || undefined}
              >
                {typeIcons[product.product_type] ?? <FileText className="w-4 h-4" />}
                {getProductTypeLabel(product.product_type, lang)}
              </span>
              {product.featured && (
                <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-200">
                  {lang === 'es' ? 'Destacado' : 'Featured'}
                </span>
              )}
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white mb-2">
              {product.title}
            </h1>
            {product.short_description && (
              <p className="text-gray-600 dark:text-gray-400 mb-6">{product.short_description}</p>
            )}

            <div className="flex flex-wrap items-center gap-3 mb-6">
              <div className="flex items-center gap-0.5">
                {[1, 2, 3, 4, 5].map(i => (
                  <Star
                    key={i}
                    className={`w-4 h-4 ${
                      i <= Math.round(product.rating_avg)
                        ? 'fill-amber-400 text-amber-400'
                        : 'text-gray-200 dark:text-gray-700'
                    }`}
                  />
                ))}
              </div>
              <span className="text-sm text-gray-500">
                ({product.rating_count}) · {product.download_count}{' '}
                {lang === 'es' ? 'descargas' : 'downloads'}
              </span>
            </div>

            <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <p className="text-3xl font-extrabold text-gray-900 dark:text-white">
                  {formatPrice(product.price_cents)}
                </p>
                {product.original_price_cents != null && product.original_price_cents > product.price_cents && (
                  <p className="text-sm text-gray-400 line-through">
                    S/ {(product.original_price_cents / 100).toFixed(2)}
                  </p>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-3">
                {seller?.id && (
                  <>
                    <button
                      type="button"
                      onClick={() => openSellerProfile(seller.id!)}
                      className="px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800"
                    >
                      {lang === 'es' ? 'Ver vendedor' : 'View seller'}
                    </button>
                    {user &&
                      seller?.id &&
                      user.id !== seller.id &&
                      !purchased &&
                      product.price_cents > 0 &&
                      !adminPreview && (
                        <button
                          type="button"
                          onClick={() =>
                            addItem({
                              productId: product.id,
                              title: product.title,
                              price_cents: product.price_cents,
                              cover_url: product.cover_url,
                            })
                          }
                          disabled={hasItem(product.id)}
                          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-emerald-600/50 dark:border-emerald-500/50 text-emerald-700 dark:text-emerald-300 text-sm font-medium hover:bg-emerald-50 dark:hover:bg-emerald-950/40 disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                          <ShoppingCart className="w-4 h-4" />
                          {hasItem(product.id)
                            ? lang === 'es'
                              ? 'En el carrito'
                              : 'In cart'
                            : lang === 'es'
                              ? 'Añadir al carrito'
                              : 'Add to cart'}
                        </button>
                      )}
                    {user && user.id !== seller.id && following !== null && !adminPreview && (
                      <button
                        type="button"
                        disabled={followBusy}
                        onClick={handleToggleFollow}
                        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-semibold"
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
                  </>
                )}
              </div>
            </div>

            {!user && !adminPreview && (
              <div className="mt-8 p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                  {lang === 'es' ? 'Inicia sesión para comprar o descargar.' : 'Sign in to purchase or download.'}
                </p>
                <button
                  type="button"
                  onClick={() => onNavigate('login')}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl"
                >
                  {lang === 'es' ? 'Iniciar sesión' : 'Sign in'}
                </button>
              </div>
            )}

            {user && !purchased && product.price_cents > 0 && !adminPreview && (
              <div className="mt-8 space-y-4 p-5 rounded-2xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/30">
                <p className="text-sm font-semibold text-gray-900 dark:text-white">
                  {lang === 'es' ? 'Pago (manual hasta conectar pasarela)' : 'Payment (manual until gateway is connected)'}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {lang === 'es'
                    ? 'El pedido queda pendiente. Un administrador confirma cuando recibe el Yape/transferencia, o en el futuro el webhook de Stripe.'
                    : 'Order stays pending. An admin confirms when Yape/transfer is received, or later via Stripe webhook.'}
                </p>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setPayMethod('manual_yape')}
                    className={`px-3 py-2 rounded-lg text-sm font-medium ${
                      payMethod === 'manual_yape'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200'
                    }`}
                  >
                    Yape / similar
                  </button>
                  <button
                    type="button"
                    onClick={() => setPayMethod('manual_transfer')}
                    className={`px-3 py-2 rounded-lg text-sm font-medium ${
                      payMethod === 'manual_transfer'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200'
                    }`}
                  >
                    {lang === 'es' ? 'Transferencia' : 'Bank transfer'}
                  </button>
                </div>
                <input
                  type="text"
                  value={payRef}
                  onChange={e => setPayRef(e.target.value)}
                  placeholder={
                    lang === 'es'
                      ? 'Nº de operación o referencia (opcional)'
                      : 'Operation number or reference (optional)'
                  }
                  className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-sm"
                />
                <div className="space-y-2">
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400">
                    {lang === 'es' ? 'Comprobante (captura de Yape o transferencia)' : 'Proof (Yape or transfer screenshot)'}
                  </label>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    disabled={payProofUploading}
                    onChange={e => {
                      const f = e.target.files?.[0];
                      void handlePaymentProofChange(f ?? null);
                      e.target.value = '';
                    }}
                    className="w-full text-sm text-gray-600 dark:text-gray-400 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:bg-gray-200 dark:file:bg-gray-700 file:text-gray-800 dark:file:text-gray-200"
                  />
                  {payProofUploading && (
                    <p className="text-xs text-gray-500 flex items-center gap-2">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      {lang === 'es' ? 'Subiendo…' : 'Uploading…'}
                    </p>
                  )}
                  {payProofUrl && (
                    <div className="flex items-center gap-3">
                      <img
                        src={resolveAssetUrl(payProofUrl)}
                        alt=""
                        className="h-20 rounded-lg border border-gray-200 dark:border-gray-600 object-cover"
                      />
                      <button
                        type="button"
                        className="text-xs text-red-600 dark:text-red-400 hover:underline"
                        onClick={() => setPayProofUrl(null)}
                      >
                        {lang === 'es' ? 'Quitar imagen' : 'Remove image'}
                      </button>
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  disabled={checkoutLoading}
                  onClick={handleCheckout}
                  className="w-full sm:w-auto px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold rounded-xl flex items-center justify-center gap-2"
                >
                  {checkoutLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  {lang === 'es' ? 'Confirmar compra (pedido pendiente)' : 'Place order (pending)'}
                </button>
                {checkoutMsg && (
                  <p className="text-sm text-emerald-600 dark:text-emerald-400">{checkoutMsg}</p>
                )}
              </div>
            )}

            {user && !purchased && product.price_cents === 0 && !adminPreview && (
              <div className="mt-8">
                <button
                  type="button"
                  disabled={checkoutLoading}
                  onClick={handleCheckout}
                  className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-semibold rounded-xl flex items-center gap-2"
                >
                  {checkoutLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                  {lang === 'es' ? 'Obtener gratis' : 'Get for free'}
                </button>
                {checkoutMsg && (
                  <p className="text-sm text-emerald-600 dark:text-emerald-400 mt-2">{checkoutMsg}</p>
                )}
              </div>
            )}

            {user && purchased && !adminPreview && (
              <div className="mt-8 p-5 rounded-2xl border border-emerald-200 dark:border-emerald-900 bg-emerald-50 dark:bg-emerald-950/30">
                <p className="font-semibold text-emerald-800 dark:text-emerald-200 mb-3 flex items-center gap-2">
                  <Download className="w-5 h-5" />
                  {lang === 'es' ? 'Tus archivos' : 'Your files'}
                </p>
                {filesLoading ? (
                  <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
                ) : files.length === 0 ? (
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {lang === 'es'
                      ? 'No hay archivos adjuntos. Contacta al vendedor.'
                      : 'No attached files. Contact the seller.'}
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {files.map(f => (
                      <li key={f.id}>
                        <a
                          href={resolveAssetUrl(f.file_url)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:underline text-sm min-w-0"
                        >
                          <FileTypeIcon fileName={f.file_name} fileType={f.file_type} size={20} />
                          <span className="truncate">{f.file_name || f.file_url}</span>
                          <ExternalLink className="w-4 h-4 flex-shrink-0 opacity-60" aria-hidden />
                        </a>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            <div className="mt-8 border-t border-gray-100 dark:border-gray-800 pt-6">
              <div className="flex flex-wrap gap-2 mb-4 border-b border-gray-200 dark:border-gray-800">
                <button
                  type="button"
                  onClick={() => setProductDetailTab('ficha')}
                  className={`px-4 py-2.5 text-sm font-semibold rounded-t-lg border-b-2 -mb-px transition-colors ${
                    productDetailTab === 'ficha'
                      ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                      : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
                  }`}
                >
                  {lang === 'es' ? 'Ficha del recurso' : 'Product details'}
                </button>
                <button
                  type="button"
                  onClick={() => setProductDetailTab('reseñas')}
                  className={`px-4 py-2.5 text-sm font-semibold rounded-t-lg border-b-2 -mb-px inline-flex items-center gap-2 transition-colors ${
                    productDetailTab === 'reseñas'
                      ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                      : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
                  }`}
                >
                  <MessageSquare className="w-4 h-4" />
                  {lang === 'es' ? 'Reseñas' : 'Reviews'}
                  {product.rating_count > 0 && (
                    <span className="text-xs font-normal opacity-80">({product.rating_count})</span>
                  )}
                </button>
              </div>

              {productDetailTab === 'ficha' && (
                <>
                  {showCommissionBlurb && (
                    <div className="mb-8 p-4 rounded-xl bg-blue-50 dark:bg-blue-950/50 border border-blue-100 dark:border-blue-900">
                      <p className="text-sm text-blue-900 dark:text-blue-100">
                        {adminPreview && !isOwner
                          ? lang === 'es'
                            ? `Comisión aplicada en ventas: ${commissionPct}% (YaProFe). El comprador no ve este recuadro en la ficha pública.`
                            : `Sales commission: ${commissionPct}% (YaProFe). Buyers do not see this box on the public listing.`
                          : lang === 'es'
                            ? `En tus ventas, la comisión de la plataforma es ${commissionPct}% (YaProFe); el resto se acredita a tu cuenta al confirmarse el pago.`
                            : `On your sales, the platform fee is ${commissionPct}% (YaProFe); the remainder is credited to you when payment is confirmed.`}
                      </p>
                    </div>
                  )}

                  {product.description && (
                    <SafeHtml
                      html={product.description}
                      className="prose prose-sm dark:prose-invert max-w-none mb-8 text-gray-700 dark:text-gray-300 [&_a]:text-blue-600 dark:[&_a]:text-blue-400"
                    />
                  )}

                  {product.file_manifest && product.file_manifest.length > 0 && !adminPreview && (
                    <div className="mb-2 p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/40">
                      <p className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
                        {lang === 'es' ? 'Archivos incluidos al completar la compra' : 'Files included when you complete purchase'}
                      </p>
                      <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                        {product.file_manifest.map((f, i) => (
                          <li key={i} className="flex justify-between gap-3 items-center">
                            <span className="flex items-center gap-2 min-w-0">
                              <FileTypeIcon fileName={f.file_name} fileType={f.file_type} size={20} />
                              <span className="truncate">{f.file_name || (lang === 'es' ? 'Archivo' : 'File')}</span>
                            </span>
                            <span className="flex-shrink-0 text-gray-500 dark:text-gray-500">{formatBytes(f.file_size_bytes)}</span>
                          </li>
                        ))}
                      </ul>
                      <p className="text-xs text-gray-500 dark:text-gray-500 mt-3">
                        {lang === 'es'
                          ? 'Las descargas con enlace se habilitan cuando el pedido queda pagado.'
                          : 'Download links unlock when your order is marked paid.'}
                      </p>
                    </div>
                  )}
                </>
              )}

              {productDetailTab === 'reseñas' && adminPreview && (
                <p className="text-sm text-gray-500 dark:text-gray-400 py-4">
                  {lang === 'es'
                    ? 'Las reseñas no se muestran en vista previa de administrador.'
                    : 'Reviews are not shown in admin preview.'}
                </p>
              )}

              {productDetailTab === 'reseñas' && !adminPreview && (
                <div>
                  {reviewsLoading ? (
                    <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                  ) : (
                    <>
                      {reviewsData?.viewer?.my_review && (
                        <div className="mb-6 p-4 rounded-xl border border-emerald-200 dark:border-emerald-900 bg-emerald-50/80 dark:bg-emerald-950/30">
                          <p className="text-sm font-semibold text-emerald-900 dark:text-emerald-200 mb-2">
                            {lang === 'es' ? 'Tu reseña' : 'Your review'}
                          </p>
                          <div className="flex gap-0.5 mb-2">
                            {[1, 2, 3, 4, 5].map(i => (
                              <Star
                                key={i}
                                className={`w-5 h-5 ${
                                  i <= reviewsData.viewer.my_review.rating
                                    ? 'fill-amber-400 text-amber-400'
                                    : 'text-gray-200 dark:text-gray-700'
                                }`}
                              />
                            ))}
                          </div>
                          {reviewsData.viewer.my_review.comment && (
                            <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                              {reviewsData.viewer.my_review.comment}
                            </p>
                          )}
                          <p className="text-xs text-gray-500 mt-2">
                            {lang === 'es'
                              ? 'Solo puedes dejar una reseña por producto.'
                              : 'You can only leave one review per product.'}
                          </p>
                        </div>
                      )}

                      {reviewsData?.viewer?.can_review && (
                        <form
                          onSubmit={handleReviewSubmit}
                          className="mb-6 p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/40 space-y-3"
                        >
                          <p className="text-sm font-medium text-gray-900 dark:text-white">
                            {lang === 'es' ? 'Deja tu reseña' : 'Write a review'}
                          </p>
                          <div className="flex items-center gap-1">
                            {[1, 2, 3, 4, 5].map(n => (
                              <button
                                key={n}
                                type="button"
                                onClick={() => setReviewRating(n)}
                                className="p-0.5 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                                aria-label={`${n} ${lang === 'es' ? 'estrellas' : 'stars'}`}
                              >
                                <Star
                                  className={`w-7 h-7 ${
                                    n <= reviewRating
                                      ? 'fill-amber-400 text-amber-400'
                                      : 'text-gray-200 dark:text-gray-600'
                                  }`}
                                />
                              </button>
                            ))}
                          </div>
                          <textarea
                            value={reviewComment}
                            onChange={e => setReviewComment(e.target.value)}
                            rows={3}
                            maxLength={4000}
                            placeholder={lang === 'es' ? 'Comentario (opcional)' : 'Comment (optional)'}
                            className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-sm text-gray-900 dark:text-white"
                          />
                          {reviewError && (
                            <p className="text-sm text-red-600 dark:text-red-400">{reviewError}</p>
                          )}
                          <button
                            type="submit"
                            disabled={reviewSubmitting}
                            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-semibold rounded-xl inline-flex items-center gap-2"
                          >
                            {reviewSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                            {lang === 'es' ? 'Publicar reseña' : 'Submit review'}
                          </button>
                        </form>
                      )}

                      {reviewsData && reviewsData.reviews.length === 0 && !reviewsData.viewer?.can_review && !reviewsData.viewer?.my_review && (
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {lang === 'es' ? 'Aún no hay reseñas.' : 'No reviews yet.'}
                        </p>
                      )}

                      {reviewsData && reviewsData.reviews.length > 0 && (
                        <ul className="space-y-4 max-h-[min(70vh,520px)] overflow-y-auto pr-1">
                          {reviewsData.reviews
                            .filter(rv => rv.id !== reviewsData.viewer?.my_review?.id)
                            .map(rv => (
                            <li
                              key={rv.id}
                              className="p-4 rounded-xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900/50"
                            >
                              <div className="flex items-start gap-3">
                                {rv.profiles.avatar_url ? (
                                  <img
                                    src={rv.profiles.avatar_url}
                                    alt=""
                                    className="w-10 h-10 rounded-full object-cover flex-shrink-0"
                                  />
                                ) : (
                                  <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-sm font-bold text-gray-600 dark:text-gray-300 flex-shrink-0">
                                    {(rv.profiles.display_name || '?')[0].toUpperCase()}
                                  </div>
                                )}
                                <div className="min-w-0 flex-1">
                                  <div className="flex flex-wrap items-center gap-2 mb-1">
                                    <span className="font-medium text-gray-900 dark:text-white">
                                      {rv.profiles.display_name || '—'}
                                    </span>
                                    <span className="text-xs text-gray-400">
                                      {new Date(rv.created_at).toLocaleDateString()}
                                    </span>
                                  </div>
                                  <div className="flex gap-0.5 mb-2">
                                    {[1, 2, 3, 4, 5].map(i => (
                                      <Star
                                        key={i}
                                        className={`w-4 h-4 ${
                                          i <= rv.rating
                                            ? 'fill-amber-400 text-amber-400'
                                            : 'text-gray-200 dark:text-gray-700'
                                        }`}
                                      />
                                    ))}
                                  </div>
                                  {rv.comment && (
                                    <p className="text-sm text-gray-600 dark:text-gray-300 whitespace-pre-wrap">
                                      {rv.comment}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </li>
                          ))}
                        </ul>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

import { useState } from 'react';
import { Trash2, Loader2, ShoppingCart, ArrowLeft } from 'lucide-react';
import { useLang } from '../context/LangContext';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { checkout, uploadFile } from '../lib/api';
import type { NavParams } from '../App';

interface CartPageProps {
  onNavigate: (page: string, params?: NavParams) => void;
}

export default function CartPage({ onNavigate }: CartPageProps) {
  const { lang } = useLang();
  const { user } = useAuth();
  const { items, removeItem, clear, totalCents } = useCart();
  const [payRef, setPayRef] = useState('');
  const [payMethod, setPayMethod] = useState<'manual_yape' | 'manual_transfer'>('manual_yape');
  const [payProofUrl, setPayProofUrl] = useState<string | null>(null);
  const [payProofUploading, setPayProofUploading] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutMsg, setCheckoutMsg] = useState('');

  const resolveAssetUrl = (url: string) => {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    const base = import.meta.env.VITE_API_URL || '';
    return `${base}${url}`;
  };

  const formatPrice = (cents: number) =>
    cents === 0 ? (lang === 'es' ? 'Gratis' : 'Free') : `S/ ${(cents / 100).toFixed(2)}`;

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
    if (!user || items.length === 0) return;
    setCheckoutLoading(true);
    setCheckoutMsg('');
    try {
      const ids = items.map((i) => i.productId);
      const isFree = totalCents === 0;
      const res = await checkout({
        product_ids: ids,
        payment_method: isFree ? undefined : payMethod,
        payment_reference: isFree ? null : payRef.trim() || null,
        payment_proof_url: isFree ? null : payProofUrl,
      });
      if (res.status === 'paid' || res.status === 'pending') {
        clear();
      }
      onNavigate('order-confirmation', {
        orderId: res.order_id,
        orderStatus: res.status,
        orderTotalCents: res.total_cents,
        confirmProductIds: ids,
      });
    } catch (e) {
      setCheckoutMsg(e instanceof Error ? e.message : 'Error');
    }
    setCheckoutLoading(false);
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 pt-16 flex flex-col items-center justify-center px-4">
        <p className="text-gray-600 dark:text-gray-400 mb-4">
          {lang === 'es' ? 'Inicia sesión para usar el carrito.' : 'Sign in to use the cart.'}
        </p>
        <button
          type="button"
          onClick={() => onNavigate('login')}
          className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl"
        >
          {lang === 'es' ? 'Iniciar sesión' : 'Sign in'}
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 pt-16">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <button
          type="button"
          onClick={() => onNavigate('marketplace')}
          className="inline-flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          {lang === 'es' ? 'Seguir comprando' : 'Continue shopping'}
        </button>

        <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
          <ShoppingCart className="w-7 h-7" />
          {lang === 'es' ? 'Carrito' : 'Cart'}
        </h1>

        {items.length === 0 ? (
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-10 text-center text-gray-500 dark:text-gray-400">
            {lang === 'es' ? 'Tu carrito está vacío.' : 'Your cart is empty.'}
          </div>
        ) : (
          <div className="space-y-6">
            <ul className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 divide-y divide-gray-100 dark:divide-gray-800">
              {items.map((it) => (
                <li key={it.productId} className="flex items-center gap-4 p-4">
                  <img
                    src={
                      it.cover_url ||
                      'https://images.pexels.com/photos/256541/pexels-photo-256541.jpeg?auto=compress&cs=tinysrgb&w=120'
                    }
                    alt=""
                    className="w-16 h-16 rounded-lg object-cover flex-shrink-0 bg-gray-100 dark:bg-gray-800"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 dark:text-white truncate">{it.title}</p>
                    <p className="text-sm text-gray-500">{formatPrice(it.price_cents)}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeItem(it.productId)}
                    className="p-2 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/50"
                    aria-label={lang === 'es' ? 'Quitar' : 'Remove'}
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </li>
              ))}
            </ul>

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 rounded-xl bg-gray-100 dark:bg-gray-800/50">
              <p className="text-lg font-bold text-gray-900 dark:text-white">
                {lang === 'es' ? 'Total' : 'Total'}: {formatPrice(totalCents)}
              </p>
            </div>

            {totalCents > 0 && (
              <div className="space-y-4 p-5 rounded-2xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/30">
                <p className="text-sm font-semibold text-gray-900 dark:text-white">
                  {lang === 'es' ? 'Pago (manual hasta conectar pasarela)' : 'Payment (manual until gateway is connected)'}
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
                  onChange={(e) => setPayRef(e.target.value)}
                  placeholder={
                    lang === 'es' ? 'Nº de operación o referencia (opcional)' : 'Operation number or reference (optional)'
                  }
                  className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-sm"
                />
                <div className="space-y-2">
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400">
                    {lang === 'es' ? 'Comprobante (captura)' : 'Proof (screenshot)'}
                  </label>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    disabled={payProofUploading}
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      void handlePaymentProofChange(f ?? null);
                      e.target.value = '';
                    }}
                    className="w-full text-sm text-gray-600 dark:text-gray-400 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:bg-gray-200 dark:file:bg-gray-700"
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
              </div>
            )}

            <button
              type="button"
              disabled={checkoutLoading}
              onClick={handleCheckout}
              className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold rounded-xl flex items-center justify-center gap-2"
            >
              {checkoutLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {totalCents === 0
                ? lang === 'es'
                  ? 'Confirmar (gratis)'
                  : 'Confirm (free)'
                : lang === 'es'
                  ? 'Confirmar pedido (pendiente de pago)'
                  : 'Place order (pending payment)'}
            </button>
            {checkoutMsg && (
              <p className="text-sm text-emerald-600 dark:text-emerald-400 text-center">{checkoutMsg}</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

import { CheckCircle, Clock, Package, ArrowRight, ShoppingBag } from 'lucide-react';
import { useLang } from '../context/LangContext';

export type OrderConfirmationNavParams = {
  sellerId?: string;
  productId?: number;
  adminPreview?: boolean;
  orderId?: number;
  orderStatus?: string;
  orderTotalCents?: number;
  confirmProductIds?: number[];
  /** Token de recuperación de contraseña (URL `?reset_token=`). */
  resetToken?: string;
};

type OrderConfirmationPageProps = {
  orderId?: number;
  orderStatus?: string;
  orderTotalCents?: number;
  /** IDs de productos incluidos en el pedido (para enlaces). */
  confirmProductIds?: number[];
  onNavigate: (page: string, params?: OrderConfirmationNavParams) => void;
};

export default function OrderConfirmationPage({
  orderId,
  orderStatus,
  orderTotalCents,
  confirmProductIds,
  onNavigate,
}: OrderConfirmationPageProps) {
  const { lang } = useLang();
  const isPaid = orderStatus === 'paid';
  const isPending = orderStatus === 'pending';
  const totalLabel =
    orderTotalCents != null && Number.isFinite(orderTotalCents)
      ? orderTotalCents === 0
        ? lang === 'es'
          ? 'Gratis'
          : 'Free'
        : `S/ ${(orderTotalCents / 100).toFixed(2)}`
      : '—';

  const productIds = confirmProductIds?.filter(id => Number.isFinite(id) && id > 0) ?? [];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 pt-16 flex flex-col items-center justify-center px-4 py-12">
      <div className="max-w-lg w-full bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-xl p-8 text-center">
        {isPaid ? (
          <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-emerald-100 dark:bg-emerald-950 flex items-center justify-center">
            <CheckCircle className="w-9 h-9 text-emerald-600 dark:text-emerald-400" />
          </div>
        ) : (
          <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-amber-100 dark:bg-amber-950 flex items-center justify-center">
            <Clock className="w-9 h-9 text-amber-600 dark:text-amber-400" />
          </div>
        )}

        <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white mb-2">
          {isPaid
            ? lang === 'es'
              ? '¡Compra completada!'
              : 'Purchase complete!'
            : lang === 'es'
              ? 'Pedido registrado'
              : 'Order placed'}
        </h1>

        {orderId != null && (
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
            {lang === 'es' ? 'Pedido n.º' : 'Order no.'} <span className="font-mono font-semibold text-gray-700 dark:text-gray-300">{orderId}</span>
          </p>
        )}
        <p className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-6">{totalLabel}</p>

        {isPending && (
          <div className="text-left space-y-3 mb-8 p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900">
            <p className="text-sm text-amber-950 dark:text-amber-100 font-medium">
              {lang === 'es'
                ? 'Tu pago está pendiente de verificación.'
                : 'Your payment is pending verification.'}
            </p>
            <p className="text-sm text-gray-700 dark:text-gray-300">
              {lang === 'es'
                ? 'Un administrador revisará tu Yape o transferencia (y el comprobante si lo subiste). Cuando confirme el pago, recibirás un correo con enlaces para descargar tus archivos. También podrás acceder desde Mis compras y desde la ficha de cada producto.'
                : 'An admin will verify your Yape or bank transfer (and your screenshot if you uploaded one). When payment is confirmed, you will receive an email with links to download your files. You can also access them from My purchases and each product page.'}
            </p>
          </div>
        )}

        {isPaid && (
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-8">
            {lang === 'es'
              ? 'Ya tienes acceso a tus recursos. Abre cada producto para ver la sección "Tus archivos".'
              : 'You now have access to your resources. Open each product to see the "Your files" section.'}
          </p>
        )}

        {productIds.length > 0 && (
          <div className="mb-8 text-left">
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
              {lang === 'es' ? 'Tus productos' : 'Your products'}
            </p>
            <ul className="space-y-2">
              {productIds.map(pid => (
                <li key={pid}>
                  <button
                    type="button"
                    onClick={() => onNavigate('product-detail', { productId: pid })}
                    className="w-full flex items-center justify-between gap-2 px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 text-sm font-medium text-blue-600 dark:text-blue-400"
                  >
                    <span className="flex items-center gap-2">
                      <Package className="w-4 h-4 flex-shrink-0" />
                      {lang === 'es' ? 'Ver recurso' : 'View resource'} #{pid}
                    </span>
                    <ArrowRight className="w-4 h-4 flex-shrink-0" />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            type="button"
            onClick={() => onNavigate('buyer-dashboard')}
            className="inline-flex items-center justify-center gap-2 px-5 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl"
          >
            <ShoppingBag className="w-4 h-4" />
            {lang === 'es' ? 'Mis compras' : 'My purchases'}
          </button>
          <button
            type="button"
            onClick={() => onNavigate('marketplace')}
            className="inline-flex items-center justify-center gap-2 px-5 py-3 border border-gray-300 dark:border-gray-600 text-gray-800 dark:text-gray-200 font-semibold rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800"
          >
            {lang === 'es' ? 'Seguir explorando' : 'Keep browsing'}
          </button>
        </div>
      </div>
    </div>
  );
}

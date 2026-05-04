import { useState, useEffect } from 'react';
import { ShoppingBag, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { fetchAdminOrders, adminPatchOrder, type AdminOrderRow } from '../../lib/api';
import { useConfirm } from '../../context/ConfirmContext';
import DateField from '../../components/DateField';

export default function AdminOrders({ lang }: { lang: string }) {
  const confirm = useConfirm();
  const [orders, setOrders] = useState<AdminOrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<number | null>(null);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const data = await fetchAdminOrders({
          date_from: dateFrom || undefined,
          date_to: dateTo || undefined,
        });
        if (!cancelled) setOrders(data);
      } catch {
        if (!cancelled) setOrders([]);
      }
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [dateFrom, dateTo]);

  const formatPrice = (cents: number) => `S/ ${(cents / 100).toFixed(2)}`;

  const handleMarkPaid = async (id: number) => {
    const ok = await confirm({
      message:
        lang === 'es'
          ? '¿Confirmar que el pago fue recibido (Yape/transferencia/etc.)? Se acreditará al vendedor según la comisión.'
          : 'Confirm payment received? Seller will be credited per commission split.',
      variant: 'danger',
    });
    if (!ok) return;
    setActionId(id);
    try {
      await adminPatchOrder(id, 'paid');
      const data = await fetchAdminOrders({
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
      });
      setOrders(data);
    } catch {
      /* ignore */
    }
    setActionId(null);
  };

  const handleCancel = async (id: number) => {
    const ok = await confirm({
      message: lang === 'es' ? '¿Cancelar este pedido pendiente?' : 'Cancel this pending order?',
      variant: 'danger',
    });
    if (!ok) return;
    setActionId(id);
    try {
      await adminPatchOrder(id, 'cancelled');
      const data = await fetchAdminOrders({
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
      });
      setOrders(data);
    } catch {
      /* ignore */
    }
    setActionId(null);
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 flex items-center justify-center py-16">
        <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-500 dark:text-gray-400 max-w-3xl">
        {lang === 'es'
          ? 'Pedidos con pago manual: revisa referencia de Yape/transferencia y confirma. Con Stripe u otra pasarela, el estado pasará a pagado por webhook.'
          : 'Manual payments: check Yape/transfer reference then confirm. With Stripe, status will update via webhook.'}
      </p>

      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <h2 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <ShoppingBag className="w-5 h-5" />
            {lang === 'es' ? 'Pedidos' : 'Orders'} ({orders.length})
          </h2>
          <div className="flex flex-wrap items-end gap-3">
            <DateField
              label={lang === 'es' ? 'Desde' : 'From'}
              value={dateFrom}
              onChange={setDateFrom}
            />
            <DateField
              label={lang === 'es' ? 'Hasta' : 'To'}
              value={dateTo}
              onChange={setDateTo}
            />
            <button
              type="button"
              onClick={() => {
                setDateFrom('');
                setDateTo('');
              }}
              className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline px-2 py-2"
            >
              {lang === 'es' ? 'Limpiar' : 'Clear'}
            </button>
          </div>
        </div>

        {orders.length === 0 ? (
          <div className="text-center py-16 text-gray-500">{lang === 'es' ? 'Sin pedidos' : 'No orders'}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-800 text-left text-gray-500 dark:text-gray-400">
                  <th className="px-4 py-3 font-medium">ID</th>
                  <th className="px-4 py-3 font-medium whitespace-nowrap">{lang === 'es' ? 'Fecha' : 'Date'}</th>
                  <th className="px-4 py-3 font-medium">{lang === 'es' ? 'Comprador' : 'Buyer'}</th>
                  <th className="px-4 py-3 font-medium">{lang === 'es' ? 'Total' : 'Total'}</th>
                  <th className="px-4 py-3 font-medium">{lang === 'es' ? 'Estado' : 'Status'}</th>
                  <th className="px-4 py-3 font-medium">{lang === 'es' ? 'Pago' : 'Payment'}</th>
                  <th className="px-4 py-3 font-medium">{lang === 'es' ? 'Productos' : 'Items'}</th>
                  <th className="px-4 py-3 font-medium" />
                </tr>
              </thead>
              <tbody>
                {orders.map(o => (
                  <tr key={o.id} className="border-b border-gray-50 dark:border-gray-800/50 align-top">
                    <td className="px-4 py-3 font-mono text-xs text-gray-600 dark:text-gray-400">{o.id}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-500 dark:text-gray-400">
                      {new Date(o.created_at).toLocaleString()}
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900 dark:text-white">{o.buyer_name || '—'}</p>
                      <p className="text-xs text-gray-500 truncate max-w-[180px]">{o.buyer_email}</p>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">{formatPrice(o.total_cents)}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${
                          o.status === 'paid'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200'
                            : o.status === 'pending'
                              ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200'
                              : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
                        }`}
                      >
                        {o.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-600 dark:text-gray-400 max-w-[200px]">
                      <p>{o.payment_method || '—'}</p>
                      {o.payment_reference && (
                        <p className="text-gray-500 mt-1">
                          {lang === 'es' ? 'Ref:' : 'Ref:'} {o.payment_reference}
                        </p>
                      )}
                      {o.payment_proof_url && (
                        <a
                          href={o.payment_proof_url.startsWith('http') ? o.payment_proof_url : `${import.meta.env.VITE_API_URL || ''}${o.payment_proof_url}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-block mt-2 text-blue-600 dark:text-blue-400 hover:underline"
                        >
                          {lang === 'es' ? 'Ver comprobante' : 'View proof'}
                        </a>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-600 dark:text-gray-400">
                      <ul className="space-y-1">
                        {o.order_items.map(it => (
                          <li key={it.id}>
                            {it.product_title}{' '}
                            <span className="text-gray-400">
                              ({lang === 'es' ? 'com.' : 'comm.'} {it.commission_rate}% →{' '}
                              {formatPrice(it.commission_cents)})
                            </span>
                          </li>
                        ))}
                      </ul>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {o.status === 'pending' && (
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            disabled={actionId === o.id}
                            onClick={() => handleMarkPaid(o.id)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold disabled:opacity-50"
                          >
                            {actionId === o.id ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <CheckCircle className="w-3 h-3" />
                            )}
                            {lang === 'es' ? 'Pago OK' : 'Mark paid'}
                          </button>
                          <button
                            type="button"
                            disabled={actionId === o.id}
                            onClick={() => handleCancel(o.id)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 text-xs font-medium text-gray-700 dark:text-gray-300 disabled:opacity-50"
                          >
                            <XCircle className="w-3 h-3" />
                            {lang === 'es' ? 'Cancelar' : 'Cancel'}
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

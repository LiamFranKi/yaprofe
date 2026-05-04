import { useState, useEffect } from 'react';
import { Search, CheckCircle, XCircle, Clock, Star as StarIcon, Loader2, ChevronDown, ExternalLink, Trash2, Eye } from 'lucide-react';
import { adminDeleteProduct, adminUpdateProduct, fetchAdminProducts, type Product, type Profile } from '../../lib/api';
import { useConfirm } from '../../context/ConfirmContext';

const statusConfig: Record<string, { label: string; labelEn: string; color: string }> = {
  published: { label: 'Publicado', labelEn: 'Published', color: 'text-emerald-700 bg-emerald-100 dark:text-emerald-300 dark:bg-emerald-900' },
  pending_review: { label: 'En revision', labelEn: 'Pending review', color: 'text-amber-700 bg-amber-100 dark:text-amber-300 dark:bg-amber-900' },
  draft: { label: 'Borrador', labelEn: 'Draft', color: 'text-gray-600 bg-gray-100 dark:text-gray-300 dark:bg-gray-800' },
  rejected: { label: 'Rechazado', labelEn: 'Rejected', color: 'text-red-700 bg-red-100 dark:text-red-300 dark:bg-red-900' },
};

export default function AdminProducts({ lang }: { lang: string }) {
  const confirm = useConfirm();
  const [products, setProducts] = useState<(Product & { profiles?: Profile })[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [actionId, setActionId] = useState<number | null>(null);
  const [rejectModal, setRejectModal] = useState<number | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const data = await fetchAdminProducts();
      setProducts(data as (Product & { profiles?: Profile })[]);
    } catch {
      setProducts([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const filtered = products.filter(p => {
    const q = search.toLowerCase();
    const matchSearch = !q || p.title.toLowerCase().includes(q) || p.slug.includes(q);
    const matchStatus = statusFilter === 'all' || p.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const pendingCount = products.filter(p => p.status === 'pending_review').length;

  const handleApprove = async (id: number) => {
    setActionId(id);
    try {
      await adminUpdateProduct(id, { status: 'published' });
      setProducts(prev => prev.map(p => (p.id === id ? { ...p, status: 'published' as const } : p)));
    } catch {
      /* ignore */
    }
    setActionId(null);
  };

  const handleReject = async (id: number) => {
    setActionId(id);
    try {
      await adminUpdateProduct(id, { status: 'rejected', rejection_reason: rejectReason || null });
      setProducts(prev => prev.map(p => (p.id === id ? { ...p, status: 'rejected' as const } : p)));
    } catch {
      /* ignore */
    }
    setRejectModal(null);
    setRejectReason('');
    setActionId(null);
  };

  const handleToggleFeatured = async (id: number, current: boolean) => {
    setActionId(id);
    try {
      await adminUpdateProduct(id, { featured: !current });
      setProducts(prev => prev.map(p => (p.id === id ? { ...p, featured: !current } : p)));
    } catch {
      /* ignore */
    }
    setActionId(null);
  };

  const handleDelete = async (id: number) => {
    const ok = await confirm({
      message: lang === 'es' ? '¿Eliminar este producto permanentemente?' : 'Delete this product permanently?',
      variant: 'danger',
    });
    if (!ok) return;
    setActionId(id);
    try {
      await adminDeleteProduct(id);
      setProducts(prev => prev.filter(p => p.id !== id));
    } catch {
      /* ignore */
    }
    setActionId(null);
  };

  const formatPrice = (cents: number) => (cents === 0 ? (lang === 'es' ? 'Gratis' : 'Free') : `S/ ${(cents / 100).toFixed(2)}`);

  return (
    <div className="space-y-5">
      {pendingCount > 0 && statusFilter !== 'pending_review' && (
        <button
          onClick={() => setStatusFilter('pending_review')}
          className="w-full bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-900 rounded-2xl p-4 flex items-center gap-3 hover:bg-amber-100 dark:hover:bg-amber-900 transition-colors text-left"
        >
          <Clock className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0" />
          <p className="text-sm font-semibold text-amber-800 dark:text-amber-200">
            {pendingCount} {lang === 'es' ? 'producto(s) pendiente(s) de revision' : 'product(s) pending review'}
          </p>
        </button>
      )}

      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <h2 className="font-bold text-gray-900 dark:text-white flex-shrink-0">
            {lang === 'es' ? 'Productos' : 'Products'} ({filtered.length})
          </h2>
          <div className="flex-1 flex items-center gap-3 w-full sm:w-auto">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder={lang === 'es' ? 'Buscar por titulo...' : 'Search by title...'}
                className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="relative">
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                className="appearance-none pl-3 pr-8 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
              >
                <option value="all">{lang === 'es' ? 'Todos los estados' : 'All statuses'}</option>
                <option value="pending_review">{lang === 'es' ? 'Pendiente revision' : 'Pending review'}</option>
                <option value="published">{lang === 'es' ? 'Publicado' : 'Published'}</option>
                <option value="draft">{lang === 'es' ? 'Borrador' : 'Draft'}</option>
                <option value="rejected">{lang === 'es' ? 'Rechazado' : 'Rejected'}</option>
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-500">{lang === 'es' ? 'Sin resultados' : 'No results'}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-800">
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">{lang === 'es' ? 'Producto' : 'Product'}</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">{lang === 'es' ? 'Vendedor' : 'Seller'}</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">{lang === 'es' ? 'Estado' : 'Status'}</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">{lang === 'es' ? 'Precio' : 'Price'}</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">{lang === 'es' ? 'Fecha' : 'Date'}</th>
                  <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">{lang === 'es' ? 'Acciones' : 'Actions'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                {filtered.map(p => {
                  const sc = statusConfig[p.status] || statusConfig.draft;
                  const seller = p.profiles as unknown as { display_name: string; seller_handle: string | null; avatar_url: string | null } | undefined;
                  const isActing = actionId === p.id;

                  return (
                    <tr key={p.id} className={`transition-colors ${p.status === 'pending_review' ? 'bg-amber-50/50 dark:bg-amber-950/20' : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'}`}>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-10 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800 flex-shrink-0">
                            {p.cover_url ? <img src={p.cover_url} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full" />}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-gray-900 dark:text-white truncate max-w-[220px]">{p.title}</p>
                            <p className="text-xs text-gray-400">
                              {p.product_type} · {p.view_count} {lang === 'es' ? 'vistas' : 'views'}
                            </p>
                          </div>
                          {p.featured && <StarIcon className="w-4 h-4 fill-amber-400 text-amber-400 flex-shrink-0" />}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm">
                        {p.seller_id ? (
                          <a
                            href={`${typeof window !== 'undefined' ? window.location.origin : ''}/?seller=${encodeURIComponent(p.seller_id)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 dark:text-blue-400 hover:underline"
                          >
                            {seller?.display_name || '—'}
                          </a>
                        ) : (
                          <span className="text-gray-600 dark:text-gray-400">{seller?.display_name || '—'}</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center text-xs font-semibold px-2.5 py-1 rounded-full ${sc.color}`}>
                          {lang === 'es' ? sc.label : sc.labelEn}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-white">{formatPrice(p.price_cents)}</td>
                      <td className="px-6 py-4 text-sm text-gray-500">{new Date(p.created_at).toLocaleDateString()}</td>
                      <td className="px-6 py-4">
                        {isActing ? (
                          <div className="flex justify-end">
                            <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                          </div>
                        ) : (
                          <div className="flex items-center justify-end gap-1.5">
                            {p.status === 'pending_review' && (
                              <>
                                <button
                                  onClick={() => handleApprove(p.id)}
                                  title={lang === 'es' ? 'Aprobar' : 'Approve'}
                                  className="p-1.5 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950 rounded-lg transition-colors"
                                >
                                  <CheckCircle className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => setRejectModal(p.id)}
                                  title={lang === 'es' ? 'Rechazar' : 'Reject'}
                                  className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-950 rounded-lg transition-colors"
                                >
                                  <XCircle className="w-4 h-4" />
                                </button>
                              </>
                            )}
                            {p.status === 'published' && (
                              <button
                                onClick={() => handleToggleFeatured(p.id, p.featured)}
                                title={p.featured ? (lang === 'es' ? 'Quitar destacado' : 'Remove featured') : lang === 'es' ? 'Destacar' : 'Feature'}
                                className={`p-1.5 rounded-lg transition-colors ${p.featured ? 'text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-950' : 'text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'}`}
                              >
                                <StarIcon className="w-4 h-4" />
                              </button>
                            )}
                            {p.status === 'rejected' && (
                              <button
                                onClick={() => handleApprove(p.id)}
                                title={lang === 'es' ? 'Re-aprobar' : 'Re-approve'}
                                className="p-1.5 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950 rounded-lg transition-colors"
                              >
                                <CheckCircle className="w-4 h-4" />
                              </button>
                            )}
                            <a
                              href={`${typeof window !== 'undefined' ? window.location.origin : ''}/?seller=${encodeURIComponent(p.seller_id)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              title={lang === 'es' ? 'Ver vendedor (nueva pestaña)' : 'View seller (new tab)'}
                              className="p-1.5 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors inline-flex"
                            >
                              <ExternalLink className="w-4 h-4" />
                            </a>
                            <button
                              type="button"
                              onClick={() => {
                                const base = typeof window !== 'undefined' ? window.location.origin + window.location.pathname : '';
                                window.open(`${base}?product=${p.id}&admin_preview=1`, '_blank', 'noopener,noreferrer');
                              }}
                              title={lang === 'es' ? 'Vista previa del producto' : 'Preview product'}
                              className="p-1.5 text-sky-600 hover:bg-sky-50 dark:hover:bg-sky-950 rounded-lg transition-colors"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(p.id)}
                              title={lang === 'es' ? 'Eliminar' : 'Delete'}
                              className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950 rounded-lg transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {rejectModal !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={() => setRejectModal(null)}>
          <div
            className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 w-full max-w-md p-6 shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">{lang === 'es' ? 'Rechazar producto' : 'Reject product'}</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              {lang === 'es'
                ? 'Indica el motivo del rechazo para que el vendedor pueda corregirlo.'
                : 'Provide a reason so the seller can fix the issue.'}
            </p>
            <textarea
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
              rows={3}
              placeholder={lang === 'es' ? 'Motivo del rechazo (opcional)...' : 'Rejection reason (optional)...'}
              className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500 resize-none mb-4"
            />
            <div className="flex items-center gap-3 justify-end">
              <button
                onClick={() => {
                  setRejectModal(null);
                  setRejectReason('');
                }}
                className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
              >
                {lang === 'es' ? 'Cancelar' : 'Cancel'}
              </button>
              <button
                onClick={() => handleReject(rejectModal)}
                disabled={actionId === rejectModal}
                className="flex items-center gap-2 px-5 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-xl transition-colors"
              >
                {actionId === rejectModal ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                {lang === 'es' ? 'Rechazar' : 'Reject'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

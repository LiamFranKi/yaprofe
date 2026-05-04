import { useState, useEffect } from 'react';
import { Star, Trash2, Loader2 } from 'lucide-react';
import { adminDeleteReview, fetchAdminReviews } from '../../lib/api';
import { useConfirm } from '../../context/ConfirmContext';

interface ReviewRow {
  id: number;
  rating: number;
  comment: string | null;
  created_at: string;
  products: { id: number; title: string } | null;
  profiles: { display_name: string; avatar_url: string | null } | null;
}

export default function AdminReviews({ lang }: { lang: string }) {
  const confirm = useConfirm();
  const [reviews, setReviews] = useState<ReviewRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await fetchAdminReviews();
        setReviews(data);
      } catch {
        setReviews([]);
      }
      setLoading(false);
    };
    load();
  }, []);

  const handleDelete = async (id: number) => {
    const ok = await confirm({
      message: lang === 'es' ? '¿Eliminar esta reseña?' : 'Delete this review?',
      variant: 'danger',
    });
    if (!ok) return;
    try {
      await adminDeleteReview(id);
      setReviews(prev => prev.filter(r => r.id !== id));
    } catch {
      /* ignore */
    }
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 flex items-center justify-center py-16">
        <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800">
        <h2 className="font-bold text-gray-900 dark:text-white">
          {lang === 'es' ? 'Resenas' : 'Reviews'} ({reviews.length})
        </h2>
      </div>

      {reviews.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <Star className="w-8 h-8 mx-auto mb-3 opacity-30" />
          <p>{lang === 'es' ? 'Aun no hay resenas' : 'No reviews yet'}</p>
        </div>
      ) : (
        <div className="divide-y divide-gray-50 dark:divide-gray-800">
          {reviews.map(r => (
            <div key={r.id} className="px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden flex-shrink-0">
                    {r.profiles?.avatar_url ? (
                      <img src={r.profiles.avatar_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-sm font-bold text-gray-500">
                        {(r.profiles?.display_name || 'U')[0].toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">{r.profiles?.display_name || 'Usuario'}</p>
                      <div className="flex items-center gap-0.5">
                        {[1, 2, 3, 4, 5].map(i => (
                          <Star key={i} className={`w-3 h-3 ${i <= r.rating ? 'fill-amber-400 text-amber-400' : 'text-gray-200 dark:text-gray-700'}`} />
                        ))}
                      </div>
                      <span className="text-xs text-gray-400">{new Date(r.created_at).toLocaleDateString()}</span>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      {lang === 'es' ? 'Producto' : 'Product'}:{' '}
                      <span className="font-medium text-gray-700 dark:text-gray-300">{r.products?.title || '—'}</span>
                    </p>
                    {r.comment && <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 leading-relaxed">{r.comment}</p>}
                  </div>
                </div>
                <button
                  onClick={() => handleDelete(r.id)}
                  title={lang === 'es' ? 'Eliminar resena' : 'Delete review'}
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
  );
}

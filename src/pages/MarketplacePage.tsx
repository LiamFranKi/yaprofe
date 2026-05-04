import { useState, useEffect } from 'react';
import { Search, Star, Download, BookOpen, Video, FileText, Package, ChevronDown, X, Loader2, ShoppingCart } from 'lucide-react';
import { useLang } from '../context/LangContext';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { fetchCategories, fetchMarketplaceProducts, type Product, type Category } from '../lib/api';
import { getProductTypeLabel, getProductTypeHint } from '../lib/productTypeLabels';
import type { NavParams } from '../App';

interface MarketplacePageProps {
  onNavigate: (page: string, params?: NavParams) => void;
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

export default function MarketplacePage({ onNavigate }: MarketplacePageProps) {
  const { t, lang } = useLang();
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCategories().then(setCategories).catch(() => setCategories([]));
  }, []);

  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      try {
        const data = await fetchMarketplaceProducts({
          typeFilter,
          categoryId: selectedCategory,
          search,
          sortBy,
        });
        setProducts(data);
      } catch {
        setProducts([]);
      }
      setLoading(false);
    };

    const debounce = setTimeout(fetchProducts, search ? 300 : 0);
    return () => clearTimeout(debounce);
  }, [search, typeFilter, sortBy, selectedCategory]);

  const typeFilters = [
    { key: 'all', label: t('marketplace.filter.all') },
    { key: 'course', label: t('marketplace.filter.course') },
    { key: 'resource', label: t('marketplace.filter.resource') },
    { key: 'template', label: t('marketplace.filter.template') },
    { key: 'ebook', label: t('marketplace.filter.ebook') },
  ];

  const formatPrice = (cents: number) => {
    if (cents === 0) return t('marketplace.free');
    return `S/ ${(cents / 100).toFixed(2)}`;
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 pt-16">
      <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white mb-6">{t('marketplace.title')}</h1>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder={t('marketplace.search')}
                className="w-full pl-12 pr-10 py-3 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {search && (
                <button onClick={() => setSearch('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            <div className="relative">
              <select
                value={sortBy}
                onChange={e => setSortBy(e.target.value)}
                className="appearance-none pl-4 pr-10 py-3 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer w-full sm:w-auto"
              >
                <option value="newest">{t('marketplace.sort.newest')}</option>
                <option value="popular">{t('marketplace.sort.popular')}</option>
                <option value="price_asc">{t('marketplace.sort.price_asc')}</option>
                <option value="price_desc">{t('marketplace.sort.price_desc')}</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
          </div>

          <div className="flex items-center gap-2 mt-4 overflow-x-auto pb-1">
            {typeFilters.map(f => (
              <button
                key={f.key}
                onClick={() => setTypeFilter(f.key)}
                className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  typeFilter === f.key
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex gap-8">
          <aside className="hidden lg:block w-56 flex-shrink-0">
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-5 sticky top-24">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-4 text-sm">
                {lang === 'es' ? 'Categorias' : 'Categories'}
              </h3>
              <ul className="space-y-1">
                <li>
                  <button
                    onClick={() => setSelectedCategory(null)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                      !selectedCategory
                        ? 'bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-medium'
                        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                    }`}
                  >
                    {t('marketplace.filter.all')}
                  </button>
                </li>
                {categories.map(cat => (
                  <li key={cat.id}>
                    <button
                      onClick={() => setSelectedCategory(cat.id)}
                      className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                        selectedCategory === cat.id
                          ? 'bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-medium'
                          : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                      }`}
                    >
                      {lang === 'es' ? cat.name_es : cat.name_en}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </aside>

          <main className="flex-1 min-w-0">
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
              {loading ? (lang === 'es' ? 'Cargando...' : 'Loading...') : `${products.length} ${lang === 'es' ? 'recursos encontrados' : 'resources found'}`}
            </p>

            {loading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
              </div>
            ) : products.length === 0 ? (
              <div className="text-center py-20 text-gray-500 dark:text-gray-400">
                <BookOpen className="w-12 h-12 mx-auto mb-4 opacity-30" />
                <p>{t('marketplace.empty')}</p>
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-6">
                {products.map(product => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    formatPrice={formatPrice}
                    t={t}
                    lang={lang}
                    onNavigate={onNavigate}
                  />
                ))}
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}

function ProductCard({ product, formatPrice, t, lang, onNavigate }: {
  product: Product;
  formatPrice: (cents: number) => string;
  t: (key: string) => string;
  lang: string;
  onNavigate: (page: string, params?: NavParams) => void;
}) {
  const { user } = useAuth();
  const { addItem, hasItem } = useCart();
  const isOnSale = product.original_price_cents !== null;
  const isFree = product.price_cents === 0;
  const seller = product.profiles as unknown as {
    id: string;
    display_name: string;
    avatar_url: string | null;
    is_verified: boolean;
    seller_handle: string | null;
    role?: string;
  } | undefined;

  return (
    <div
      className="group bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer"
      onClick={() => onNavigate('product-detail', { productId: product.id })}
      role="button"
      tabIndex={0}
      onKeyDown={e => {
        if (e.key === 'Enter' || e.key === ' ') onNavigate('product-detail', { productId: product.id });
      }}
    >
      <div className="relative h-44 overflow-hidden">
        <img
          src={product.cover_url || 'https://images.pexels.com/photos/256541/pexels-photo-256541.jpeg?auto=compress&cs=tinysrgb&w=400'}
          alt={product.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
        {product.featured && (
          <div className="absolute top-3 left-3">
            <span className="bg-amber-500 text-white text-xs font-bold px-2.5 py-1 rounded-full">
              {lang === 'es' ? 'Destacado' : 'Featured'}
            </span>
          </div>
        )}
        <div className="absolute top-3 right-3">
          <span
            className={`flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full ${typeColors[product.product_type] || 'bg-gray-100 text-gray-700'}`}
            title={getProductTypeHint(product.product_type, lang) || undefined}
          >
            {typeIcons[product.product_type] ?? <FileText className="w-3.5 h-3.5" />}
            {getProductTypeLabel(product.product_type, lang)}
          </span>
        </div>
        {user && product.seller_id !== user.id && product.price_cents > 0 && (
          <button
            type="button"
            onClick={e => {
              e.stopPropagation();
              addItem({
                productId: product.id,
                title: product.title,
                price_cents: product.price_cents,
                cover_url: product.cover_url,
              });
            }}
            disabled={hasItem(product.id)}
            className="absolute bottom-3 left-3 p-2.5 rounded-full bg-white/95 dark:bg-gray-900/95 shadow-md border border-gray-200 dark:border-gray-700 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950 disabled:opacity-50 disabled:cursor-not-allowed"
            title={lang === 'es' ? 'Añadir al carrito' : 'Add to cart'}
          >
            <ShoppingCart className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="p-5">
        <h3 className="font-bold text-gray-900 dark:text-white text-sm leading-snug mb-1 line-clamp-2">
          {product.title}
        </h3>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-3 line-clamp-1">{product.short_description}</p>

        <div className="flex items-center gap-2 mb-4">
          <div className="flex items-center gap-0.5">
            {[1, 2, 3, 4, 5].map(i => (
              <Star key={i} className={`w-3 h-3 ${i <= Math.round(product.rating_avg) ? 'fill-amber-400 text-amber-400' : 'text-gray-200 dark:text-gray-700'}`} />
            ))}
          </div>
          <span className="text-xs text-gray-500 dark:text-gray-400">({product.rating_count})</span>
          <span className="text-gray-300 dark:text-gray-700">·</span>
          <span className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
            <Download className="w-3 h-3" />
            {product.download_count}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-baseline gap-2">
            <span className={`font-extrabold text-lg ${isFree ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-900 dark:text-white'}`}>
              {formatPrice(product.price_cents)}
            </span>
            {isOnSale && (
              <span className="text-xs text-gray-400 line-through">
                S/ {(product.original_price_cents! / 100).toFixed(2)}
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={e => {
              e.stopPropagation();
              onNavigate('product-detail', { productId: product.id });
            }}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg transition-colors"
          >
            {isFree ? (lang === 'es' ? 'Descargar' : 'Download') : t('product.addToCart')}
          </button>
        </div>

        <div
          className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-800 flex items-center gap-2 cursor-pointer hover:opacity-90"
          onClick={e => {
            e.stopPropagation();
            onNavigate('seller-profile', { sellerId: product.seller_id });
          }}
          role="button"
          tabIndex={0}
          onKeyDown={e => {
            if (e.key === 'Enter' || e.key === ' ')
              onNavigate('seller-profile', { sellerId: product.seller_id });
          }}
        >
          {seller?.avatar_url ? (
            <img src={seller.avatar_url} alt="" className="w-5 h-5 rounded-full object-cover flex-shrink-0" />
          ) : (
            <div className="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-blue-600 dark:text-blue-400 text-xs font-bold flex-shrink-0">
              {(seller?.display_name || 'U')[0].toUpperCase()}
            </div>
          )}
          <span className="text-xs text-gray-500 dark:text-gray-400 truncate">{seller?.display_name || 'Vendedor'}</span>
          {seller?.role === 'seller' && seller?.is_verified && (
            <span
              className="text-blue-500 text-xs flex-shrink-0"
              title={lang === 'es' ? 'Vendedor verificado YaProFe' : 'YaProFe verified seller'}
              aria-label={lang === 'es' ? 'Vendedor verificado' : 'Verified seller'}
            >
              &#10003;
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

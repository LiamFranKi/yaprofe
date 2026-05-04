import { useState } from 'react';
import { BarChart2, Users, Package, Tag, Star, Shield, ShoppingBag } from 'lucide-react';
import { useLang } from '../context/LangContext';
import { useAuth } from '../context/AuthContext';
import AdminOverview from './admin/AdminOverview';
import AdminUsers from './admin/AdminUsers';
import AdminProducts from './admin/AdminProducts';
import AdminCategories from './admin/AdminCategories';
import AdminReviews from './admin/AdminReviews';
import AdminOrders from './admin/AdminOrders';
type AdminTab = 'overview' | 'users' | 'products' | 'categories' | 'orders' | 'reviews';

export default function AdminPage() {
  const { lang } = useLang();
  const { profile } = useAuth();
  const [tab, setTab] = useState<AdminTab>('overview');

  if (profile?.role !== 'admin') {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 pt-16 flex items-center justify-center">
        <div className="text-center">
          <Shield className="w-12 h-12 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
          <p className="text-gray-500 dark:text-gray-400 text-lg font-medium">
            {lang === 'es' ? 'Acceso restringido a administradores' : 'Admin access only'}
          </p>
        </div>
      </div>
    );
  }

  const tabs: { key: AdminTab; icon: React.ReactNode; label: string }[] = [
    { key: 'overview', icon: <BarChart2 className="w-4 h-4" />, label: lang === 'es' ? 'Resumen' : 'Overview' },
    { key: 'users', icon: <Users className="w-4 h-4" />, label: lang === 'es' ? 'Usuarios' : 'Users' },
    { key: 'products', icon: <Package className="w-4 h-4" />, label: lang === 'es' ? 'Productos' : 'Products' },
    { key: 'categories', icon: <Tag className="w-4 h-4" />, label: lang === 'es' ? 'Categorias' : 'Categories' },
    { key: 'orders', icon: <ShoppingBag className="w-4 h-4" />, label: lang === 'es' ? 'Pedidos' : 'Orders' },
    { key: 'reviews', icon: <Star className="w-4 h-4" />, label: lang === 'es' ? 'Resenas' : 'Reviews' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 pt-16">
      <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-8 h-8 rounded-lg bg-red-100 dark:bg-red-900 flex items-center justify-center">
              <Shield className="w-4 h-4 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider font-semibold">
                {lang === 'es' ? 'Panel de administracion' : 'Admin panel'}
              </p>
              <h1 className="text-xl font-extrabold text-gray-900 dark:text-white">YaProFe Admin</h1>
            </div>
          </div>

          <div className="flex gap-1 mt-5 border-b border-gray-200 dark:border-gray-800 -mb-px overflow-x-auto">
            {tabs.map(item => (
              <button
                key={item.key}
                onClick={() => setTab(item.key)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                  tab === item.key
                    ? 'border-red-600 text-red-600 dark:text-red-400'
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
          <AdminOverview lang={lang} onSwitchTab={t => setTab(t as AdminTab)} />
        )}
        {tab === 'users' && <AdminUsers lang={lang} />}
        {tab === 'products' && <AdminProducts lang={lang} />}
        {tab === 'categories' && <AdminCategories lang={lang} />}
        {tab === 'orders' && <AdminOrders lang={lang} />}
        {tab === 'reviews' && <AdminReviews lang={lang} />}
      </div>
    </div>
  );
}

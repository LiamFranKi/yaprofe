import { useState, useEffect } from 'react';
import {
  Search,
  ShieldCheck,
  ShieldOff,
  CheckCircle,
  XCircle,
  Loader2,
  ChevronDown,
  Pencil,
  ShoppingCart,
  X,
} from 'lucide-react';
import {
  adminUpdateProfile,
  fetchAdminUsers,
  fetchAdminSellerSales,
  type Profile,
  type AdminSellerSaleLine,
} from '../../lib/api';

const roleConfig: Record<string, { label: string; labelEn: string; color: string }> = {
  admin: { label: 'Administrador', labelEn: 'Admin', color: 'text-red-700 bg-red-100 dark:text-red-300 dark:bg-red-900' },
  seller: { label: 'Vendedor', labelEn: 'Seller', color: 'text-blue-700 bg-blue-100 dark:text-blue-300 dark:bg-blue-900' },
  buyer: { label: 'Comprador', labelEn: 'Buyer', color: 'text-emerald-700 bg-emerald-100 dark:text-emerald-300 dark:bg-emerald-900' },
};

export default function AdminUsers({ lang }: { lang: string }) {
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [actionUserId, setActionUserId] = useState<string | null>(null);

  const [editUser, setEditUser] = useState<Profile | null>(null);
  const [editForm, setEditForm] = useState({
    display_name: '',
    email: '',
    bio: '',
    seller_handle: '',
    commission_input: '' as string,
    is_active: true,
    role: 'buyer' as Profile['role'],
  });
  const [salesUser, setSalesUser] = useState<Profile | null>(null);
  const [salesLines, setSalesLines] = useState<AdminSellerSaleLine[]>([]);
  const [salesLoading, setSalesLoading] = useState(false);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const data = await fetchAdminUsers();
      setUsers(data);
    } catch {
      setUsers([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const openEdit = (u: Profile) => {
    setEditUser(u);
    setEditForm({
      display_name: u.display_name,
      email: u.email || '',
      bio: u.bio || '',
      seller_handle: u.seller_handle || '',
      commission_input: u.commission_rate != null ? String(u.commission_rate) : '',
      is_active: u.is_active,
      role: u.role,
    });
  };

  const saveEdit = async () => {
    if (!editUser) return;
    setActionUserId(editUser.id);
    try {
      const commission_rate =
        editForm.commission_input.trim() === '' ? null : Number(editForm.commission_input.replace(',', '.'));
      if (commission_rate !== null && (!Number.isFinite(commission_rate) || commission_rate < 0 || commission_rate > 100)) {
        throw new Error(lang === 'es' ? 'Comisión debe ser 0-100 o vacío' : 'Commission must be 0-100 or empty');
      }
      await adminUpdateProfile(editUser.id, {
        display_name: editForm.display_name,
        email: editForm.email,
        bio: editForm.bio || null,
        seller_handle: editForm.seller_handle.trim() || null,
        commission_rate,
        is_active: editForm.is_active,
        role: editForm.role,
      });
      await fetchUsers();
      setEditUser(null);
    } catch {
      /* apiRequest throws */
    }
    setActionUserId(null);
  };

  const openSales = async (u: Profile) => {
    if (u.role !== 'seller' && u.role !== 'admin') return;
    setSalesUser(u);
    setSalesLoading(true);
    setSalesLines([]);
    try {
      const lines = await fetchAdminSellerSales(u.id);
      setSalesLines(lines);
    } catch {
      setSalesLines([]);
    }
    setSalesLoading(false);
  };

  const filteredUsers = users.filter(u => {
    const q = search.toLowerCase();
    const matchSearch =
      !q ||
      u.display_name.toLowerCase().includes(q) ||
      (u.seller_handle || '').toLowerCase().includes(q) ||
      u.id.includes(q) ||
      (u.email || '').toLowerCase().includes(q);
    const matchRole = roleFilter === 'all' || u.role === roleFilter;
    return matchSearch && matchRole;
  });

  const handleChangeRole = async (userId: string, newRole: string) => {
    setActionUserId(userId);
    try {
      await adminUpdateProfile(userId, { role: newRole });
      setUsers(prev => prev.map(u => (u.id === userId ? { ...u, role: newRole as Profile['role'] } : u)));
    } catch {
      /* ignore */
    }
    setActionUserId(null);
  };

  const handleToggleVerified = async (userId: string, current: boolean) => {
    setActionUserId(userId);
    try {
      await adminUpdateProfile(userId, { is_verified: !current });
      setUsers(prev => prev.map(u => (u.id === userId ? { ...u, is_verified: !current } : u)));
    } catch {
      /* ignore */
    }
    setActionUserId(null);
  };

  const fmtMoney = (cents: number) => `S/ ${(cents / 100).toFixed(2)}`;

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <h2 className="font-bold text-gray-900 dark:text-white flex-shrink-0">
          {lang === 'es' ? 'Usuarios' : 'Users'} ({filteredUsers.length})
        </h2>
        <div className="flex-1 flex items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={lang === 'es' ? 'Buscar por nombre, email, handle o ID...' : 'Search by name, email, handle or ID...'}
              className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="relative">
            <select
              value={roleFilter}
              onChange={e => setRoleFilter(e.target.value)}
              className="appearance-none pl-3 pr-8 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
            >
              <option value="all">{lang === 'es' ? 'Todos los roles' : 'All roles'}</option>
              <option value="admin">Admin</option>
              <option value="seller">{lang === 'es' ? 'Vendedor' : 'Seller'}</option>
              <option value="buyer">{lang === 'es' ? 'Comprador' : 'Buyer'}</option>
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
        </div>
      ) : filteredUsers.length === 0 ? (
        <div className="text-center py-16 text-gray-500">{lang === 'es' ? 'Sin resultados' : 'No results'}</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-800">
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  {lang === 'es' ? 'Usuario' : 'User'}
                </th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  {lang === 'es' ? 'Email' : 'Email'}
                </th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">{lang === 'es' ? 'Rol' : 'Role'}</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  {lang === 'es' ? 'Comisión %' : 'Comm. %'}
                </th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  {lang === 'es' ? 'Estado' : 'Status'}
                </th>
                <th
                  className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider"
                  title={
                    lang === 'es'
                      ? 'Marca cuentas revisadas. El sello público «vendedor verificado» solo aplica a usuarios con rol Vendedor.'
                      : 'Marks reviewed accounts. The public verified badge only applies to users with the Seller role.'
                  }
                >
                  {lang === 'es' ? 'Verificado' : 'Verified'}
                </th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">{lang === 'es' ? 'Ventas' : 'Sales'}</th>
                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">{lang === 'es' ? 'Acciones' : 'Actions'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
              {filteredUsers.map(u => {
                const rc = roleConfig[u.role] || roleConfig.buyer;
                const isActing = actionUserId === u.id;
                const eff = u.effective_commission_percent ?? u.commission_rate ?? null;
                return (
                  <tr
                    key={u.id}
                    className={`hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors ${!u.is_active ? 'opacity-60' : ''}`}
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden flex-shrink-0">
                          {u.avatar_url ? (
                            <img src={u.avatar_url} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-sm font-bold text-gray-500">
                              {u.display_name[0]?.toUpperCase()}
                            </div>
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{u.display_name}</p>
                          <p className="text-xs text-gray-400 truncate">{u.seller_handle ? `@${u.seller_handle}` : u.id.slice(0, 8)}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-xs text-gray-600 dark:text-gray-300 max-w-[160px] truncate" title={u.email}>
                      {u.email || '—'}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full ${rc.color}`}>
                        {lang === 'es' ? rc.label : rc.labelEn}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300">
                      {eff != null ? (
                        <>
                          {eff}%
                          {u.commission_rate == null && (
                            <span className="block text-[10px] text-gray-400">{lang === 'es' ? '(general)' : '(global)'}</span>
                          )}
                        </>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {u.is_active ? (
                        <span className="text-xs font-medium text-emerald-600">{lang === 'es' ? 'Activo' : 'Active'}</span>
                      ) : (
                        <span className="text-xs font-medium text-red-600">{lang === 'es' ? 'Inactivo' : 'Inactive'}</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {u.is_verified ? (
                        <CheckCircle className="w-4 h-4 text-emerald-500" />
                      ) : (
                        <XCircle className="w-4 h-4 text-gray-300 dark:text-gray-600" />
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">{u.total_sales}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-1 flex-wrap">
                        {isActing ? (
                          <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={() => openEdit(u)}
                              title={lang === 'es' ? 'Editar datos' : 'Edit details'}
                              className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            {(u.role === 'seller' || u.role === 'admin') && (
                              <button
                                type="button"
                                onClick={() => openSales(u)}
                                title={lang === 'es' ? 'Ventas del vendedor' : 'Seller sales'}
                                className="p-1.5 rounded-lg text-teal-600 hover:bg-teal-50 dark:hover:bg-teal-950"
                              >
                                <ShoppingCart className="w-4 h-4" />
                              </button>
                            )}
                            <button
                              onClick={() => handleToggleVerified(u.id, u.is_verified)}
                              title={u.is_verified ? (lang === 'es' ? 'Quitar verificacion' : 'Remove verification') : lang === 'es' ? 'Verificar' : 'Verify'}
                              className={`p-1.5 rounded-lg transition-colors ${u.is_verified ? 'text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-950' : 'text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'}`}
                            >
                              {u.is_verified ? <ShieldOff className="w-4 h-4" /> : <ShieldCheck className="w-4 h-4" />}
                            </button>
                            {u.role !== 'admin' && (
                              <select
                                value={u.role}
                                onChange={e => handleChangeRole(u.id, e.target.value)}
                                className="text-xs px-2 py-1 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 cursor-pointer focus:outline-none max-w-[100px]"
                              >
                                <option value="buyer">{lang === 'es' ? 'Comprador' : 'Buyer'}</option>
                                <option value="seller">{lang === 'es' ? 'Vendedor' : 'Seller'}</option>
                              </select>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {editUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" role="dialog">
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800">
              <h3 className="font-bold text-gray-900 dark:text-white">{lang === 'es' ? 'Editar usuario' : 'Edit user'}</h3>
              <button type="button" onClick={() => setEditUser(null)} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-3 text-sm">
              <label className="block">
                <span className="text-gray-500 text-xs">{lang === 'es' ? 'Nombre visible' : 'Display name'}</span>
                <input
                  value={editForm.display_name}
                  onChange={e => setEditForm(f => ({ ...f, display_name: e.target.value }))}
                  className="mt-1 w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
                />
              </label>
              <label className="block">
                <span className="text-gray-500 text-xs">Email</span>
                <input
                  type="email"
                  value={editForm.email}
                  onChange={e => setEditForm(f => ({ ...f, email: e.target.value }))}
                  className="mt-1 w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
                />
              </label>
              <label className="block">
                <span className="text-gray-500 text-xs">Bio</span>
                <textarea
                  value={editForm.bio}
                  onChange={e => setEditForm(f => ({ ...f, bio: e.target.value }))}
                  rows={3}
                  className="mt-1 w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
                />
              </label>
              <label className="block">
                <span className="text-gray-500 text-xs">{lang === 'es' ? 'Handle vendedor (único)' : 'Seller handle (unique)'}</span>
                <input
                  value={editForm.seller_handle}
                  onChange={e => setEditForm(f => ({ ...f, seller_handle: e.target.value }))}
                  className="mt-1 w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
                />
              </label>
              <label className="block">
                <span className="text-gray-500 text-xs">
                  {lang === 'es' ? 'Comisión personal % (vacío = usar la general)' : 'Custom commission % (empty = global)'}
                </span>
                <input
                  value={editForm.commission_input}
                  onChange={e => setEditForm(f => ({ ...f, commission_input: e.target.value }))}
                  placeholder="15"
                  className="mt-1 w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
                />
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={editForm.is_active}
                  onChange={e => setEditForm(f => ({ ...f, is_active: e.target.checked }))}
                  className="rounded border-gray-300"
                />
                <span>{lang === 'es' ? 'Cuenta activa (si está desmarcado, no podrá entrar)' : 'Account active'}</span>
              </label>
              {editUser.role !== 'admin' && (
                <label className="block">
                  <span className="text-gray-500 text-xs">{lang === 'es' ? 'Rol' : 'Role'}</span>
                  <select
                    value={editForm.role}
                    onChange={e => setEditForm(f => ({ ...f, role: e.target.value as Profile['role'] }))}
                    className="mt-1 w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800"
                  >
                    <option value="buyer">{lang === 'es' ? 'Comprador' : 'Buyer'}</option>
                    <option value="seller">{lang === 'es' ? 'Vendedor' : 'Seller'}</option>
                  </select>
                </label>
              )}
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setEditUser(null)} className="px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700">
                  {lang === 'es' ? 'Cancelar' : 'Cancel'}
                </button>
                <button
                  type="button"
                  onClick={() => saveEdit()}
                  disabled={actionUserId === editUser.id}
                  className="px-4 py-2 rounded-xl bg-blue-600 text-white font-semibold disabled:opacity-50"
                >
                  {lang === 'es' ? 'Guardar' : 'Save'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {salesUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" role="dialog">
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 max-w-3xl w-full max-h-[90vh] overflow-hidden shadow-xl flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800">
              <div>
                <h3 className="font-bold text-gray-900 dark:text-white">{salesUser.display_name}</h3>
                <p className="text-xs text-gray-500">{lang === 'es' ? 'Líneas de ventas pagadas' : 'Paid sale lines'}</p>
              </div>
              <button type="button" onClick={() => setSalesUser(null)} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="overflow-y-auto flex-1 p-4">
              {salesLoading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                </div>
              ) : salesLines.length === 0 ? (
                <p className="text-center text-gray-500 py-8">{lang === 'es' ? 'Sin ventas pagadas aún' : 'No paid sales yet'}</p>
              ) : (
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-left text-gray-500 border-b border-gray-100 dark:border-gray-800">
                      <th className="pb-2">{lang === 'es' ? 'Fecha' : 'Date'}</th>
                      <th className="pb-2">{lang === 'es' ? 'Producto' : 'Product'}</th>
                      <th className="pb-2">{lang === 'es' ? 'Comprador' : 'Buyer'}</th>
                      <th className="pb-2 text-right">{lang === 'es' ? 'Bruto' : 'Gross'}</th>
                      <th className="pb-2 text-right">{lang === 'es' ? 'Comisión' : 'Fee'}</th>
                      <th className="pb-2 text-right">{lang === 'es' ? 'Vendedor' : 'Seller'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                    {salesLines.map(line => (
                      <tr key={line.id}>
                        <td className="py-2 whitespace-nowrap">{new Date(line.order_created_at).toLocaleString()}</td>
                        <td className="py-2 max-w-[140px] truncate" title={line.product_title}>
                          {line.product_title}
                        </td>
                        <td className="py-2 max-w-[120px] truncate" title={line.buyer_email}>
                          {line.buyer_name}
                        </td>
                        <td className="py-2 text-right">{fmtMoney(line.unit_price_cents)}</td>
                        <td className="py-2 text-right text-amber-700 dark:text-amber-400">{fmtMoney(line.commission_cents)}</td>
                        <td className="py-2 text-right text-emerald-700 dark:text-emerald-400">{fmtMoney(line.seller_revenue_cents)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

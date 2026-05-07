const TOKEN_KEY = 'yaprofe_token';

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string | null): void {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

const API_BASE = import.meta.env.VITE_API_URL || '';

export async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    ...(init?.headers as Record<string, string>),
  };
  if (init?.body && !(init.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }
  if (token) headers['Authorization'] = `Bearer ${token}`;

  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, { ...init, headers });
  } catch (e) {
    throw new Error(
      e instanceof Error
        ? /failed to fetch|networkerror|load failed|network request failed/i.test(e.message)
          ? 'No hay conexión con el servidor. Comprueba que la API esté en marcha (por ejemplo puerto 4000) y prueba recargar la página.'
          : e.message
        : 'Error de red al contactar el servidor'
    );
  }
  if (!res.ok) {
    const textBody = await res.text();
    let parsed: { error?: string; detail?: string } = {};
    try {
      parsed = JSON.parse(textBody) as typeof parsed;
    } catch {
      /* HTML o texto no JSON */
    }
    const fromJson = [parsed.error, parsed.detail].filter(Boolean).join(' — ').trim();
    const plain =
      fromJson ||
      (!textBody.trim().startsWith('<') ? textBody.trim().slice(0, 300) : '') ||
      '';
    const msg = plain || res.statusText || `Error (${res.status})`;
    throw new Error(msg);
  }
  if (res.status === 204) return undefined as T;
  const text = await res.text();
  return text ? (JSON.parse(text) as T) : (undefined as T);
}

export type UserRole = 'admin' | 'seller' | 'buyer';
export type ProductType = 'course' | 'resource' | 'template' | 'ebook' | 'bundle';
export type ProductStatus = 'draft' | 'pending_review' | 'published' | 'rejected';

export interface Profile {
  id: string;
  display_name: string;
  avatar_url: string | null;
  banner_url: string | null;
  bio: string | null;
  role: UserRole;
  locale: 'es' | 'en';
  theme_pref: 'light' | 'dark' | 'system';
  seller_handle: string | null;
  /** Porcentaje propio; `null` = usar comisión global de la plataforma. */
  commission_rate: number | null;
  /** Comisión aplicada en ventas (global o personal). Solo en algunas respuestas. */
  effective_commission_percent?: number;
  is_verified: boolean;
  is_active: boolean;
  total_sales: number;
  total_revenue_cents: number;
  created_at: string;
  email?: string;
}

export interface Category {
  id: number;
  parent_id: number | null;
  slug: string;
  name_es: string;
  name_en: string;
  icon: string | null;
  sort_order: number;
}

/** Metadatos de archivos incluidos en el producto (sin URL de descarga hasta comprar). */
export interface ProductFileManifestItem {
  file_name: string;
  file_type: string;
  file_size_bytes: number;
  sort_order: number;
}

export interface Product {
  id: number;
  seller_id: string;
  category_id: number | null;
  title: string;
  slug: string;
  description: string | null;
  short_description: string | null;
  product_type: ProductType;
  price_cents: number;
  original_price_cents: number | null;
  currency: string;
  cover_url: string | null;
  status: ProductStatus;
  tags: string[];
  download_count: number;
  view_count: number;
  rating_avg: number;
  rating_count: number;
  featured: boolean;
  created_at: string;
  /** Lista de archivos incluidos (nombre/tamaño) en ficha pública y admin. */
  file_manifest?: ProductFileManifestItem[];
  profiles?: Partial<Profile> & {
    id?: string;
    display_name?: string;
    avatar_url?: string | null;
    is_verified?: boolean;
    seller_handle?: string | null;
    role?: UserRole;
  };
  categories?: Category;
}

export interface ProductFile {
  id: number;
  product_id: number;
  file_url: string;
  file_name: string;
  file_type: string;
  file_size_bytes: number;
  sort_order: number;
  created_at: string;
}

function normalizeProfile(raw: unknown): Profile {
  if (raw === null || typeof raw !== 'object') {
    throw new Error('Tu cuenta no tiene un perfil válido. Contacta al soporte.');
  }
  const r = raw as Record<string, unknown>;
  const cr = r.commission_rate;
  const commission_rate =
    cr === null || cr === undefined || cr === '' ? null : Number(cr);
  const roleVal = r.role;
  const role: UserRole =
    roleVal === 'admin' || roleVal === 'seller' || roleVal === 'buyer' ? roleVal : 'buyer';
  let created_at: string;
  if (typeof r.created_at === 'string' && r.created_at) {
    created_at = r.created_at;
  } else if (r.created_at instanceof Date) {
    created_at = r.created_at.toISOString();
  } else {
    const d = new Date(r.created_at as string);
    created_at = Number.isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
  }
  return {
    id: String(r.id ?? ''),
    display_name: String(r.display_name ?? ''),
    avatar_url: (r.avatar_url as string) ?? null,
    banner_url: (r.banner_url as string) ?? null,
    bio: (r.bio as string) ?? null,
    role,
    locale: (r.locale as Profile['locale']) === 'en' ? 'en' : 'es',
    theme_pref:
      r.theme_pref === 'light' || r.theme_pref === 'dark' || r.theme_pref === 'system'
        ? r.theme_pref
        : 'system',
    seller_handle: (r.seller_handle as string) ?? null,
    commission_rate: commission_rate != null && Number.isFinite(commission_rate) ? commission_rate : null,
    effective_commission_percent:
      r.effective_commission_percent != null
        ? Number(r.effective_commission_percent)
        : undefined,
    is_verified: Boolean(r.is_verified),
    is_active: r.is_active === undefined ? true : Number(r.is_active) === 1,
    total_sales: Number(r.total_sales ?? 0),
    total_revenue_cents: Number(r.total_revenue_cents ?? 0),
    created_at,
    email: r.email as string | undefined,
  };
}

export type AuthRegisterResult =
  | { needsVerification: true; email: string; profile: Profile; user: { id: string; email: string } }
  | {
      needsVerification?: false;
      token: string;
      profile: Profile;
      user: { id: string; email: string };
      verificationSkipped?: boolean;
    };

export async function authRegister(
  email: string,
  password: string,
  displayName: string,
  role: string
): Promise<AuthRegisterResult> {
  const data = await apiRequest<{
    token?: string;
    needsVerification?: boolean;
    verificationSkipped?: boolean;
    profile: Record<string, unknown>;
    user: { id: string; email: string };
  }>('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email, password, displayName, role }),
  });
  if (!data?.user) {
    throw new Error('Respuesta inválida del servidor al registrarse.');
  }
  const profile = normalizeProfile(data.profile);
  if (data.needsVerification) {
    return {
      needsVerification: true,
      email: data.user.email,
      profile,
      user: data.user,
    };
  }
  if (!data?.token || typeof data.token !== 'string') {
    throw new Error('Respuesta inválida del servidor al registrarse.');
  }
  setToken(data.token);
  return { token: data.token, profile, user: data.user, verificationSkipped: data.verificationSkipped };
}

export async function verifyEmailWithToken(token: string): Promise<void> {
  await apiRequest('/api/auth/verify-email', {
    method: 'POST',
    body: JSON.stringify({ token }),
  });
}

export async function resendVerificationEmail(email: string): Promise<void> {
  await apiRequest('/api/auth/resend-verification', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
}

export async function authLogin(
  email: string,
  password: string
): Promise<{ token: string; profile: Profile; user: { id: string; email: string } }> {
  const data = await apiRequest<{
    token: string;
    profile: Record<string, unknown>;
    user: { id: string; email: string };
  }>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  if (!data?.token || typeof data.token !== 'string' || !data?.user) {
    throw new Error('Respuesta inválida del servidor al iniciar sesión.');
  }
  let profile: Profile;
  try {
    profile = normalizeProfile(data.profile);
  } catch (e) {
    setToken(null);
    throw e instanceof Error ? e : new Error(String(e));
  }
  setToken(data.token);
  return { token: data.token, profile, user: data.user };
}

export async function authMe(): Promise<{ profile: Profile; user: { id: string; email: string } }> {
  const data = await apiRequest<{ profile: Record<string, unknown>; user: { id: string; email: string } }>('/api/auth/me');
  return { profile: normalizeProfile(data.profile), user: data.user };
}

export async function changePassword(currentPassword: string, newPassword: string): Promise<void> {
  await apiRequest('/api/auth/password', {
    method: 'PATCH',
    body: JSON.stringify({ currentPassword, newPassword }),
  });
}

export async function requestPasswordReset(email: string): Promise<void> {
  await apiRequest('/api/auth/forgot-password', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
}

export async function resetPasswordWithToken(token: string, password: string): Promise<void> {
  await apiRequest('/api/auth/reset-password', {
    method: 'POST',
    body: JSON.stringify({ token, password }),
  });
}

/** Ficha pública de producto publicado. */
export async function fetchPublicProduct(id: number): Promise<Product> {
  return apiRequest<Product>(`/api/product/${id}`);
}

/** Vista previa admin: cualquier estado (pendiente de revisión, borrador, etc.). Requiere rol admin. */
export async function fetchAdminProduct(id: number): Promise<Product> {
  return apiRequest<Product>(`/api/admin/products/${id}`);
}

export async function fetchFollowStatus(sellerId: string): Promise<{ following: boolean }> {
  return apiRequest(`/api/follows/${encodeURIComponent(sellerId)}`);
}

export async function followSeller(sellerId: string): Promise<void> {
  await apiRequest(`/api/follows/${encodeURIComponent(sellerId)}`, { method: 'POST' });
}

export async function unfollowSeller(sellerId: string): Promise<void> {
  await apiRequest(`/api/follows/${encodeURIComponent(sellerId)}`, { method: 'DELETE' });
}

export async function fetchSellerFollowers(): Promise<{
  count: number;
  followers: Array<{
    follower_id: string;
    display_name: string;
    avatar_url: string | null;
    followed_at: string;
  }>;
}> {
  return apiRequest('/api/seller/followers');
}

export async function fetchMyFollowing(): Promise<{
  count: number;
  following: Array<{
    seller_id: string;
    display_name: string;
    avatar_url: string | null;
    seller_handle: string | null;
    followed_at: string;
  }>;
}> {
  return apiRequest('/api/me/following');
}

export async function checkout(body: {
  product_ids: number[];
  payment_method?: string;
  payment_reference?: string | null;
  /** URL de imagen de comprobante (Yape/transferencia), subida vía /api/upload */
  payment_proof_url?: string | null;
}): Promise<{
  order_id: number;
  status: string;
  total_cents: number;
  currency: string;
  payment_method: string;
  message: string;
}> {
  return apiRequest('/api/checkout', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function fetchPurchaseStatus(productId: number): Promise<{ purchased: boolean }> {
  return apiRequest(`/api/buyer/purchase-status/${productId}`);
}

export async function fetchBuyerLibraryFiles(productId: number): Promise<ProductFile[]> {
  return apiRequest<ProductFile[]>(`/api/buyer/library/${productId}/files`);
}

export type ProductReviewRow = {
  id: number;
  rating: number;
  comment: string | null;
  created_at: string;
  profiles: { display_name: string; avatar_url: string | null };
};

export type ProductReviewsResponse = {
  reviews: ProductReviewRow[];
  viewer: {
    can_review: boolean;
    my_review: {
      id: number;
      rating: number;
      comment: string | null;
      created_at: string;
    } | null;
  } | null;
};

export async function fetchProductReviews(productId: number): Promise<ProductReviewsResponse> {
  return apiRequest<ProductReviewsResponse>(`/api/product/${productId}/reviews`);
}

export async function submitProductReview(body: {
  product_id: number;
  rating: number;
  comment?: string | null;
}): Promise<void> {
  await apiRequest('/api/reviews', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export type AdminOrderRow = {
  id: number;
  buyer_id: string;
  buyer_email: string;
  buyer_name: string;
  status: string;
  total_cents: number;
  currency: string;
  payment_method: string | null;
  payment_reference: string | null;
  payment_proof_url?: string | null;
  paid_at: string | null;
  created_at: string;
  order_items: Array<{
    id: number;
    product_id: number;
    seller_id: string;
    unit_price_cents: number;
    commission_rate: number;
    commission_cents: number;
    seller_revenue_cents: number;
    product_title: string;
  }>;
};

export async function fetchAdminOrders(params?: {
  date_from?: string;
  date_to?: string;
}): Promise<AdminOrderRow[]> {
  const q = new URLSearchParams();
  if (params?.date_from) q.set('date_from', params.date_from);
  if (params?.date_to) q.set('date_to', params.date_to);
  const qs = q.toString();
  return apiRequest<AdminOrderRow[]>(`/api/admin/orders${qs ? `?${qs}` : ''}`);
}

export async function adminPatchOrder(
  orderId: number,
  status: 'paid' | 'cancelled'
): Promise<void> {
  await apiRequest(`/api/admin/orders/${orderId}`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
}

export function authLogout(): void {
  setToken(null);
}

export async function fetchCategories(): Promise<Category[]> {
  return apiRequest<Category[]>('/api/categories');
}

export async function fetchMarketplaceProducts(params: {
  typeFilter: string;
  categoryId: number | null;
  search: string;
  sortBy: string;
}): Promise<Product[]> {
  const q = new URLSearchParams();
  if (params.typeFilter && params.typeFilter !== 'all') q.set('product_type', params.typeFilter);
  if (params.categoryId) q.set('category_id', String(params.categoryId));
  if (params.search.trim()) q.set('search', params.search.trim());
  const sortMap: Record<string, string> = {
    newest: 'newest',
    popular: 'popular',
    price_asc: 'price_asc',
    price_desc: 'price_desc',
  };
  q.set('sort', sortMap[params.sortBy] || 'newest');
  return apiRequest<Product[]>(`/api/products/marketplace?${q.toString()}`);
}

export async function fetchProfileById(id: string): Promise<Profile> {
  const raw = await apiRequest<Record<string, unknown>>(`/api/profiles/${id}`);
  return normalizeProfile(raw);
}

export async function fetchSellerPublishedProducts(sellerId: string): Promise<Product[]> {
  return apiRequest<Product[]>(`/api/seller/${sellerId}/products`);
}

export async function updateMyProfile(body: Record<string, unknown>): Promise<void> {
  await apiRequest('/api/profiles/me', { method: 'PATCH', body: JSON.stringify(body) });
}

export async function fetchSellerProducts(): Promise<Product[]> {
  return apiRequest<Product[]>('/api/seller/products');
}

export async function fetchSellerSales(params?: {
  date_from?: string;
  date_to?: string;
}): Promise<
  Array<{
    id: number;
    unit_price_cents: number;
    commission_cents: number;
    seller_revenue_cents: number;
    created_at: string;
    orders: { buyer_id: string; status: string; created_at: string };
    products: { title: string };
  }>
> {
  const q = new URLSearchParams();
  if (params?.date_from) q.set('date_from', params.date_from);
  if (params?.date_to) q.set('date_to', params.date_to);
  const qs = q.toString();
  return apiRequest(`/api/seller/sales${qs ? `?${qs}` : ''}`);
}

export async function deleteSellerProduct(id: number): Promise<void> {
  await apiRequest(`/api/seller/products/${id}`, { method: 'DELETE' });
}

export type SellerReviewRow = {
  id: number;
  rating: number;
  comment: string | null;
  created_at: string;
  products: { id: number; title: string };
  profiles: { display_name: string; avatar_url: string | null };
};

export async function fetchSellerReviews(): Promise<SellerReviewRow[]> {
  return apiRequest<SellerReviewRow[]>('/api/seller/reviews');
}

export async function deleteSellerReview(id: number): Promise<void> {
  await apiRequest(`/api/seller/reviews/${id}`, { method: 'DELETE' });
}

export async function fetchBuyerOrders(params?: {
  date_from?: string;
  date_to?: string;
}): Promise<unknown[]> {
  const q = new URLSearchParams();
  if (params?.date_from) q.set('date_from', params.date_from);
  if (params?.date_to) q.set('date_to', params.date_to);
  const qs = q.toString();
  return apiRequest(`/api/buyer/orders${qs ? `?${qs}` : ''}`);
}

export async function fetchSellerProduct(id: number): Promise<Product> {
  const raw = await apiRequest<Record<string, unknown>>(`/api/seller/products/${id}`);
  return raw as unknown as Product;
}

export async function fetchProductFiles(productId: number): Promise<ProductFile[]> {
  return apiRequest<ProductFile[]>(`/api/seller/products/${productId}/files`);
}

export async function createProduct(body: Record<string, unknown>): Promise<{ id: number }> {
  return apiRequest<{ id: number }>('/api/seller/products', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function updateProduct(id: number, body: Record<string, unknown>): Promise<void> {
  await apiRequest(`/api/seller/products/${id}`, { method: 'PATCH', body: JSON.stringify(body) });
}

export async function deleteProductFile(fileId: number): Promise<void> {
  await apiRequest(`/api/seller/product-files/${fileId}`, { method: 'DELETE' });
}

export async function batchInsertProductFiles(
  productId: number,
  files: Array<{
    file_url: string;
    file_name: string;
    file_type: string;
    file_size_bytes: number;
    sort_order: number;
  }>
): Promise<void> {
  await apiRequest('/api/seller/product-files', {
    method: 'POST',
    body: JSON.stringify({ product_id: productId, files }),
  });
}

export async function uploadFile(
  bucket: string,
  _path: string,
  file: File
): Promise<{ url: string; error: string | null }> {
  const form = new FormData();
  form.append('file', file);
  const token = getToken();
  const path = `/api/upload?bucket=${encodeURIComponent(bucket)}`;
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: form,
  });
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { error?: string };
    return { url: '', error: err.error || 'Error al subir' };
  }
  const data = (await res.json()) as { url: string };
  return { url: data.url, error: null };
}

export function getPublicUrl(bucket: string, filePath: string): string {
  const base = API_BASE || '';
  return `${base}/uploads/${bucket}/${filePath}`;
}

/** Admin */
export async function fetchAdminDashboardStats(): Promise<{
  profiles: Array<{ role: string }>;
  products: Array<{ status: string; price_cents: number }>;
  orders: Array<{ total_cents: number; status: string }>;
  totalReviews: number;
}> {
  return apiRequest('/api/admin/dashboard-stats');
}

export async function fetchAdminProducts(): Promise<Product[]> {
  return apiRequest<Product[]>('/api/admin/products');
}

export async function fetchAdminUsers(): Promise<Profile[]> {
  const rows = await apiRequest<Record<string, unknown>[]>('/api/admin/users');
  return rows.map(normalizeProfile);
}

export async function adminUpdateProduct(id: number, body: Record<string, unknown>): Promise<void> {
  await apiRequest(`/api/seller/products/${id}`, { method: 'PATCH', body: JSON.stringify(body) });
}

export async function adminDeleteProduct(id: number): Promise<void> {
  await apiRequest(`/api/seller/products/${id}`, { method: 'DELETE' });
}

export async function adminUpdateProfile(userId: string, body: Record<string, unknown>): Promise<void> {
  await apiRequest(`/api/admin/profiles/${userId}`, { method: 'PATCH', body: JSON.stringify(body) });
}

export type PlatformSettings = {
  default_commission_percent: number;
  social_twitter: string;
  social_instagram: string;
  social_facebook: string;
  social_youtube: string;
};

/** Configuración de plataforma (admin). Incluye comisión global y URLs de redes. */
export async function fetchAdminPlatformSettings(): Promise<PlatformSettings> {
  return apiRequest('/api/admin/platform-settings');
}

export async function patchAdminPlatformSettings(
  body: Partial<{
    default_commission_percent: number;
    social_twitter: string;
    social_instagram: string;
    social_facebook: string;
    social_youtube: string;
  }>
): Promise<PlatformSettings & { ok?: boolean }> {
  return apiRequest('/api/admin/platform-settings', {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
}

/** Enlaces de redes para el pie de página (público, sin token). */
export async function fetchPublicSocialLinks(): Promise<{
  twitter: string;
  instagram: string;
  facebook: string;
  youtube: string;
}> {
  return apiRequest('/api/site/social');
}

export async function fetchAdminCommissionSummary(): Promise<{
  platform_commission_cents: number;
  sellers_revenue_cents: number;
  paid_order_count: number;
}> {
  return apiRequest('/api/admin/commission-summary');
}

export async function fetchAdminUserDetail(userId: string): Promise<Profile & { effective_commission_percent: number }> {
  const raw = await apiRequest<Record<string, unknown>>(`/api/admin/users/${userId}`);
  return normalizeProfile(raw) as Profile & { effective_commission_percent: number };
}

export type AdminSellerSaleLine = {
  id: number;
  order_id: number;
  product_id: number;
  unit_price_cents: number;
  commission_rate: number;
  commission_cents: number;
  seller_revenue_cents: number;
  product_title: string;
  buyer_email: string;
  buyer_name: string;
  order_created_at: string;
};

export async function fetchAdminSellerSales(sellerId: string): Promise<AdminSellerSaleLine[]> {
  return apiRequest(`/api/admin/sellers/${sellerId}/sales`);
}

export async function fetchAdminReviews(): Promise<
  Array<{
    id: number;
    rating: number;
    comment: string | null;
    created_at: string;
    products: { id: number; title: string };
    profiles: { display_name: string; avatar_url: string | null };
  }>
> {
  return apiRequest('/api/admin/reviews');
}

export async function adminDeleteReview(id: number): Promise<void> {
  await apiRequest(`/api/admin/reviews/${id}`, { method: 'DELETE' });
}

export async function adminCreateCategory(body: Record<string, unknown>): Promise<void> {
  await apiRequest('/api/admin/categories', { method: 'POST', body: JSON.stringify(body) });
}

export async function adminUpdateCategory(id: number, body: Record<string, unknown>): Promise<void> {
  await apiRequest(`/api/admin/categories/${id}`, { method: 'PATCH', body: JSON.stringify(body) });
}

export async function adminDeleteCategory(id: number): Promise<void> {
  await apiRequest(`/api/admin/categories/${id}`, { method: 'DELETE' });
}

export async function getVapidPublicKey(): Promise<string> {
  const { publicKey } = await apiRequest<{ publicKey: string }>('/api/push/vapid-public-key');
  return publicKey;
}

export async function subscribePush(sub: PushSubscriptionJSON): Promise<void> {
  await apiRequest('/api/push/subscribe', {
    method: 'POST',
    body: JSON.stringify(sub),
  });
}

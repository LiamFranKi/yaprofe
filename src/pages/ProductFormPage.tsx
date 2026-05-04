import { useState, useEffect, useMemo, useCallback } from 'react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { ArrowLeft, Save, Loader2 } from 'lucide-react';
import { useLang } from '../context/LangContext';
import { useAuth } from '../context/AuthContext';
import {
  batchInsertProductFiles,
  createProduct,
  deleteProductFile,
  fetchCategories,
  fetchProductFiles,
  fetchSellerProduct,
  updateProduct,
  uploadFile,
  type Category,
  type ProductFile,
} from '../lib/api';
import { FileUpload, UploadedFile } from '../components/FileUpload';
import type { NavParams } from '../App';

function centsToSolesInput(cents: number): string {
  if (cents <= 0) return '';
  const v = cents / 100;
  if (Number.isInteger(v)) return String(v);
  return String(v);
}

function parseSolesToCents(raw: string): number {
  const t = raw.trim().replace(',', '.');
  if (!t) return 0;
  const n = parseFloat(t);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.round(n * 100);
}

interface ProductFormPageProps {
  onNavigate: (page: string, params?: NavParams) => void;
  productId?: number;
}

export default function ProductFormPage({ onNavigate, productId }: ProductFormPageProps) {
  const { lang } = useLang();
  const { user } = useAuth();
  const isEditing = !!productId;

  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(() => !!productId);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [form, setForm] = useState({
    title: '',
    short_description: '',
    description: '',
    product_type: 'resource' as string,
    category_id: '' as string,
    /** Precio en soles (ej. 20 = S/ 20.00); se convierte a centavos al guardar. */
    price_soles: '',
    original_price_soles: '',
    cover_url: '',
    tags: '',
    status: 'draft' as string,
  });

  const quillModules = useMemo(
    () => ({
      toolbar: [
        [{ header: [1, 2, 3, false] }],
        ['bold', 'italic', 'underline', 'strike'],
        [{ list: 'ordered' }, { list: 'bullet' }],
        [{ indent: '-1' }, { indent: '+1' }],
        ['link'],
        ['clean'],
      ],
    }),
    []
  );

  const onDescriptionChange = useCallback((v: string) => {
    setForm(prev => ({ ...prev, description: v }));
  }, []);

  const [productFiles, setProductFiles] = useState<UploadedFile[]>([]);
  const [removedFileIds, setRemovedFileIds] = useState<number[]>([]);
  /** Evita error de reconciliación DOM de React con react-quill al hidratar tras cargar datos. */
  const [descEditorReady, setDescEditorReady] = useState(false);

  useEffect(() => {
    fetchCategories().then(setCategories).catch(() => setCategories([]));
  }, []);

  useEffect(() => {
    if (loading) {
      setDescEditorReady(false);
      return;
    }
    const id = requestAnimationFrame(() => setDescEditorReady(true));
    return () => {
      cancelAnimationFrame(id);
      setDescEditorReady(false);
    };
  }, [loading, productId]);

  useEffect(() => {
    if (!productId) {
      setLoading(false);
      return;
    }
    if (!user) {
      setLoading(false);
      return;
    }
    setLoading(true);

    const fetchProduct = async () => {
      try {
        const [prod, filesRes] = await Promise.all([
          fetchSellerProduct(productId),
          fetchProductFiles(productId),
        ]);

        setForm({
          title: prod.title,
          short_description: prod.short_description || '',
          description: prod.description || '',
          product_type: prod.product_type,
          category_id: prod.category_id?.toString() || '',
          price_soles: centsToSolesInput(prod.price_cents),
          original_price_soles:
            prod.original_price_cents != null ? centsToSolesInput(prod.original_price_cents) : '',
          cover_url: prod.cover_url || '',
          tags: prod.tags?.join(', ') || '',
          status: prod.status,
        });

        setProductFiles(
          filesRes.map((f: ProductFile) => ({
            url: f.file_url,
            name: f.file_name,
            type: f.file_type,
            size: f.file_size_bytes,
            dbId: f.id,
          }))
        );
      } catch {
        setError(lang === 'es' ? 'No se pudo cargar el recurso' : 'Could not load resource');
      }

      setLoading(false);
    };

    fetchProduct();
  }, [productId, user, lang]);

  const generateSlug = (title: string) =>
    title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') + '-' + Date.now().toString(36);

  const handleCoverUpload = async (file: File): Promise<string | null> => {
    if (!user) return null;
    const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    const filePath = `${user.id}/${Date.now()}-cover.${ext}`;
    const { url, error: upErr } = await uploadFile('product-covers', filePath, file);
    if (upErr) return null;
    setForm(prev => ({ ...prev, cover_url: url }));
    return url;
  };

  const handleProductFileUpload = async (file: File): Promise<UploadedFile | null> => {
    if (!user) return null;
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const filePath = `${user.id}/${Date.now()}-${safeName}`;
    const { url, error: upErr } = await uploadFile('product-files', filePath, file);
    if (upErr) return null;
    const uploaded: UploadedFile = { url, name: file.name, type: file.type, size: file.size };
    setProductFiles(prev => [...prev, uploaded]);
    return uploaded;
  };

  const handleRemoveFile = (index: number) => {
    const f = productFiles[index];
    if (f?.dbId != null) {
      setRemovedFileIds(prev => [...prev, f.dbId!]);
    }
    setProductFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    setError('');
    setSuccess('');

    const priceCents = parseSolesToCents(form.price_soles);
    const origPrice = form.original_price_soles.trim() ? parseSolesToCents(form.original_price_soles) : null;
    const tagsArray = form.tags.split(',').map(t => t.trim()).filter(Boolean);

    const productData: Record<string, unknown> = {
      seller_id: user.id,
      title: form.title,
      short_description: form.short_description || null,
      description: form.description || null,
      product_type: form.product_type,
      category_id: form.category_id ? Number(form.category_id) : null,
      price_cents: priceCents,
      original_price_cents: origPrice,
      cover_url: form.cover_url || null,
      tags: tagsArray,
      status: form.status,
    };

    let savedProductId = productId;

    try {
      if (isEditing) {
        await updateProduct(productId!, productData);
      } else {
        productData.slug = generateSlug(form.title);
        const inserted = await createProduct(productData);
        savedProductId = inserted.id;
      }

      if (removedFileIds.length > 0) {
        for (const fid of removedFileIds) {
          await deleteProductFile(fid);
        }
      }

      const newFiles = productFiles.filter(f => f.dbId == null);
      if (newFiles.length > 0 && savedProductId) {
        const baseOrder = productFiles.filter(f => f.dbId != null).length;
        await batchInsertProductFiles(
          savedProductId,
          newFiles.map((f, i) => ({
            file_url: f.url,
            file_name: f.name,
            file_type: f.type,
            file_size_bytes: f.size,
            sort_order: baseOrder + i,
          }))
        );
      }

      setSuccess(
        isEditing
          ? lang === 'es'
            ? 'Recurso actualizado'
            : 'Resource updated'
          : lang === 'es'
            ? 'Recurso creado'
            : 'Resource created'
      );

      if (!isEditing) {
        setTimeout(() => onNavigate('dashboard'), 1000);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error');
    }

    setSaving(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 pt-16 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 pt-16">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <button
          onClick={() => onNavigate('dashboard')}
          className="inline-flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          {lang === 'es' ? 'Volver al panel' : 'Back to dashboard'}
        </button>

        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 sm:p-8">
          <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white mb-6">
            {isEditing ? (lang === 'es' ? 'Editar recurso' : 'Edit resource') : lang === 'es' ? 'Nuevo recurso' : 'New resource'}
          </h1>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {lang === 'es' ? 'Titulo' : 'Title'} *
              </label>
              <input
                type="text"
                required
                value={form.title}
                onChange={e => setForm({ ...form, title: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder={lang === 'es' ? 'Ej: Guia de Algebra Lineal' : 'e.g. Linear Algebra Guide'}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {lang === 'es' ? 'Descripcion corta' : 'Short description'}
              </label>
              <input
                type="text"
                value={form.short_description}
                onChange={e => setForm({ ...form, short_description: e.target.value })}
                maxLength={150}
                className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder={lang === 'es' ? 'Breve descripcion para la tarjeta' : 'Short card description'}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {lang === 'es' ? 'Descripcion completa' : 'Full description'}
              </label>
              <div className="rich-text rounded-xl border border-gray-300 dark:border-gray-700 overflow-hidden bg-white dark:bg-gray-900">
                {descEditorReady && (
                  <ReactQuill
                    key={productId ?? 'new'}
                    theme="snow"
                    value={form.description}
                    onChange={onDescriptionChange}
                    modules={quillModules}
                    className="[&_.ql-editor]:min-h-[200px] [&_.ql-container]:border-0"
                    placeholder={lang === 'es' ? 'Texto con formato, listas, enlaces…' : 'Formatted text, lists, links…'}
                  />
                )}
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {lang === 'es' ? 'Tipo de recurso' : 'Resource type'} *
                </label>
                <select
                  required
                  value={form.product_type}
                  onChange={e => setForm({ ...form, product_type: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="resource">{lang === 'es' ? 'Recurso' : 'Resource'}</option>
                  <option value="course">{lang === 'es' ? 'Curso' : 'Course'}</option>
                  <option value="template">{lang === 'es' ? 'Plantilla' : 'Template'}</option>
                  <option value="ebook">Ebook</option>
                  <option value="bundle">
                    {lang === 'es' ? 'Paquete (varios archivos en una compra)' : 'Bundle (multiple files, one purchase)'}
                  </option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {lang === 'es' ? 'Categoria' : 'Category'}
                </label>
                <select
                  value={form.category_id}
                  onChange={e => setForm({ ...form, category_id: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">{lang === 'es' ? 'Sin categoria' : 'No category'}</option>
                  {categories.map(c => (
                    <option key={c.id} value={c.id}>
                      {lang === 'es' ? c.name_es : c.name_en}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {lang === 'es' ? 'Precio (soles PEN)' : 'Price (PEN soles)'} *
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm">S/</span>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={form.price_soles}
                    onChange={e => setForm({ ...form, price_soles: e.target.value })}
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="0"
                  />
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  {lang === 'es' ? 'Escribe el monto en soles: 20 = S/ 20.00. 0 = gratis.' : 'Amount in soles: 20 = S/ 20.00. 0 = free.'}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {lang === 'es' ? 'Precio original en soles (opcional)' : 'Original price in soles (optional)'}
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm">S/</span>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={form.original_price_soles}
                    onChange={e => setForm({ ...form, original_price_soles: e.target.value })}
                    placeholder={lang === 'es' ? 'Para mostrar descuento' : 'For discount display'}
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            <FileUpload
              label={lang === 'es' ? 'Imagen de portada' : 'Cover image'}
              accept="image/jpeg,image/png,image/webp"
              currentUrl={form.cover_url || null}
              onUpload={handleCoverUpload}
              onRemove={() => setForm(prev => ({ ...prev, cover_url: '' }))}
              preview="image"
              previewClass="h-44"
              hint={lang === 'es' ? 'JPG, PNG o WebP. Max 5MB.' : 'JPG, PNG or WebP. Max 5MB.'}
            />

            <FileUpload
              label={lang === 'es' ? 'Archivos del producto' : 'Product files'}
              accept="image/*,video/mp4,video/webm,application/pdf,.docx,.xlsx,.pptx,.zip"
              files={productFiles}
              onUpload={handleProductFileUpload}
              onRemove={handleRemoveFile}
              multiple={true}
              maxFiles={15}
              hint={
                lang === 'es'
                  ? 'Imagenes, videos (MP4/WebM), PDFs, Word, Excel, PowerPoint, ZIP. Max 50MB por archivo.'
                  : 'Images, videos (MP4/WebM), PDFs, Word, Excel, PowerPoint, ZIP. Max 50MB per file.'
              }
            />

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {lang === 'es' ? 'Etiquetas (separadas por coma)' : 'Tags (comma separated)'}
              </label>
              <input
                type="text"
                value={form.tags}
                onChange={e => setForm({ ...form, tags: e.target.value })}
                placeholder={lang === 'es' ? 'algebra, secundaria, fichas' : 'algebra, high school, worksheets'}
                className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {lang === 'es' ? 'Estado' : 'Status'}
              </label>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { value: 'draft', label: lang === 'es' ? 'Borrador' : 'Draft' },
                  { value: 'pending_review', label: lang === 'es' ? 'Enviar a revision' : 'Submit for review' },
                ].map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setForm({ ...form, status: opt.value })}
                    className={`py-3 px-4 rounded-xl border-2 text-sm font-medium transition-all ${
                      form.status === opt.value
                        ? 'border-blue-600 bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300'
                        : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-300'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {error && (
              <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-400 text-sm px-4 py-3 rounded-xl">
                {error}
              </div>
            )}
            {success && (
              <div className="bg-emerald-50 dark:bg-emerald-950 border border-emerald-200 dark:border-emerald-900 text-emerald-700 dark:text-emerald-400 text-sm px-4 py-3 rounded-xl">
                {success}
              </div>
            )}

            <div className="flex items-center gap-4 pt-2">
              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold rounded-xl transition-colors"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {isEditing ? (lang === 'es' ? 'Guardar cambios' : 'Save changes') : lang === 'es' ? 'Crear recurso' : 'Create resource'}
              </button>
              <button
                type="button"
                onClick={() => onNavigate('dashboard')}
                className="px-6 py-3 text-gray-600 dark:text-gray-400 font-medium hover:text-gray-900 dark:hover:text-white transition-colors"
              >
                {lang === 'es' ? 'Cancelar' : 'Cancel'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

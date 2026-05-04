import { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, Save, X, Loader2, GripVertical } from 'lucide-react';
import { adminCreateCategory, adminDeleteCategory, adminUpdateCategory, fetchCategories, type Category } from '../../lib/api';
import { useConfirm } from '../../context/ConfirmContext';

export default function AdminCategories({ lang }: { lang: string }) {
  const confirm = useConfirm();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [editId, setEditId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [showNew, setShowNew] = useState(false);

  const emptyForm = { name_es: '', name_en: '', slug: '', icon: '', sort_order: 0 };
  const [form, setForm] = useState(emptyForm);

  const fetchCategoryList = async () => {
    setLoading(true);
    try {
      const data = await fetchCategories();
      setCategories(data);
    } catch {
      setCategories([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchCategoryList();
  }, []);

  const generateSlug = (name: string) =>
    name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

  const handleStartEdit = (cat: Category) => {
    setEditId(cat.id);
    setForm({
      name_es: cat.name_es,
      name_en: cat.name_en,
      slug: cat.slug,
      icon: cat.icon || '',
      sort_order: cat.sort_order,
    });
    setShowNew(false);
  };

  const handleSaveEdit = async () => {
    if (!editId || !form.name_es) return;
    setSaving(true);
    try {
      await adminUpdateCategory(editId, {
        name_es: form.name_es,
        name_en: form.name_en,
        slug: form.slug || generateSlug(form.name_es),
        icon: form.icon || null,
        sort_order: form.sort_order,
      });
      setEditId(null);
      setForm(emptyForm);
      await fetchCategoryList();
    } catch {
      /* ignore */
    }
    setSaving(false);
  };

  const handleCreate = async () => {
    if (!form.name_es) return;
    setSaving(true);
    try {
      await adminCreateCategory({
        name_es: form.name_es,
        name_en: form.name_en || form.name_es,
        slug: form.slug || generateSlug(form.name_es),
        icon: form.icon || null,
        sort_order: form.sort_order || categories.length + 1,
      });
      setShowNew(false);
      setForm(emptyForm);
      await fetchCategoryList();
    } catch {
      /* ignore */
    }
    setSaving(false);
  };

  const handleDelete = async (id: number) => {
    const ok = await confirm({
      message:
        lang === 'es'
          ? '¿Eliminar esta categoría? Los productos asociados perderán su categoría.'
          : 'Delete this category? Related products will lose their category.',
      variant: 'danger',
    });
    if (!ok) return;
    try {
      await adminDeleteCategory(id);
      setCategories(prev => prev.filter(c => c.id !== id));
    } catch {
      /* ignore */
    }
  };

  const handleCancel = () => {
    setEditId(null);
    setShowNew(false);
    setForm(emptyForm);
  };

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
        <h2 className="font-bold text-gray-900 dark:text-white">
          {lang === 'es' ? 'Categorias' : 'Categories'} ({categories.length})
        </h2>
        {!showNew && !editId && (
          <button
            onClick={() => {
              setShowNew(true);
              setEditId(null);
              setForm({ ...emptyForm, sort_order: categories.length + 1 });
            }}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            {lang === 'es' ? 'Nueva categoria' : 'New category'}
          </button>
        )}
      </div>

      {showNew && (
        <div className="px-6 py-4 bg-blue-50 dark:bg-blue-950 border-b border-blue-200 dark:border-blue-900">
          <h3 className="text-sm font-semibold text-blue-800 dark:text-blue-200 mb-3">{lang === 'es' ? 'Crear categoria' : 'Create category'}</h3>
          <CategoryForm form={form} setForm={setForm} lang={lang} saving={saving} onSave={handleCreate} onCancel={handleCancel} />
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
        </div>
      ) : categories.length === 0 ? (
        <div className="text-center py-16 text-gray-500">{lang === 'es' ? 'Sin categorias' : 'No categories'}</div>
      ) : (
        <div className="divide-y divide-gray-50 dark:divide-gray-800">
          {categories.map(cat => (
            <div key={cat.id}>
              {editId === cat.id ? (
                <div className="px-6 py-4 bg-amber-50 dark:bg-amber-950">
                  <CategoryForm form={form} setForm={setForm} lang={lang} saving={saving} onSave={handleSaveEdit} onCancel={handleCancel} />
                </div>
              ) : (
                <div className="px-6 py-3.5 flex items-center gap-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                  <GripVertical className="w-4 h-4 text-gray-300 dark:text-gray-600 flex-shrink-0" />
                  <div className="w-8 text-center text-xs text-gray-400 font-mono flex-shrink-0">{cat.sort_order}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{cat.name_es}</p>
                    <p className="text-xs text-gray-400">
                      {cat.name_en} · /{cat.slug}
                      {cat.icon ? ` · ${cat.icon}` : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <button
                      onClick={() => handleStartEdit(cat)}
                      className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950 rounded-lg transition-colors"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(cat.id)}
                      className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function CategoryForm({
  form,
  setForm,
  lang,
  saving,
  onSave,
  onCancel,
}: {
  form: { name_es: string; name_en: string; slug: string; icon: string; sort_order: number };
  setForm: (f: typeof form) => void;
  lang: string;
  saving: boolean;
  onSave: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="space-y-3">
      <div className="grid sm:grid-cols-2 gap-3">
        <input
          type="text"
          value={form.name_es}
          onChange={e => setForm({ ...form, name_es: e.target.value })}
          placeholder={lang === 'es' ? 'Nombre (espanol) *' : 'Name (Spanish) *'}
          className="px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <input
          type="text"
          value={form.name_en}
          onChange={e => setForm({ ...form, name_en: e.target.value })}
          placeholder={lang === 'es' ? 'Nombre (ingles)' : 'Name (English)'}
          className="px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      <div className="grid sm:grid-cols-3 gap-3">
        <input
          type="text"
          value={form.slug}
          onChange={e => setForm({ ...form, slug: e.target.value })}
          placeholder="slug"
          className="px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <input
          type="text"
          value={form.icon}
          onChange={e => setForm({ ...form, icon: e.target.value })}
          placeholder={lang === 'es' ? 'Icono lucide' : 'Lucide icon'}
          className="px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <input
          type="number"
          value={form.sort_order}
          onChange={e => setForm({ ...form, sort_order: Number(e.target.value) })}
          placeholder={lang === 'es' ? 'Orden' : 'Order'}
          className="px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      <div className="flex items-center gap-2 pt-1">
        <button
          onClick={onSave}
          disabled={saving || !form.name_es}
          className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-sm font-semibold rounded-lg transition-colors"
        >
          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
          {lang === 'es' ? 'Guardar' : 'Save'}
        </button>
        <button onClick={onCancel} className="flex items-center gap-1.5 px-4 py-2 text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors">
          <X className="w-3.5 h-3.5" />
          {lang === 'es' ? 'Cancelar' : 'Cancel'}
        </button>
      </div>
    </div>
  );
}

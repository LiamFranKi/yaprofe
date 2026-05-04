/** Etiquetas legibles para `products.product_type` (evita mostrar "bundle" crudo). */
export function getProductTypeLabel(type: string, lang: string): string {
  const map: Record<string, { es: string; en: string }> = {
    course: { es: 'Curso', en: 'Course' },
    resource: { es: 'Recurso', en: 'Resource' },
    template: { es: 'Plantilla', en: 'Template' },
    ebook: { es: 'E-book', en: 'E-book' },
    bundle: { es: 'Paquete', en: 'Bundle' },
  };
  const m = map[type] ?? { es: type, en: type };
  return lang === 'es' ? m.es : m.en;
}

/** Texto auxiliar (tooltip / ayuda) para tipos poco obvios. */
export function getProductTypeHint(type: string, lang: string): string | null {
  if (type === 'bundle') {
    return lang === 'es'
      ? 'Varios archivos o materiales reunidos en una sola compra.'
      : 'Multiple files or materials sold as one purchase.';
  }
  if (type === 'course') {
    return lang === 'es'
      ? 'Por ahora el acceso es por descarga de archivos; aula en línea puede añadirse más adelante.'
      : 'Access is currently via downloadable files; online classroom may be added later.';
  }
  return null;
}

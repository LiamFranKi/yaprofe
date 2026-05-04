import DOMPurify from 'isomorphic-dompurify';

/** Misma política que `src/components/SafeHtml.tsx` — mantener alineadas. */
const OPTIONS = {
  USE_PROFILES: { html: true },
  ADD_ATTR: ['target'],
} as const;

/** Sanitiza HTML de descripción de producto antes de guardarlo en BD. */
export function sanitizeProductDescription(input: unknown): string | null {
  if (input == null) return null;
  const s = String(input);
  const trimmed = s.trim();
  if (trimmed === '') return null;
  return DOMPurify.sanitize(s, OPTIONS);
}

import DOMPurify from 'isomorphic-dompurify';

type SafeHtmlProps = {
  html: string;
  className?: string;
};

/** HTML de descripciones de producto; reduce riesgo XSS al mostrar contenido del editor. */
export default function SafeHtml({ html, className }: SafeHtmlProps) {
  const clean = DOMPurify.sanitize(html, {
    USE_PROFILES: { html: true },
    ADD_ATTR: ['target'],
  });
  return <div className={className} dangerouslySetInnerHTML={{ __html: clean }} />;
}

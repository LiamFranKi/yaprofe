interface YaProFeLogoProps {
  height?: number;
  variant?: 'color' | 'white';
  className?: string;
}

/** Archivo: `public/logoyaprofe.png` → URL `/logoyaprofe.png` (mismo origen que Vite; no viene del servidor Node). */
const LOGO_SRC = `${import.meta.env.BASE_URL.replace(/\/$/, '')}/logoyaprofe.png`;

export default function YaProFeLogo({ height = 44, variant = 'color', className = '' }: YaProFeLogoProps) {
  return (
    <img
      src={LOGO_SRC}
      alt="YaProfe.com"
      height={height}
      style={{ height: `${height}px`, width: 'auto', display: 'block', filter: variant === 'white' ? 'brightness(0) invert(1)' : 'none' }}
      className={className}
    />
  );
}

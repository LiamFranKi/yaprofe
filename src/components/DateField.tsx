import { useRef } from 'react';

type DateFieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  className?: string;
};

/**
 * Campo fecha con icono de calendario visible en modo oscuro y apertura del selector al pulsar el bloque.
 */
export default function DateField({ label, value, onChange, className = '' }: DateFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const openPicker = () => {
    const el = inputRef.current;
    if (!el) return;
    const extended = el as HTMLInputElement & { showPicker?: () => void };
    if (typeof extended.showPicker === 'function') {
      try {
        extended.showPicker();
        return;
      } catch {
        /* algunos navegadores lanzan si no es gesto del usuario */
      }
    }
    el.click();
  };

  return (
    <div
      className={`rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 cursor-pointer select-none ${className}`}
      onClick={openPicker}
      onKeyDown={e => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          openPicker();
        }
      }}
      role="button"
      tabIndex={0}
    >
      <span className="block text-xs text-gray-500 dark:text-gray-400 mb-1 pointer-events-none">{label}</span>
      <input
        ref={inputRef}
        type="date"
        value={value}
        onChange={e => onChange(e.target.value)}
        onClick={e => e.stopPropagation()}
        className="date-input-themed w-full min-w-[10.5rem] bg-transparent text-sm text-gray-900 dark:text-white outline-none cursor-pointer"
      />
    </div>
  );
}

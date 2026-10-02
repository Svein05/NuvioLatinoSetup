import type { SelectHTMLAttributes } from 'react';
import { CLASES_ETIQUETA } from './Field';

type Props = SelectHTMLAttributes<HTMLSelectElement> & { id: string; label: string };

// `appearance-none` quita el control del sistema y deja la cápsula del diseño,
// pero NO el desplegable: ese lo sigue abriendo el navegador, que en móvil es
// el selector nativo del sistema. Ningún listbox propio lo iguala en
// accesibilidad, y este no cuesta JS.
//
// El hueco de la derecha (pr-11) es para la flecha: sin él el texto de una
// opción larga se le mete debajo.
const CLASES =
  'w-full cursor-pointer appearance-none truncate rounded-[var(--radius-capsule)] ' +
  'py-3 pl-5 pr-11 text-sm text-[var(--color-ink)] ' +
  'border border-[var(--color-hairline)] bg-[var(--color-glass)] shadow-[var(--brillo-vidrio)] ' +
  'bg-[image:var(--flecha)] bg-[position:right_18px_center] bg-no-repeat ' +
  'transition-colors hover:border-[var(--color-hairline-strong)] hover:bg-[var(--color-glass-strong)] ' +
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-ink)]';

export function Select({ id, label, className = '', children, ...rest }: Props) {
  return (
    <div className={`flex min-w-0 flex-col gap-2 ${className}`}>
      <label htmlFor={id} className={CLASES_ETIQUETA}>
        {label}
      </label>
      <select id={id} className={CLASES} {...rest}>
        {children}
      </select>
    </div>
  );
}

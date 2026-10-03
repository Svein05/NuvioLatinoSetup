import type { ButtonHTMLAttributes, ReactNode } from 'react';

export type CapsuleVariant = 'solid' | 'glass';
export type CapsuleSize = 'md' | 'lg';

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  variant?: CapsuleVariant;
  size?: CapsuleSize;
};

// El foco se marca con un anillo claro: sobre fondo casi negro el outline por
// defecto del navegador es invisible.
const BASE =
  'inline-flex items-center justify-center gap-2 rounded-[var(--radius-capsule)] ' +
  'font-medium transition-colors ' +
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-ink)] ' +
  'disabled:opacity-50 disabled:pointer-events-none';

const VARIANTS = {
  solid: 'bg-[var(--color-ink)] text-[var(--color-bg)] hover:bg-[var(--color-ink)]/90',
  glass:
    'bg-[var(--color-glass-strong)] text-[var(--color-ink)] ' +
    'border border-[var(--color-hairline-strong)] ' +
    'backdrop-blur-[var(--blur-glass)] backdrop-saturate-[180%] backdrop-brightness-90 hover:bg-[var(--color-ink)]/15 ' +
    'shadow-[var(--brillo-vidrio)]',
} as const;

// El tamaño se resuelve aquí, no desde className: dos utilidades de padding
// tienen la misma especificidad y decide el orden de la hoja, no el de la cadena.
const SIZES = {
  md: 'px-6 py-3 text-sm',
  lg: 'px-6 py-[17px] text-[15.5px]',
} as const;

// Mismas clases que <CapsuleButton>, para elementos que no pueden ser un
// <button> (p. ej. los <Link> de Paginacion.tsx, que deben ser <a> de verdad).
export function capsuleClasses(variant: CapsuleVariant = 'glass', size: CapsuleSize = 'md') {
  return `${BASE} ${SIZES[size]} ${VARIANTS[variant]}`;
}

export function CapsuleButton({ children, variant = 'glass', size = 'md', className = '', ...rest }: Props) {
  return (
    <button type="button" className={`${capsuleClasses(variant, size)} ${className}`} {...rest}>
      {children}
    </button>
  );
}

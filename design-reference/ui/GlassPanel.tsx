import type { ComponentPropsWithoutRef, ElementType, ReactNode } from 'react';

export type GlassVariant = 'glass' | 'glass-strong';

// Las variantes se eligen aquí en vez de sobrescribirse desde className: dos
// utilidades de la misma propiedad (dos `backdrop-blur-[…]`, dos `border-…`)
// tienen la misma especificidad y gana la que Tailwind emita más tarde en la
// hoja, no la que se escriba después en la cadena de clases.
const VARIANTS = {
  glass: 'bg-[var(--color-glass)] border-[var(--color-hairline)] backdrop-blur-[var(--blur-glass)]',
  'glass-strong':
    'bg-[var(--color-glass)] border-[var(--color-hairline-strong)] backdrop-blur-[var(--blur-glass-2xl)]',
} as const;

type Props<T extends ElementType> = {
  children: ReactNode;
  className?: string;
  variant?: GlassVariant;
  as?: T;
} & Omit<ComponentPropsWithoutRef<T>, 'children' | 'className' | 'as'>;

export function GlassPanel<T extends ElementType = 'div'>({
  children, className = '', variant = 'glass', as, ...rest
}: Props<T>) {
  const Tag = as || 'div';
  return (
    <Tag
      className={
        'rounded-[var(--radius-card)] backdrop-saturate-[180%] backdrop-brightness-90 border ' +
        'shadow-[var(--shadow-lift)] ' +
        VARIANTS[variant] + ' ' +
        className
      }
      {...rest}
    >
      {children}
    </Tag>
  );
}

import type { InputHTMLAttributes, ReactNode } from 'react';

export type FieldShape = 'capsule' | 'soft';

// Compartidos con <Select>, que es el hermano de este control: si la etiqueta
// o la cápsula se tocan aquí, los dos se mueven juntos.
export const CLASES_ETIQUETA =
  'text-[11px] uppercase tracking-[0.08em] text-[var(--color-ink-muted)]';

export const SHAPES = {
  capsule: 'rounded-[var(--radius-capsule)] px-5 py-3 text-sm border-[var(--color-hairline)]',
  soft: 'rounded-[var(--radius-field)] px-[18px] py-[15px] text-[15px] border-[var(--color-hairline-strong)]',
} as const;

type Props = InputHTMLAttributes<HTMLInputElement> & {
  id: string;
  label: string;
  shape?: FieldShape;
  trailing?: ReactNode;
};

export function Field({ id, label, shape = 'capsule', trailing, className = '', ...rest }: Props) {
  const input = (
    <input
      id={id}
      className={
        'bg-[var(--color-glass)] text-[var(--color-ink)] border shadow-[var(--brillo-vidrio)] ' +
        'placeholder:text-[var(--color-ink-faint)] ' +
        // Mismo par que <Select>: el puntero encima aclara el cristal y marca
        // más el filo; el foco lo anilla. Los dos controles se tocan a la vez.
        'transition-colors hover:border-[var(--color-hairline-strong)] hover:bg-[var(--color-glass-strong)] ' +
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-ink)] ' +
        SHAPES[shape] + ' ' +
        (trailing ? 'grow pr-20' : 'w-full')
      }
      {...rest}
    />
  );

  return (
    <div className={`flex min-w-0 flex-col gap-2 ${className}`}>
      <label htmlFor={id} className={CLASES_ETIQUETA}>
        {label}
      </label>
      {/* El adorno solo envuelve cuando existe: sin él el <input> sigue siendo
          hijo directo del contenedor en columna, como en Filtros.tsx. */}
      {trailing ? (
        <div className="relative flex">
          {input}
          <div className="absolute inset-y-0 right-3 flex items-center">{trailing}</div>
        </div>
      ) : (
        input
      )}
    </div>
  );
}

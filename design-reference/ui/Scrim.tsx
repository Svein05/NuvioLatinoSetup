// El arte es la interfaz, así que el scrim solo oscurece donde hay texto: la
// variante `hero` se desvanece hacia arriba para no apagar el fotograma entero.
const FONDOS = {
  normal: 'bg-[var(--scrim)]',
  soft: 'bg-[var(--scrim-soft)]',
  hero: 'bg-[image:var(--scrim-hero)]',
  portada: 'bg-[image:var(--scrim-portada)]',
  detalle: 'bg-[image:var(--scrim-detalle)]',
} as const;

export function Scrim({
  variant = 'normal', className = '',
}: { variant?: keyof typeof FONDOS; className?: string }) {
  return <div aria-hidden="true" className={`absolute inset-0 pointer-events-none ${FONDOS[variant]} ${className}`} />;
}

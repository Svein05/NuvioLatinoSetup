// La receta de vidrio va aquí entera y no encadenada sobre otra: dos
// backdrop-blur en la misma cadena empatan en especificidad y decide el orden
// de la hoja, no el de la cadena.
//
// Sin `absolute` ni `top`: dónde se coloca lo decide quien la usa —la fila la
// ancla al centro del póster, el héroe la agrupa con los puntos— y así no hay
// dos utilidades de la misma propiedad peleando.
const BASE =
  'hidden size-11 shrink-0 place-items-center rounded-full ' +
  'border border-[var(--color-hairline-strong)] bg-[var(--color-glass-dark)] ' +
  'text-[var(--color-ink)] backdrop-blur-[var(--blur-glass)] backdrop-saturate-[180%] backdrop-brightness-90 ' +
  'shadow-[var(--shadow-pill)] transition-[background-color,opacity] hover:bg-[var(--color-glass-active)] ' +
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-ink)] ' +
  'disabled:pointer-events-none disabled:opacity-35 ' +
  'lg:grid';

interface Props {
  hacia: 'izquierda' | 'derecha';
  etiqueta: string;
  onClick: () => void;
  disabled?: boolean;
  /** Posicionamiento: es lo único que cambia entre la fila y el héroe. */
  className?: string;
}

export function FlechaCarrusel({ hacia, etiqueta, onClick, disabled, className }: Props) {
  return (
    <button
      type="button"
      aria-label={etiqueta}
      onClick={onClick}
      disabled={disabled}
      className={className ? `${BASE} ${className}` : BASE}
    >
      <svg
        width="9"
        height="15"
        viewBox="0 0 9 15"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        className={hacia === 'izquierda' ? 'rotate-180' : undefined}
      >
        <path d="M1.5 1.5 7.5 7.5l-6 6" />
      </svg>
    </button>
  );
}

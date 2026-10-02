import { useRef, useState } from 'react';
import {
  REPRODUCTORES,
  enlaceReproductor,
  guardarReproductor,
  leerReproductor,
  type Reproductor,
} from '@/lib/reproductores';

type Variante = 'portada' | 'detalle';

// Las variantes se resuelven aquí y no desde className por lo mismo que en
// GlassPanel: dos utilidades de la misma propiedad empatan en especificidad y
// gana la que Tailwind emita más tarde en la hoja, no la última de la cadena.
const CAPSULA: Record<Variante, string> = {
  portada: 'text-[15.5px] shadow-[var(--shadow-cta)]',
  detalle: 'text-base shadow-[var(--shadow-cta-detalle)]',
};

const ALTO: Record<Variante, string> = {
  portada: 'py-[15px]',
  detalle: 'py-4',
};

const ANCHO: Record<Variante, string> = {
  portada: 'px-7',
  detalle: 'px-[30px]',
};

const FONDO = 'bg-[var(--color-ink)] transition-colors hover:bg-[var(--color-ink)]/90';

// Quita el triángulo nativo de <summary> sin perder lo que trae de serie:
// foco, teclado y el abrir/cerrar los pone el navegador, no nosotros.
const RESUMEN = 'cursor-pointer select-none list-none [&::-webkit-details-marker]:hidden';

function Play() {
  return (
    <svg width="13" height="15" viewBox="0 0 13 15" fill="currentColor" aria-hidden="true">
      <path d="M0 0l13 7.5L0 15z" />
    </svg>
  );
}

function Flecha() {
  return (
    <svg width="11" height="7" viewBox="0 0 11 7" fill="none" aria-hidden="true">
      <path d="M1 1l4.5 4.5L10 1" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

interface Props {
  type: 'movie' | 'series';
  id: string | null;
  variante: Variante;
}

// Mucha gente del catálogo usa Nuvio en vez de Stremio. Se elige una vez y se
// recuerda en el navegador: el caso normal vuelve a ser un solo toque.
export function BotonAbrir({ type, id, variante }: Props) {
  const [elegido, setElegido] = useState<Reproductor | null>(() => leerReproductor());
  const menu = useRef<HTMLDetailsElement>(null);

  const disponibles = REPRODUCTORES
    .map((app) => ({ ...app, enlace: enlaceReproductor(app.id, type, id) }))
    .filter((app): app is typeof app & { enlace: string } => app.enlace !== null);

  if (disponibles.length === 0) return null;

  // Si lo guardado no sirve para este título (Stremio no abre los ids 'tmdb:')
  // se vuelve a ofrecer la elección en vez de dejar un botón muerto.
  const actual = disponibles.find((app) => app.id === elegido) ?? null;

  const elegir = (app: Reproductor) => {
    guardarReproductor(app);
    setElegido(app);
    menu.current?.removeAttribute('open');
  };

  return (
    <div
      className={
        'relative inline-flex items-stretch rounded-[var(--radius-capsule)] ' +
        `font-semibold text-[var(--color-bg)] ${CAPSULA[variante]}`
      }
    >
      {actual && (
        <a
          href={actual.enlace}
          className={
            'inline-flex items-center gap-[11px] rounded-l-[var(--radius-capsule)] ' +
            `${FONDO} ${ALTO[variante]} pl-7 pr-3.5`
          }
        >
          <Play />
          Abrir en {actual.nombre}
        </a>
      )}

      <details ref={menu} className="flex">
        <summary
          aria-label={actual ? 'Cambiar de aplicación' : undefined}
          className={
            `${RESUMEN} ${FONDO} ${ALTO[variante]} inline-flex items-center ` +
            (actual
              ? 'rounded-r-[var(--radius-capsule)] border-l border-[var(--color-bg)]/15 px-4'
              : `gap-[11px] rounded-[var(--radius-capsule)] ${ANCHO[variante]}`)
          }
        >
          {actual ? <Flecha /> : <><Play />Abrir en…</>}
        </summary>

        <ul
          className={
            'absolute right-0 top-[calc(100%+10px)] z-20 min-w-[186px] overflow-hidden ' +
            'rounded-[var(--radius-field)] border border-[var(--color-hairline-strong)] ' +
            'bg-[var(--color-glass-dark)] text-sm font-medium text-[var(--color-ink)] ' +
            'shadow-[var(--shadow-lift)] backdrop-blur-[var(--blur-glass)] backdrop-saturate-[180%] backdrop-brightness-90'
          }
        >
          {disponibles.map((app) => (
            <li key={app.id}>
              <a
                href={app.enlace}
                onClick={() => elegir(app.id)}
                className="flex items-center gap-2.5 px-4 py-3 transition-colors hover:bg-[var(--color-glass-strong)]"
              >
                <Play />
                {app.nombre}
              </a>
            </li>
          ))}
        </ul>
      </details>
    </div>
  );
}

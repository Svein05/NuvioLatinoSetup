import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { readFileSync } from 'node:fs';
import { GlassPanel, CapsuleButton, Field, Select, Scrim } from '@/ui';

describe('primitivas de interfaz', () => {
  it('el panel aplica desenfoque y radio de tarjeta', () => {
    const html = renderToStaticMarkup(<GlassPanel>hola</GlassPanel>);
    expect(html).toContain('backdrop-blur');
    expect(html).toContain('hola');
  });

  it('el botón sólido y el de vidrio se distinguen', () => {
    const solido = renderToStaticMarkup(<CapsuleButton variant="solid">Entrar</CapsuleButton>);
    const vidrio = renderToStaticMarkup(<CapsuleButton variant="glass">Mi lista</CapsuleButton>);
    expect(solido).not.toBe(vidrio);
    expect(solido).toContain('Entrar');
  });

  // El puntero encima y el foco tienen que notarse igual que en <Select>: es
  // el mismo par de estados en los dos controles.
  it('el campo reacciona al puntero y al foco', () => {
    const html = renderToStaticMarkup(<Field id="u" label="Usuario" />);
    expect(html).toContain('hover:bg-[var(--color-glass-strong)]');
    expect(html).toContain('hover:border-[var(--color-hairline-strong)]');
    expect(html).toContain('focus-visible:outline-2');
  });

  it('el campo asocia etiqueta y entrada por id', () => {
    const html = renderToStaticMarkup(<Field id="usuario" label="Usuario" />);
    expect(html).toContain('for="usuario"');
    expect(html).toContain('id="usuario"');
  });
});

describe('desplegable', () => {
  const html = renderToStaticMarkup(
    <Select id="genero" label="Género">
      <option value="0">Todos</option>
    </Select>,
  );

  it('asocia etiqueta y control por id', () => {
    expect(html).toContain('for="genero"');
    expect(html).toContain('id="genero"');
  });

  // Sin appearance-none el navegador pinta su propio control dentro de la
  // cápsula: su flecha encima de la nuestra y un relleno que no es el del diseño.
  it('sustituye el control del sistema por el del diseño', () => {
    expect(html).toContain('appearance-none');
    expect(html).toContain('var(--flecha)');
  });

  it('reserva sitio a la derecha para la flecha', () => {
    expect(html).toContain('pr-11');
  });
});

describe('lista del desplegable', () => {
  const css = readFileSync(new URL('../styles/theme.css', import.meta.url), 'utf8');

  // La lista la dibuja el navegador FUERA del documento y la pinta heredando
  // el background-color del <select>. Con un cristal translúcido eso compone
  // sobre blanco: salía un panel blanco con el texto blanco encima, ilegible.
  // Pintar las opciones es la única palanca que queda sobre ese panel.
  it('pinta las opciones con un color opaco', () => {
    const regla = css.match(/option,\s*optgroup\s*\{([^}]*)\}/)?.[1];
    expect(regla, 'falta la regla que pinta las opciones').toBeTruthy();

    const fondo = regla!.match(/background-color:\s*([^;]+);/)?.[1].trim();
    expect(fondo, 'la regla no fija un fondo').toBeTruthy();

    const resuelto = fondo!.startsWith('var(')
      ? css.match(new RegExp(`${fondo!.slice(4, -1)}:([^;]+);`))?.[1].trim()
      : fondo;
    // Opaco: ni rgba() ni rgb(... / alfa). Un color con alfa reabre el fallo.
    expect(resuelto, `${fondo} no resuelve a un color opaco`).toMatch(/^#[0-9a-f]{6}$|^rgb\([^/]*\)$/i);
    expect(regla).toContain('color: var(--color-ink)');
  });
});

describe('scrim', () => {
  it('usa el token normal por defecto', () => {
    expect(renderToStaticMarkup(<Scrim />)).toContain('--scrim');
  });

  it('la variante hero usa el degradado, no un plano', () => {
    const hero = renderToStaticMarkup(<Scrim variant="hero" />);
    expect(hero).toContain('--scrim-hero');
    expect(hero).not.toBe(renderToStaticMarkup(<Scrim />));
  });

  it('no captura el puntero: es decoración, no una capa interactiva', () => {
    expect(renderToStaticMarkup(<Scrim />)).toContain('pointer-events-none');
  });
});

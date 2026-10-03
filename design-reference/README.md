# Sistema de estilos del catálogo web LAT-ADD

Paquete de referencia extraído de `apps/web` (React + Vite + Tailwind CSS 4).
Objetivo: que otra persona/equipo genere una plantilla nueva con la MISMA
identidad visual para otra página del proyecto.

## Contenido

| Carpeta/archivo | Qué es |
|---|---|
| `styles/theme.css` | **El corazón**: tokens de diseño como variables CSS (colores, glass, radios, sombras, velos de imagen). Tailwind 4 lo consume con `@import "tailwindcss"` + `@theme`. |
| `styles/fonts.css` | `@font-face` de las tipografías (apunta a `../assets/fonts/`). |
| `assets/fonts/` | Instrument Sans (texto/UI) e Instrument Serif (títulos display), self-hosted en woff2, con variantes latin-ext e itálica. |
| `assets/marca.png` | Logotipo de la marca. |
| `ui/*.tsx` | Componentes primitivos con la gramática visual: `GlassPanel`, `CapsuleButton`, `Field`, `Select`, `Scrim`, `FlechaCarrusel`, `BotonAbrir`, `Marca`. |
| `index.html` | Preload de las fuentes + CSP (los hashes `sha256-` son del propio HTML: regenerarlos si se modifica). |
| `vite.config.ts` | Cómo entra Tailwind 4 al build (`@tailwindcss/vite`). |
| `package.json` | Versiones usadas (Tailwind 4, React 19, Vite 6). |

## Decisiones de diseño que la plantilla debe respetar

1. **Dark cinematográfico**: fondo casi negro con tinte propio (ver
   `--fondo`), texto hueso (`--color-ink`), jerarquía por opacidad, nunca
   grises planos sobre negro puro.
2. **Glassmorphism comedido**: paneles y chapas con
   `background: var(--color-glass)` (blanco translúcido bajo) +
   `backdrop-filter: blur(var(--blur-glass))` + borde hairline
   (`1px rgba blanco tenue`). Ver `GlassPanel.tsx` y `CHAPA_*` en las tarjetas.
3. **Tipografía contrastada**: **Instrument Serif** para display/títulos
   (elegante, editorial) + **Instrument Sans** para todo lo demás. La serif
   da la identidad — no sustituirlas por genéricas.
4. **Radios generosos** en cápsulas y paneles (`--radius-capsule: 999px`,
   `--radius-panel`), acorde al look de cine.
5. **Imágenes con velo** (`--poster-velo`, `--hero-velo`): degradados que
   aseguran contraste del texto sobre pósters/backdrops sin apagar el
   fotograma (velo sutil, no cortina).
6. **Espaciado y jerarquía**: paddings amplios, tracking negativo leve en
   títulos grandes, mayúsculas con `tracking` amplio en rótulos pequeños.
7. **Acentos**: color 4K (oro/ámbar para el badge de calidad) y estrella de
   valoración — todos definidos como tokens en `theme.css`.

## Cómo usarlo en la plantilla nueva

```css
/* entry.css */
@import "tailwindcss";
@import "./styles/theme.css";
@import "./styles/fonts.css";
```

Las clases utilitarias consumen los tokens así:
`bg-[var(--color-panel)]`, `border-[var(--color-hairline)]`,
`rounded-[var(--radius-panel)]`, etc. (ver ejemplos dentro de `ui/*.tsx`).

Requisitos del proyecto original: React 19, Vite 6, Tailwind CSS 4 con el
plugin `@tailwindcss/vite`, Node ≥ 22. Las fuentes son self-hosted (licencia
OFL): copiar `assets/fonts/` tal cual y mantener los preloads del
`index.html`.

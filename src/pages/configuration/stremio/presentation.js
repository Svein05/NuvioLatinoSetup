const COPY = [
  ['#connectionsStep>header>p', 'Trae tus listas y descubre recomendaciones en Stremio. Tú eliges qué conectar, también puedes omitir este paso.'],
  ['#connectionsStep>div:last-child>p', 'Puedes ajustar el registro de vistos por servicio. Trakt se vincula por separado desde Stremio.'],
  ['#step-5>div:first-child h2>span', 'Elige el estilo de tus pósters'],
  ['#step-5>div:first-child>p', 'Personaliza las carátulas de AIOMetadata para Stremio.'],
  ['#step-5>div.w-full.space-y-3>div:first-child>p', 'Selecciona la apariencia de las carátulas de tus películas y series en AIOMetadata.'],
  ['#keyMdblist~p', 'Conecta MDBList para las calificaciones agregadas y la personalización de pósters de AIOMetadata.'],
  ['#step-6 h2>span', 'Organiza tus addons de Stremio'],
  ['#step-6 h2+p', 'Conserva tus addons y elige el orden que quieres aplicar en Stremio.'],
  ['[data-trakt-tracking]', 'Configurar en Stremio'],
  ['[data-connection-provider="trakt"] .connection-tracking>p', 'Vincula Trakt desde Stremio para configurar el seguimiento compatible con tu cliente.'],
];

export function createPlatformPresentation(root, state) {
  const nodes = COPY.map(([selector, copy]) => {
    const node = root.querySelector(selector);
    return { node, copy, original: node?.innerHTML };
  });
  return () => {
    const stremio = state.targetApplication === 'stremio';
    for (const { node, copy, original } of nodes) {
      if (!node) continue;
      if (stremio) node.textContent = copy;
      else if (node.innerHTML !== original) node.innerHTML = original;
    }
    root.querySelector('#step-6>div:last-child')?.classList.toggle('stremio-hidden-hint', stremio);
  };
}

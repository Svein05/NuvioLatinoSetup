/**
 * Componente: Indicador Deslizante de Navegación (Segmented Pill Slider)
 * Añade una animación fluida estilo Apple/macOS a la barra de pestañas flotante.
 */
export function initNavIndicator() {
  const nav = document.querySelector('header.lat-floating-nav nav');
  if (!nav) return;

  const links = Array.from(nav.querySelectorAll('a'));
  if (links.length === 0) return;

  nav.classList.add('relative');

  // Buscar o crear el indicador deslizante
  let indicator = nav.querySelector('.nav-pill-indicator');
  if (!indicator) {
    indicator = document.createElement('div');
    indicator.className = 'nav-pill-indicator';
    nav.insertBefore(indicator, nav.firstChild);
  }

  // Detectar enlace activo
  let activeLink = links.find(l => l.classList.contains('active') || l.classList.contains('bg-white'));
  if (!activeLink) activeLink = links[0];

  // Limpiar estilos individuales en favor del indicador compartido
  links.forEach(l => {
    l.classList.add('relative', 'z-10', 'transition-colors', 'duration-200');
    if (l === activeLink) {
      l.classList.remove('bg-white', 'text-white/70');
      l.classList.add('text-[#08090c]', 'font-semibold');
    } else {
      l.classList.remove('bg-white', 'text-[#08090c]');
      l.classList.add('text-white/70');
    }
  });

  function updateIndicator(target, animate = true) {
    if (!target) return;
    if (!animate) {
      indicator.style.transition = 'none';
    } else {
      indicator.style.transition = 'all 0.28s cubic-bezier(0.32, 0.72, 0, 1)';
    }

    indicator.style.left = `${target.offsetLeft}px`;
    indicator.style.width = `${target.offsetWidth}px`;
    indicator.style.top = `${target.offsetTop}px`;
    indicator.style.height = `${target.offsetHeight}px`;
  }

  // Posicionar inmediatamente en el frame inicial
  updateIndicator(activeLink, false);
  requestAnimationFrame(() => {
    indicator.style.transition = 'all 0.28s cubic-bezier(0.32, 0.72, 0, 1)';
  });

  // Interactividad hover
  links.forEach(link => {
    link.addEventListener('mouseenter', () => {
      updateIndicator(link, true);
      links.forEach(l => {
        if (l === link) {
          l.classList.remove('text-white/70');
          l.classList.add('text-[#08090c]');
        } else {
          l.classList.remove('text-[#08090c]');
          l.classList.add('text-white/70');
        }
      });
    });
  });

  nav.addEventListener('mouseleave', () => {
    updateIndicator(activeLink, true);
    links.forEach(l => {
      if (l === activeLink) {
        l.classList.remove('text-white/70');
        l.classList.add('text-[#08090c]', 'font-semibold');
      } else {
        l.classList.remove('text-[#08090c]');
        l.classList.add('text-white/70');
      }
    });
  });

  window.addEventListener('resize', () => updateIndicator(activeLink, false));
}

// Inicializar automáticamente si el documento ya cargó
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initNavIndicator);
} else {
  initNavIndicator();
}

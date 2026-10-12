/**
 * Componente: Indicador Deslizante de Navegación (Segmented Pill Slider)
 * Añade una animación fluida estilo Apple/macOS a la barra de pestañas flotante.
 */
export function initNavIndicator() {
  const nav = document.querySelector('header.lat-floating-nav nav');
  if (!nav) return;

  const links = Array.from(nav.querySelectorAll('a'));
  if (links.length === 0) return;

  // Buscar o crear el indicador deslizante
  let indicator = nav.querySelector('.nav-pill-indicator');
  if (!indicator) {
    indicator = document.createElement('div');
    indicator.className = 'nav-pill-indicator';
    nav.insertBefore(indicator, nav.firstChild);
  }

  // Detectar enlace activo
  let activeLink = links.find(l => 
    l.classList.contains('is-active') || 
    l.classList.contains('active') || 
    l.classList.contains('bg-white')
  );
  if (!activeLink) activeLink = links[0];

  // Normalizar clases de todos los enlaces para garantizar contraste absoluto
  links.forEach(l => {
    l.classList.add('lat-nav-tab');
    // Limpiar clases utilitarias heredadas que puedan colisionar
    l.classList.remove('bg-white', 'text-black', 'text-white/70', 'hover:text-white', 'hover:bg-white/[0.08]');
    
    if (l === activeLink) {
      l.classList.add('is-active');
      l.classList.remove('is-hovered');
    } else {
      l.classList.remove('is-active', 'is-hovered');
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

  // Interactividad hover (señalar con el ratón)
  links.forEach(link => {
    link.addEventListener('mouseenter', () => {
      updateIndicator(link, true);
      links.forEach(l => {
        if (l === link) {
          l.classList.add('is-hovered');
        } else {
          l.classList.remove('is-hovered', 'is-active');
        }
      });
    });
  });

  // Al salir el ratón del nav, regresar suavemente al enlace activo
  nav.addEventListener('mouseleave', () => {
    updateIndicator(activeLink, true);
    links.forEach(l => {
      l.classList.remove('is-hovered');
      if (l === activeLink) {
        l.classList.add('is-active');
      } else {
        l.classList.remove('is-active');
      }
    });
  });

  window.addEventListener('resize', () => updateIndicator(activeLink, false));
  if (document.fonts) {
    document.fonts.ready.then(() => updateIndicator(activeLink, false));
  }

  // Soporte dinámico para la compensación reactiva al expandir el contador
  const header = document.querySelector('header.lat-floating-nav');
  const counterPills = header ? header.querySelectorAll('.completions-counter-pill') : [];

  let trackingId = null;
  function trackIndicatorTransition(duration = 420) {
    if (trackingId) {
      cancelAnimationFrame(trackingId);
      trackingId = null;
    }
    const start = performance.now();

    function step(now) {
      const elapsed = now - start;
      const target = nav.querySelector('.lat-nav-tab.is-hovered') || activeLink;
      if (target) {
        updateIndicator(target, false);
      }
      if (elapsed < duration) {
        trackingId = requestAnimationFrame(step);
      } else {
        trackingId = null;
        const finalTarget = nav.querySelector('.lat-nav-tab.is-hovered') || activeLink;
        if (finalTarget) updateIndicator(finalTarget, false);
      }
    }
    trackingId = requestAnimationFrame(step);
  }

  // Coordinar expansión del contador con compresión de las pestañas
  counterPills.forEach(pill => {
    pill.addEventListener('mouseenter', () => {
      if (header) header.classList.add('is-counter-expanded');
      trackIndicatorTransition(420);
    });

    pill.addEventListener('mouseleave', () => {
      if (header) header.classList.remove('is-counter-expanded');
      trackIndicatorTransition(420);
    });
  });

  // Observar si el contador entra en estado de celebración (.is-celebrating)
  counterPills.forEach(pill => {
    if (window.MutationObserver) {
      const observer = new MutationObserver(mutations => {
        for (const m of mutations) {
          if (m.type === 'attributes' && m.attributeName === 'class') {
            if (pill.classList.contains('is-celebrating')) {
              if (header) header.classList.add('is-counter-expanded');
            } else if (!pill.matches(':hover')) {
              if (header) header.classList.remove('is-counter-expanded');
            }
            trackIndicatorTransition(420);
          }
        }
      });
      observer.observe(pill, { attributes: true });
    }
  });

  // Escuchar fin de transiciones de las pestañas
  nav.addEventListener('transitionend', (e) => {
    if (e.propertyName === 'max-width' || e.propertyName === 'padding') {
      const target = nav.querySelector('.lat-nav-tab.is-hovered') || activeLink;
      if (target) updateIndicator(target, false);
    }
  });

  // ResizeObserver para recalibrar ante cualquier cambio dinámico de tamaño
  if (window.ResizeObserver) {
    const ro = new ResizeObserver(() => {
      const currentTarget = nav.querySelector('.lat-nav-tab.is-hovered') || activeLink;
      if (currentTarget && !trackingId) {
        updateIndicator(currentTarget, false);
      }
    });
    ro.observe(nav);
  }
}

// Inicializar automáticamente si el documento ya cargó
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initNavIndicator);
} else {
  initNavIndicator();
}

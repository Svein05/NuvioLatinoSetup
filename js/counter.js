/**
 * Módulo de Contador Global de Configuraciones Completadas
 * Nuvio Latino Setup - Arquitectura Jamstack / GitHub Pages ($0 Costo)
 * Incluye Odómetro (Ruleta de Dígitos estilo YouTube Live), Live Sync y Menú Responsive
 */

import { INJECTED_COUNTER_CONFIG } from './counter-config.js';

const STORAGE_KEYS = {
  CACHED_COUNT: 'nuvio_completions_cached_count',
  CACHED_TIMESTAMP: 'nuvio_completions_cached_ts',
  COMPLETION_TOKEN: 'nuvio_completion_recorded_token',
  SESSION_RECORDED: 'nuvio_completion_session_recorded'
};

// Endpoints primario y secundario para redundancia (inyectados exclusivamente en despliegue)
const API_ENDPOINTS = {
  PRIMARY: {
    name: 'Primary',
    get: INJECTED_COUNTER_CONFIG?.primaryGet || '',
    hit: INJECTED_COUNTER_CONFIG?.primaryHit || '',
    extract: (data) => (typeof data?.value === 'number' ? data.value : null)
  },
  FALLBACK: {
    name: 'Fallback',
    get: INJECTED_COUNTER_CONFIG?.fallbackGet || '',
    hit: INJECTED_COUNTER_CONFIG?.fallbackHit || '',
    extract: (data) => (typeof data?.value === 'number' ? data.value : null)
  }
};

// Valor base mínimo de respaldo si la red está offline y no hay caché
const BASELINE_COUNT = 150;

/**
 * Realiza una petición con timeout de seguridad
 */
async function fetchWithTimeout(url, timeoutMs = 3500) {
  if (!url) throw new Error('URL de endpoint no configurada.');
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    clearTimeout(timer);
    throw err;
  }
}

/**
 * Obtiene el total global actual de configuraciones completadas
 */
export async function fetchCompletionsCount() {
  // 1. Intentar proveedor principal si está configurado
  if (API_ENDPOINTS.PRIMARY.get) {
    try {
      const data = await fetchWithTimeout(API_ENDPOINTS.PRIMARY.get, 3000);
      const count = API_ENDPOINTS.PRIMARY.extract(data);
      if (count !== null && count >= 0) {
        saveLocalCache(count);
        return count;
      }
    } catch (errPrimary) {
      console.warn(`[Counter] Proveedor principal no disponible:`, errPrimary.message);
    }
  }

  // 2. Intentar proveedor secundario si está configurado
  if (API_ENDPOINTS.FALLBACK.get) {
    try {
      const data = await fetchWithTimeout(API_ENDPOINTS.FALLBACK.get, 3000);
      const count = API_ENDPOINTS.FALLBACK.extract(data);
      if (count !== null && count >= 0) {
        saveLocalCache(count);
        return count;
      }
    } catch (errFallback) {
      console.warn(`[Counter] Proveedor secundario no disponible:`, errFallback.message);
    }
  }

  // 3. Respaldo: leer caché local de localStorage
  return getLocalCache();
}

/**
 * Dispara el efecto visual de auto-expansión celebratoria en desktop
 */
export function triggerCelebrationEffect() {
  const pillEls = document.querySelectorAll('.completions-counter-pill, #completionsCounterPill');
  pillEls.forEach(pill => {
    pill.classList.remove('is-celebrating');
    // Forzar reflujo para reiniciar la animación
    void pill.offsetWidth;
    pill.classList.add('is-celebrating');
  });

  if (window._counterCelebrationTimer) {
    clearTimeout(window._counterCelebrationTimer);
  }
  window._counterCelebrationTimer = setTimeout(() => {
    pillEls.forEach(pill => pill.classList.remove('is-celebrating'));
  }, 3600);
}

/**
 * Incrementa el contador global tras una configuración completada con éxito.
 * Implementa protección anti-spam local por sesión para no inflar la cifra ante reintentos consecutivos.
 */
export async function recordSuccessfulCompletion() {
  // Disparar siempre la animación celebratoria (+1 visual) para deleite del usuario
  triggerCelebrationEffect();

  // Control anti-spam: máximo 1 incremento por navegador cada 45 minutos o por sesión
  let isAlreadyRecorded = false;
  try {
    if (sessionStorage.getItem(STORAGE_KEYS.SESSION_RECORDED) === 'true') {
      isAlreadyRecorded = true;
    }
  } catch (_) {}

  const lastToken = localStorage.getItem(STORAGE_KEYS.COMPLETION_TOKEN);
  const now = Date.now();
  if (lastToken) {
    const lastTimestamp = parseInt(lastToken, 10);
    if (!isNaN(lastTimestamp) && (now - lastTimestamp) < 45 * 60 * 1000) {
      isAlreadyRecorded = true;
    }
  }

  if (isAlreadyRecorded) {
    console.info('[Counter] Configuración ya contabilizada recientemente en esta sesión. Mostrando animación celebratoria sin duplicar incremento.');
    const current = getLocalCache();
    updateCounterPillUI(current, true);
    return current;
  }

  let newCount = null;

  // 1. Intentar incrementar en proveedor principal
  try {
    const data = await fetchWithTimeout(API_ENDPOINTS.PRIMARY.hit, 3500);
    const count = API_ENDPOINTS.PRIMARY.extract(data);
    if (count !== null) {
      newCount = count;
    }
  } catch (errPrimary) {
    console.warn('[Counter] Fallo al incrementar en proveedor primario:', errPrimary.message);
  }

  // 2. Si falló el primario, intentar en el de respaldo
  if (newCount === null) {
    try {
      const data = await fetchWithTimeout(API_ENDPOINTS.FALLBACK.hit, 3500);
      const count = API_ENDPOINTS.FALLBACK.extract(data);
      if (count !== null) {
        newCount = count;
      }
    } catch (errFallback) {
      console.warn('[Counter] Fallo al incrementar en proveedor secundario:', errFallback.message);
    }
  }

  // Si ambos proveedores fallaron de red, incrementar caché local como estimación optimista
  if (newCount === null) {
    const current = getLocalCache();
    newCount = current + 1;
  }

  // Marcar tokens de sesión y anti-spam
  try {
    sessionStorage.setItem(STORAGE_KEYS.SESSION_RECORDED, 'true');
    localStorage.setItem(STORAGE_KEYS.COMPLETION_TOKEN, String(now));
  } catch (_) {}
  saveLocalCache(newCount);

  // Actualizar la interfaz en vivo con animación de odómetro
  updateCounterPillUI(newCount, true);

  return newCount;
}

/**
 * Guarda en caché local
 */
function saveLocalCache(count) {
  try {
    localStorage.setItem(STORAGE_KEYS.CACHED_COUNT, String(count));
    localStorage.setItem(STORAGE_KEYS.CACHED_TIMESTAMP, String(Date.now()));
  } catch (_) {}
}

/**
 * Lee la caché local o devuelve el número base
 */
function getLocalCache() {
  try {
    const cached = localStorage.getItem(STORAGE_KEYS.CACHED_COUNT);
    if (cached) {
      const val = parseInt(cached, 10);
      if (!isNaN(val) && val > 0) return val;
    }
  } catch (_) {}
  return BASELINE_COUNT;
}

/**
 * Formatea un número en notación compacta para la pastilla en reposo:
 * - Menos de 1.000: "150", "999"
 * - 1.000 a 999.999: "1k", "1.5k", "12k", "12.4k", "150k"
 * - 1.000.000+: "1M", "2.5M"
 */
export function formatCompactNumber(num) {
  if (num === null || num === undefined || isNaN(num)) return '--';
  const n = Number(num);
  if (n < 1000) return n.toString();
  
  if (n < 1000000) {
    const k = n / 1000;
    const formatted = k < 100 ? k.toFixed(1).replace(/\.0$/, '') : Math.round(k).toString();
    return `${formatted}k`;
  }
  
  if (n < 1000000000) {
    const m = n / 1000000;
    const formatted = m < 100 ? m.toFixed(1).replace(/\.0$/, '') : Math.round(m).toString();
    return `${formatted}M`;
  }
  
  const b = n / 1000000000;
  return `${b.toFixed(1).replace(/\.0$/, '')}B`;
}

/**
 * Formatea el número completo con separador de miles
 */
export function formatFullNumber(num) {
  if (num === null || num === undefined || isNaN(num)) return '--';
  try {
    return new Intl.NumberFormat('es-MX').format(Number(num));
  } catch (_) {
    return Number(num).toLocaleString();
  }
}

/**
 * Motor del Odómetro / Ruleta Digital Estilo YouTube Live Subscriber Count
 * Renderiza los caracteres en slots y anima los dígitos descendiendo desde arriba hacia abajo
 */
export function renderOdometer(container, textValue, animate = false) {
  if (!container) return;
  const str = String(textValue);

  const prevStr = container.__odometerPrevStr || '';
  container.__odometerPrevStr = str;

  // Si no se solicita animación o no había valor previo, renderizado directo estático
  if (!animate || !prevStr) {
    container.innerHTML = '';
    const wrapper = document.createElement('span');
    wrapper.className = 'odometer-wrapper';
    for (const char of str) {
      if (/\d/.test(char)) {
        const slot = document.createElement('span');
        slot.className = 'odometer-digit-slot';
        slot.dataset.digit = char;
        const val = document.createElement('span');
        val.className = 'odometer-digit-val';
        val.textContent = char;
        slot.appendChild(val);
        wrapper.appendChild(slot);
      } else {
        const sym = document.createElement('span');
        sym.className = 'odometer-static-char';
        sym.textContent = char;
        wrapper.appendChild(sym);
      }
    }
    container.appendChild(wrapper);
    return;
  }

  // Renderizado animado con ruleta de dígitos que bajan desde arriba
  container.innerHTML = '';
  const wrapper = document.createElement('span');
  wrapper.className = 'odometer-wrapper';

  const maxLen = Math.max(prevStr.length, str.length);
  const paddedPrev = prevStr.padStart(maxLen, ' ');
  const paddedNext = str.padStart(maxLen, ' ');

  for (let i = 0; i < maxLen; i++) {
    const cPrev = paddedPrev[i];
    const cNext = paddedNext[i];

    if (cNext === ' ') continue;

    if (/\d/.test(cNext)) {
      const slot = document.createElement('span');
      slot.className = 'odometer-digit-slot';
      slot.dataset.digit = cNext;

      const nPrev = /\d/.test(cPrev) ? parseInt(cPrev, 10) : null;
      const nNext = parseInt(cNext, 10);

      if (nPrev !== null && nPrev !== nNext) {
        // Ruleta de YouTube: los números bajan desde arriba (el nuevo dígito entra rodando desde arriba)
        // Secuencia donde nNext está en la cima (índice 0) y nPrev está en el fondo
        const digits = [];
        let curr = nNext;
        digits.push(curr);
        let steps = (nNext - nPrev + 10) % 10;
        if (steps === 0) steps = 10;
        for (let s = 1; s <= steps; s++) {
          curr = (curr - 1 + 10) % 10;
          digits.push(curr);
          if (curr === nPrev) break;
        }

        const strip = document.createElement('span');
        strip.className = 'odometer-digit-strip';

        digits.forEach(d => {
          const val = document.createElement('span');
          val.className = 'odometer-digit-val';
          val.textContent = String(d);
          strip.appendChild(val);
        });

        // Mostrar inicialmente nPrev (al fondo de la tira vertical)
        const totalHeightEm = (digits.length - 1) * 1.15;
        strip.style.transform = `translateY(-${totalHeightEm}em)`;
        strip.style.transition = 'none';

        slot.appendChild(strip);
        wrapper.appendChild(slot);

        // En el cuadro siguiente, animar suavemente hacia translateY(0)
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            strip.style.transition = 'transform 0.72s cubic-bezier(0.16, 1, 0.3, 1)';
            strip.style.transform = 'translateY(0)';
          });
        });
      } else {
        // El dígito no cambió
        const val = document.createElement('span');
        val.className = 'odometer-digit-val';
        val.textContent = cNext;
        slot.appendChild(val);
        wrapper.appendChild(slot);
      }
    } else {
      // Símbolo estático (coma, punto, 'k', 'M')
      const sym = document.createElement('span');
      sym.className = 'odometer-static-char';
      sym.textContent = cNext;
      wrapper.appendChild(sym);
    }
  }

  container.appendChild(wrapper);
}

/**
 * Actualiza los elementos del DOM asociados al contador utilizando el odómetro
 */
export function updateCounterPillUI(count, animate = false) {
  const compactEls = document.querySelectorAll('.completions-count-compact');
  const fullEls = document.querySelectorAll('.completions-count-full');
  const legacyEls = document.querySelectorAll('.completions-count-number, #completionsCountNumber');
  const pillEls = document.querySelectorAll('.completions-counter-pill, #completionsCounterPill');

  const compactStr = formatCompactNumber(count);
  const fullStr = formatFullNumber(count);

  compactEls.forEach(el => {
    renderOdometer(el, compactStr, animate);
  });

  fullEls.forEach(el => {
    renderOdometer(el, fullStr, animate);
  });

  legacyEls.forEach(el => {
    renderOdometer(el, compactStr, animate);
  });

  pillEls.forEach(pill => {
    pill.classList.remove('opacity-0');
    pill.classList.add('opacity-100');
  });
}

/**
 * Polling en tiempo real de bajo consumo con Page Visibility API
 */
let livePollingInterval = null;

export function startLiveSyncPolling(intervalMs = 25000) {
  if (livePollingInterval) return;

  const checkLive = async () => {
    // Si la pestaña está oculta o en segundo plano, no realizar peticiones
    if (document.hidden) return;

    try {
      const liveCount = await fetchCompletionsCount();
      const currentCache = getLocalCache();
      if (liveCount && liveCount > currentCache) {
        saveLocalCache(liveCount);
        // Actualizar UI con animación de odómetro, pero sin forzar auto-expansión
        updateCounterPillUI(liveCount, true);
      }
    } catch (_) {}
  };

  livePollingInterval = setInterval(checkLive, intervalMs);

  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
      checkLive();
    }
  });
}

/**
 * Inicializa el menú desplegable vertical de cabecera en móviles y tablets
 */
export function initMobileHeaderMenu() {
  const btn = document.getElementById('btnMobileHeaderMenu');
  const dropdown = document.getElementById('mobileHeaderDropdown');
  if (!btn || !dropdown || btn._hasMobileMenuInit) return;
  btn._hasMobileMenuInit = true;

  const toggle = (e) => {
    e.stopPropagation();
    dropdown.classList.toggle('is-open');
  };

  btn.addEventListener('click', toggle);

  // Cerrar al hacer clic en cualquier otra parte
  document.addEventListener('click', (e) => {
    if (!dropdown.contains(e.target) && !btn.contains(e.target)) {
      dropdown.classList.remove('is-open');
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      dropdown.classList.remove('is-open');
    }
  });
}

/**
 * Inicializa la pastilla del contador en la cabecera al cargar la página
 */
export async function initCompletionsCounterUI() {
  // 1. Inicializar menú móvil y tablet
  initMobileHeaderMenu();

  // 2. Mostrar inmediatamente el valor en caché para evitar saltos o parpadeos (0 ms)
  const cached = getLocalCache();
  updateCounterPillUI(cached, false);

  // 3. Iniciar polling en vivo de bajo consumo (25 segundos)
  startLiveSyncPolling(25000);

  // 4. Consultar en segundo plano el valor actualizado inicial
  try {
    const liveCount = await fetchCompletionsCount();
    if (liveCount && liveCount !== cached) {
      updateCounterPillUI(liveCount, true);
    }
  } catch (err) {
    console.warn('[Counter] Usando valor de caché:', err);
  }
}


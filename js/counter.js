/**
 * Módulo de Contador Global de Configuraciones Completadas
 * Nuvio Latino Setup - Arquitectura Jamstack / GitHub Pages ($0 Costo)
 */

const STORAGE_KEYS = {
  CACHED_COUNT: 'nuvio_completions_cached_count',
  CACHED_TIMESTAMP: 'nuvio_completions_cached_ts',
  COMPLETION_TOKEN: 'nuvio_completion_recorded_token'
};

// Endpoints primario y secundario para redundancia
const API_ENDPOINTS = {
  PRIMARY: {
    name: 'Abacus',
    get: 'https://abacus.jasoncameron.dev/get/nuvio-latino-setup/completions',
    hit: 'https://abacus.jasoncameron.dev/hit/nuvio-latino-setup/completions',
    extract: (data) => (typeof data?.value === 'number' ? data.value : null)
  },
  FALLBACK: {
    name: 'CountAPI',
    get: 'https://countapi.mileshilliard.com/api/v1/get/nuviolatino_setups_v1',
    hit: 'https://countapi.mileshilliard.com/api/v1/hit/nuviolatino_setups_v1',
    extract: (data) => (typeof data?.value === 'number' ? data.value : null)
  }
};

// Valor base mínimo de respaldo si la red está offline y no hay caché
const BASELINE_COUNT = 150;

/**
 * Realiza una petición con timeout de seguridad
 */
async function fetchWithTimeout(url, timeoutMs = 3500) {
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
  // 1. Intentar proveedor principal (Abacus)
  try {
    const data = await fetchWithTimeout(API_ENDPOINTS.PRIMARY.get, 3000);
    const count = API_ENDPOINTS.PRIMARY.extract(data);
    if (count !== null && count >= 0) {
      saveLocalCache(count);
      return count;
    }
  } catch (errPrimary) {
    console.warn(`[Counter] Proveedor principal (${API_ENDPOINTS.PRIMARY.name}) no disponible:`, errPrimary.message);
  }

  // 2. Intentar proveedor secundario (CountAPI)
  try {
    const data = await fetchWithTimeout(API_ENDPOINTS.FALLBACK.get, 3000);
    const count = API_ENDPOINTS.FALLBACK.extract(data);
    if (count !== null && count >= 0) {
      saveLocalCache(count);
      return count;
    }
  } catch (errFallback) {
    console.warn(`[Counter] Proveedor secundario (${API_ENDPOINTS.FALLBACK.name}) no disponible:`, errFallback.message);
  }

  // 3. Respaldo: leer caché local de localStorage
  return getLocalCache();
}

/**
 * Incrementa el contador global tras una configuración completada con éxito.
 * Implementa protección anti-spam local para no inflar la cifra ante reintentos consecutivos.
 */
export async function recordSuccessfulCompletion() {
  // Control anti-spam: máximo 1 incremento por navegador cada 45 minutos
  const lastToken = localStorage.getItem(STORAGE_KEYS.COMPLETION_TOKEN);
  const now = Date.now();
  if (lastToken) {
    const lastTimestamp = parseInt(lastToken, 10);
    if (!isNaN(lastTimestamp) && (now - lastTimestamp) < 45 * 60 * 1000) {
      console.info('[Counter] Configuración ya contabilizada recientemente en esta sesión. Omitiendo incremento duplicado.');
      return getLocalCache();
    }
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

  // Marcar token anti-spam y guardar caché
  try {
    localStorage.setItem(STORAGE_KEYS.COMPLETION_TOKEN, String(now));
  } catch (_) {}
  saveLocalCache(newCount);

  // Actualizar la interfaz en vivo con animación
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
 * Anima la transición numérica suave en el DOM
 */
function animateNumber(element, start, end, durationMs = 1000, onStep = null) {
  if (!element) return;
  const startTime = performance.now();
  const diff = end - start;

  function step(currentTime) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / durationMs, 1);
    // Easing easeOutExpo
    const ease = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
    const currentVal = Math.round(start + diff * ease);
    element.textContent = formatFullNumber(currentVal);
    if (typeof onStep === 'function') onStep(currentVal);

    if (progress < 1) {
      requestAnimationFrame(step);
    } else {
      element.textContent = formatFullNumber(end);
      if (typeof onStep === 'function') onStep(end);
    }
  }

  requestAnimationFrame(step);
}

/**
 * Actualiza los elementos del DOM asociados al contador
 */
export function updateCounterPillUI(count, animate = false) {
  const compactEls = document.querySelectorAll('.completions-count-compact');
  const fullEls = document.querySelectorAll('.completions-count-full');
  const legacyEls = document.querySelectorAll('.completions-count-number, #completionsCountNumber');
  const pillEls = document.querySelectorAll('.completions-counter-pill, #completionsCounterPill');

  if (animate) {
    fullEls.forEach(el => {
      const currentVal = parseInt(el.textContent.replace(/[^0-9]/g, ''), 10) || Math.max(0, count - 1);
      animateNumber(el, currentVal, count, 1000, (stepVal) => {
        compactEls.forEach(cEl => {
          cEl.textContent = formatCompactNumber(stepVal);
        });
        legacyEls.forEach(lEl => {
          lEl.textContent = formatCompactNumber(stepVal);
        });
      });
    });
  } else {
    compactEls.forEach(el => {
      el.textContent = formatCompactNumber(count);
    });
    fullEls.forEach(el => {
      el.textContent = formatFullNumber(count);
    });
    legacyEls.forEach(el => {
      el.textContent = formatCompactNumber(count);
    });
  }

  pillEls.forEach(pill => {
    pill.classList.remove('opacity-0');
    pill.classList.add('opacity-100');
  });
}

/**
 * Inicializa la pastilla en la cabecera al cargar la página
 */
export async function initCompletionsCounterUI() {
  // 1. Mostrar inmediatamente el valor en caché para evitar saltos o parpadeos (0 ms)
  const cached = getLocalCache();
  updateCounterPillUI(cached, false);

  // 2. Consultar en segundo plano el valor actualizado
  try {
    const liveCount = await fetchCompletionsCount();
    if (liveCount && liveCount !== cached) {
      updateCounterPillUI(liveCount, true);
    }
  } catch (err) {
    console.warn('[Counter] Usando valor de caché:', err);
  }
}

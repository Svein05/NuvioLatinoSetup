import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mountInjectionStep } from './injection.js';
import { refreshStep7Summary } from './summary.js';

function createMockElement(id = '', value = '') {
  const listeners = {};
  return {
    id,
    value,
    innerText: '',
    innerHTML: '',
    className: '',
    style: {},
    classList: {
      toggle: vi.fn(),
      add: vi.fn(),
      remove: vi.fn(),
    },
    addEventListener: vi.fn((evt, fn) => { listeners[evt] = fn; }),
    removeEventListener: vi.fn(),
    trigger: (evt, data) => listeners[evt]?.(data),
    focus: vi.fn(),
  };
}

describe('Step 7: Injection & Summary Module', () => {
  let root;
  let state;
  let elements;

  beforeEach(() => {
    elements = {
      aioPassword: createMockElement('aioPassword'),
      btnGeneratePassword: createMockElement('btnGeneratePassword'),
      btnExecutePipeline: createMockElement('btnExecutePipeline'),
      btnCopyCollectionsJson: createMockElement('btnCopyCollectionsJson'),
      btnCopyAioConfig: createMockElement('btnCopyAioConfig'),
      btnCopyBadgeUrl: createMockElement('btnCopyBadgeUrl'),
      btnCopyBadgeCompiledJson: createMockElement('btnCopyBadgeCompiledJson'),
      btnCopyAioStreamsManifest: createMockElement('btnCopyAioStreamsManifest'),
      btnDownloadCollections: createMockElement('btnDownloadCollections'),
      btnDownloadAioConfig: createMockElement('btnDownloadAioConfig'),
      btnDownloadBadges: createMockElement('btnDownloadBadges'),
      injectionStatusContainer: createMockElement('injectionStatusContainer'),
      injectionPhaseTitle: createMockElement('injectionPhaseTitle'),
      injectionPhaseStep: createMockElement('injectionPhaseStep'),
      injectionProgressBar: createMockElement('injectionProgressBar'),
      injectionPhaseDetail: createMockElement('injectionPhaseDetail'),
      summaryProfileTarget: createMockElement('summaryProfileTarget'),
      summaryCollectionsCount: createMockElement('summaryCollectionsCount'),
      summaryCatalogsCount: createMockElement('summaryCatalogsCount'),
      summaryPosterEngine: createMockElement('summaryPosterEngine'),
      summaryEnrichmentStatus: createMockElement('summaryEnrichmentStatus'),
      summaryBadgesStatus: createMockElement('summaryBadgesStatus'),
      summaryAddonsStatus: createMockElement('summaryAddonsStatus'),
    };

    root = {
      querySelector: vi.fn(selector => {
        const id = selector.replace('#', '');
        return elements[id] || null;
      }),
      querySelectorAll: vi.fn(() => []),
    };

    state = {
      isManualMode: false,
      selectedProfileName: 'Mi Perfil',
      collections: [{ enabled: true, folders: [{ enabled: true }, { enabled: false }] }],
      getSynchronizedMetadataPayload: () => ({ config: { catalogs: [1, 2, 3] } }),
      preferences: { posterEngine: 'betterposter', tmdbEnrichment: true, badgesEnabled: false },
      apiKeys: {},
      profileAddons: [{ isAioStreams: false, name: 'Torrentio' }],
      aiostreams: { installed: true },
      aiometadata: { password: '' },
      validateStep: vi.fn(() => ({ valid: true })),
    };
  });

  it('renders step 7 summary labels correctly', () => {
    refreshStep7Summary(root, state);
    expect(elements.summaryProfileTarget.innerText).toBe('Mi Perfil');
    expect(elements.summaryCollectionsCount.innerText).toBe('1 carruseles seleccionados');
    expect(elements.summaryCatalogsCount.innerText).toBe('3 catálogos sincronizados');
    expect(elements.summaryPosterEngine.innerText).toBe('BetterPoster (es-MX)');
    expect(elements.summaryEnrichmentStatus.innerText).toBe('Solo TMDB (Activo)');
    expect(elements.summaryBadgesStatus.innerText).toBe('Desactivado');
    expect(elements.summaryAddonsStatus.innerText).toBe('AIOMetadata (#1) + AIOStreams');
  });

  it('syncs master password and generates random password', () => {
    const notify = vi.fn();
    const onUpdate = vi.fn();
    const step = mountInjectionStep({ state, actions: { notify, onUpdate, saveSession: vi.fn() }, root });

    elements.aioPassword.value = 'Secret123';
    elements.aioPassword.trigger('input');

    expect(state.aiometadata.password).toBe('Secret123');
    expect(onUpdate).toHaveBeenCalled();

    elements.btnGeneratePassword.trigger('click');
    expect(state.aiometadata.password).toMatch(/^Latino-[a-z0-9]+-\d+$/);
    expect(notify).toHaveBeenCalledWith('Contraseña aleatoria generada y configurada', 'info');

    step.dispose();
  });

  it('prevents execution when a prior step is invalid', () => {
    state.validateStep = vi.fn(stepNum => (stepNum === 2 ? { valid: false, error: 'Perfil no seleccionado' } : { valid: true }));
    const notify = vi.fn();
    const goToStep = vi.fn();
    const executePipeline = vi.fn();

    const step = mountInjectionStep({ state, actions: { notify, goToStep, executePipeline }, root });
    elements.btnExecutePipeline.trigger('click');

    expect(notify).toHaveBeenCalledWith('Paso 2 incompleto: Perfil no seleccionado', 'error');
    expect(goToStep).toHaveBeenCalledWith(2);
    expect(executePipeline).not.toHaveBeenCalled();

    step.dispose();
  });

  it('updates progress on handleLog and handles finished states', () => {
    const notify = vi.fn();
    const showCompletionModal = vi.fn();
    const step = mountInjectionStep({ state, actions: { notify, showCompletionModal }, root });

    step.handleLog({ message: '[2/5] Descargando catálogos...' });
    expect(elements.injectionPhaseStep.innerText).toBe('Fase 2 de 5');
    expect(elements.injectionProgressBar.style.width).toBe('40%');
    expect(elements.injectionPhaseDetail.innerText).toBe('[2/5] Descargando catálogos...');

    step.handleFinished({ isCompleted: true, profileName: 'Familia' });
    expect(elements.injectionPhaseTitle.innerHTML).toContain('¡Configuración inyectada con éxito!');
    expect(notify).toHaveBeenCalledWith('🎉 ¡Aprovisionamiento completado con éxito en Nuvio!', 'success');

    step.dispose();
  });
});

import { describe, it, expect, vi } from 'vitest';
import { createInjectionStepActions } from './injection-actions.js';

describe('injection-actions', () => {
  it('wires callbacks and executes pipeline and downloads', () => {
    const state = {
      isManualMode: false,
      preferences: { selectedBadgePack: 'tinted' },
    };
    const controller = {
      saveSession: vi.fn(),
      updateNavigationButtons: vi.fn(),
      updateStep7ExecuteButton: vi.fn(),
      updateManualModeButtons: vi.fn(),
      showCompletionModal: vi.fn(),
    };
    const notify = vi.fn();
    const executePipeline = vi.fn();
    const recordCompletion = vi.fn().mockResolvedValue();
    const downloadCollectionsJson = vi.fn();
    const downloadAioConfigJson = vi.fn();
    const copyText = vi.fn().mockResolvedValue();

    const actions = createInjectionStepActions({
      state,
      controller,
      notify,
      executePipeline,
      recordCompletion,
      downloadCollectionsJson,
      downloadAioConfigJson,
      copyText,
    });

    actions.onUpdate();
    expect(controller.updateNavigationButtons).toHaveBeenCalled();

    actions.executePipeline();
    expect(executePipeline).toHaveBeenCalled();

    actions.downloadCollectionsJson({ test: 1 });
    expect(downloadCollectionsJson).toHaveBeenCalledWith({ test: 1 });
  });

  it('copies badge json url', async () => {
    const state = { preferences: { selectedBadgePack: 'tinted' } };
    const notify = vi.fn();
    const copyText = vi.fn().mockResolvedValue();

    const actions = createInjectionStepActions({
      state,
      controller: {},
      notify,
      copyText,
    });

    await actions.copyBadgeJsonUrl();
    expect(copyText).toHaveBeenCalled();
    expect(notify).toHaveBeenCalledWith(expect.stringContaining('copiado al portapapeles'), 'success');
  });

  it('announces manual completion once after both files have been exported', () => {
    vi.useFakeTimers();
    try {
      const showCompletionModal = vi.fn();
      const state = { isManualMode: true, manualCopiedCollections: true, manualCopiedAio: false };
      const actions = createInjectionStepActions({ state, controller: { showCompletionModal } });
      actions.checkCompletion();
      expect(showCompletionModal).not.toHaveBeenCalled();
      state.manualCopiedAio = true;
      actions.checkCompletion(); actions.checkCompletion();
      vi.runAllTimers();
      expect(showCompletionModal).toHaveBeenCalledOnce();
    } finally { vi.useRealTimers(); }
  });
});

import { describe, it, expect, vi } from 'vitest';
import { generateAioStreamsManifest } from './generate-aiostreams-manifest.js';

describe('generate-aiostreams-manifest', () => {
  it('warns if password has fewer than 6 characters', async () => {
    const notify = vi.fn();
    const passwordInput = { focus: vi.fn() };
    const state = { aiometadata: { password: '123' } };

    await generateAioStreamsManifest({
      state,
      config: {},
      createConfiguration: vi.fn(),
      fetchTemplate: vi.fn(),
      notify,
      copyText: vi.fn(),
      button: null,
      passwordInput,
    });

    expect(notify).toHaveBeenCalledWith(
      expect.stringContaining('mínimo 6 caracteres'),
      'warning'
    );
    expect(passwordInput.focus).toHaveBeenCalled();
  });

  it('generates configuration and copies manifestUrl', async () => {
    const notify = vi.fn();
    const copyText = vi.fn().mockResolvedValue();
    const createConfiguration = vi.fn().mockResolvedValue({ manifestUrl: 'https://manifest.aio/user' });
    const fetchTemplate = vi.fn().mockResolvedValue({ some: 'template' });
    const state = {
      aiometadata: { password: 'secretpassword' },
      aiostreams: { debrids: { realdebrid: 'rd-key-123' } },
    };
    const button = { disabled: false, innerHTML: 'Original' };

    await generateAioStreamsManifest({
      state,
      config: { aiostreamsInstance: 'https://aio.test' },
      createConfiguration,
      fetchTemplate,
      notify,
      copyText,
      button,
    });

    expect(createConfiguration).toHaveBeenCalled();
    expect(state.aiostreams.manifestUrl).toBe('https://manifest.aio/user');
    expect(copyText).toHaveBeenCalledWith('https://manifest.aio/user');
    expect(notify).toHaveBeenCalledWith(expect.stringContaining('copiado al portapapeles'), 'success');
    expect(button.disabled).toBe(false);
    expect(button.innerHTML).toBe('Original');
  });
});

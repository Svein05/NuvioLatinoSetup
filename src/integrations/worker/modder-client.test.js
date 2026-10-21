import { describe, expect, it, vi } from 'vitest';
import { createModderClient } from './modder-client.js';

describe('modder-client', () => {
  const baseUrl = 'https://worker.nuvio.lat';

  describe('verifyPassword', () => {
    it('returns verification response on success', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, email: 'mod@nuvio.com' }),
      });
      const client = createModderClient({ baseUrl, fetchImpl: mockFetch });

      const res = await client.verifyPassword('secret123', 'mod@nuvio.com');
      expect(res).toEqual({ success: true, email: 'mod@nuvio.com' });
      expect(mockFetch).toHaveBeenCalledWith(
        'https://worker.nuvio.lat/api/verify-auth',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ password: 'secret123', email: 'mod@nuvio.com' }),
        })
      );
    });

    it('throws custom error when credentials are invalid', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        json: async () => ({ error: 'Contraseña incorrecta' }),
      });
      const client = createModderClient({ baseUrl, fetchImpl: mockFetch });

      await expect(client.verifyPassword('wrong')).rejects.toThrow('Contraseña incorrecta');
    });
  });

  describe('saveStagedChanges', () => {
    it('returns commit data on successful publish', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        text: async () => JSON.stringify({ success: true, commit: 'https://github.com/commit/123' }),
      });
      const client = createModderClient({ baseUrl, fetchImpl: mockFetch });

      const res = await client.saveStagedChanges({ addedFiles: [] });
      expect(res.success).toBe(true);
      expect(res.commit).toBe('https://github.com/commit/123');
    });

    it('detects outdated worker plain text response', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        text: async () => 'Nuvio Worker activo v1.0',
      });
      const client = createModderClient({ baseUrl, fetchImpl: mockFetch });

      await expect(client.saveStagedChanges({})).rejects.toThrow(
        /El Cloudflare Worker respondió "Nuvio Worker activo"/
      );
    });

    it('throws error when server responds with error message', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        text: async () => JSON.stringify({ success: false, error: 'Conflicto en rama' }),
      });
      const client = createModderClient({ baseUrl, fetchImpl: mockFetch });

      await expect(client.saveStagedChanges({})).rejects.toThrow('Conflicto en rama');
    });
  });
});

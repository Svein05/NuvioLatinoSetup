import { expect, it, vi } from 'vitest';
import { createWorker } from '../src/index.js';
import { sharedAccess } from '../src/middleware/shared-access.js';

const env = { ADMIN_PASSWORD: 'synthetic-admin', MODDER_PASSWORD: 'synthetic-modder',
  MODDER_ACCOUNTS: '["test@example.invalid"]', GITHUB_TOKEN: 'synthetic-token', GITHUB_BRANCH: 'test' };
const image = btoa('RIFF0000WEBPsynthetic-image');
const path = 'assets/profile_icons/Style/Title/Avatar.webp';

function request(payload, route = '/api/save-staged-changes') {
  return new Request(`https://worker.invalid${route}`, { method: 'POST',
    body: JSON.stringify({ password: env.MODDER_PASSWORD, email: 'test@example.invalid', ...payload }) });
}

function github(failure) {
  return vi.fn(async (url, options) => {
    const resource = new URL(url).pathname;
    if (failure) {
      const result = failure(resource, options);
      if (result) return result;
    }
    if (resource.endsWith('/git/ref/heads/test')) return Response.json({ object: { sha: 'parent' } });
    if (resource.endsWith('/git/commits/parent')) return Response.json({ tree: { sha: 'base-tree' } });
    if (resource.includes('/contents/')) return Response.json({ sha: 'existing-blob' });
    if (resource.endsWith('/git/blobs')) return Response.json({ sha: 'new-blob' });
    if (resource.endsWith('/git/trees')) return Response.json({ sha: 'new-tree' });
    if (resource.endsWith('/git/commits')) return Response.json({ sha: 'new-commit' });
    if (resource.endsWith('/git/refs/heads/test')) return Response.json({ object: { sha: 'new-commit' } });
    throw new Error('Unexpected synthetic request');
  });
}

it('checks configured collaborator restrictions even when email is missing', () => {
  expect(sharedAccess(env.MODDER_PASSWORD, '', env)).toBeNull();
  expect(sharedAccess(env.MODDER_PASSWORD, 'other@example.invalid', env)).toBeNull();
  expect(sharedAccess(env.MODDER_PASSWORD, 'TEST@example.invalid', env)).toBe('modder');
  expect(sharedAccess(env.ADMIN_PASSWORD, '', env)).toBe('admin');
  expect(sharedAccess('', '', {})).toBeNull();
});

it('verifies access without contacting GitHub and rejects unauthenticated writes', async () => {
  const fetchImpl = vi.fn();
  const worker = createWorker({ fetchImpl });
  const verified = await worker.fetch(request({}, '/api/verify-auth'), env);
  expect(await verified.json()).toEqual({ success: true, role: 'modder' });
  const denied = await worker.fetch(request({ password: 'wrong' }), env);
  expect(denied.status).toBe(401);
  expect(fetchImpl).not.toHaveBeenCalled();
});

it.each([
  { addedFiles: [{ path: '../../outside.webp', base64: image }] },
  { addedFiles: [{ path, base64: 'invalid' }] },
  { addedFiles: [{ path, base64: image }, { path, base64: image }] },
  { addedFiles: 'invalid' },
  { renamedFiles: [{ oldPath: path, newPath: 'assets/profile_icons/../../outside.webp' }] },
])('rejects an invalid batch before any network operation: %j', async payload => {
  const fetchImpl = vi.fn();
  const response = await createWorker({ fetchImpl }).fetch(request(payload), env);
  expect([400, 403]).toContain(response.status);
  expect(fetchImpl).not.toHaveBeenCalled();
});

it('rejects oversized bodies and malformed JSON before a GitHub call', async () => {
  const fetchImpl = vi.fn();
  const response = await createWorker({ fetchImpl }).fetch(new Request('https://worker.invalid/api/verify-auth', {
    method: 'POST', headers: { 'content-length': '999999999' }, body: '{}',
  }), env);
  expect(response.status).toBe(413);
  const invalid = await createWorker({ fetchImpl }).fetch(new Request('https://worker.invalid/api/verify-auth', {
    method: 'POST', body: 'not json',
  }), env);
  expect(invalid.status).toBe(400);
  expect(fetchImpl).not.toHaveBeenCalled();
});

it('publishes one tree and one non-forced reference update while preserving path case', async () => {
  const fetchImpl = github();
  const response = await createWorker({ fetchImpl }).fetch(request({ addedFiles: [{ path, base64: image }] }), env);
  expect(response.status).toBe(200);
  expect(await response.json()).toMatchObject({ success: true, count: 1 });
  const tree = fetchImpl.mock.calls.find(([url]) => url.endsWith('/git/trees'));
  expect(JSON.parse(tree[1].body)).toEqual({ base_tree: 'base-tree', tree: [{ path, mode: '100644', type: 'blob', sha: 'new-blob' }] });
  const updates = fetchImpl.mock.calls.filter(([, options]) => options.method === 'PATCH');
  expect(updates).toHaveLength(1);
  expect(JSON.parse(updates[0][1].body)).toEqual({ sha: 'new-commit', force: false });
});

it('does not silently skip an unreadable rename or publish a partial batch', async () => {
  const fetchImpl = github(resource => resource.includes('/contents/') ? Response.json({}, { status: 404 }) : null);
  const response = await createWorker({ fetchImpl }).fetch(request({ renamedFiles: [{ oldPath: path,
    newPath: 'assets/profile_icons/Style/Title/Renamed.webp' }] }), env);
  expect(response.status).toBe(502);
  expect(fetchImpl.mock.calls.some(([, options]) => options.method === 'PATCH')).toBe(false);
});

it('reports unknown outcomes without retrying a reference update after network failure', async () => {
  const fetchImpl = github(resource => {
    if (resource.endsWith('/git/refs/heads/test')) throw new TypeError('synthetic network failure');
  });
  const response = await createWorker({ fetchImpl }).fetch(request({ deletedFiles: [path] }), env);
  expect(await response.json()).toMatchObject({ outcome: 'unknown' });
  expect(fetchImpl.mock.calls.filter(([, options]) => options.method === 'PATCH')).toHaveLength(1);
});

it('allows only configured HTTPS proxy hosts and does not forward collaborator secrets or cookies', async () => {
  const fetchImpl = vi.fn(async () => Response.json({ synthetic: true }));
  const worker = createWorker({ fetchImpl });
  const blocked = await worker.fetch(new Request('https://worker.invalid/https://private.invalid/api'), env);
  expect(blocked.status).toBe(403);
  expect(fetchImpl).not.toHaveBeenCalled();
  const allowed = await worker.fetch(new Request('https://worker.invalid/https://aiometadata.elfhosted.com/manifest.json', {
    headers: { cookie: 'synthetic', 'x-admin-password': 'synthetic' },
  }), env);
  expect(allowed.status).toBe(200);
  expect(fetchImpl.mock.calls[0][1].headers.has('cookie')).toBe(false);
  expect(fetchImpl.mock.calls[0][1].headers.has('x-admin-password')).toBe(false);
});

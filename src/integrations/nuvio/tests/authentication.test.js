import { expect, it, vi } from 'vitest';
import { login, signup } from '../authentication.js';

const context = { apiUrl: 'https://nuvio.invalid', apikey: 'synthetic-public',
  email: ' Test@example.invalid ', password: ' synthetic-password ' };
const session = { access_token: 'synthetic-token', user: { id: 'synthetic-user' }, expires_in: 60 };

it('sends the supported login contract and normalizes expiry without persisting a password', async () => {
  const fetchImpl = vi.fn(async () => Response.json(session));
  const result = await login({ ...context, fetchImpl, now: () => 1000 });
  expect(result).toEqual({ accessToken: 'synthetic-token', userId: 'synthetic-user', user: session.user, expiresAt: 61000 });
  expect(fetchImpl.mock.calls[0][0]).toBe('https://nuvio.invalid/auth/v1/token?grant_type=password');
  expect(JSON.parse(fetchImpl.mock.calls[0][1].body)).toEqual({ email: 'Test@example.invalid', password: context.password });
  expect(result).not.toHaveProperty('password');
});

it('uses an immediate signup session without a second authentication request', async () => {
  const fetchImpl = vi.fn(async () => Response.json(session));
  expect(await signup({ ...context, fetchImpl })).toMatchObject({ accessToken: 'synthetic-token' });
  expect(fetchImpl).toHaveBeenCalledTimes(1);
});

it('logs in once after a confirmed registration that did not include a token', async () => {
  const fetchImpl = vi.fn().mockResolvedValueOnce(Response.json({ user: session.user })).mockResolvedValueOnce(Response.json(session));
  expect(await signup({ ...context, fetchImpl })).toMatchObject({ userId: 'synthetic-user' });
  expect(fetchImpl).toHaveBeenCalledTimes(2);
});

it.each(['user_already_exists', 'email_not_confirmed', 'invalid_credentials'])('maps provider error %s without exposing the response body', async code => {
  const fetchImpl = vi.fn(async () => Response.json({ error_code: code, message: context.password }, { status: 400 }));
  await expect(signup({ ...context, fetchImpl })).rejects.toMatchObject({ code });
  await signup({ ...context, fetchImpl }).catch(error => expect(error.message).not.toContain(context.password));
});

it('does not retry a registration with unknown outcome and rejects incomplete sessions', async () => {
  const fetchImpl = vi.fn(async () => { throw new TypeError('offline'); });
  await expect(signup({ ...context, fetchImpl })).rejects.toMatchObject({ outcome: 'unknown' });
  expect(fetchImpl).toHaveBeenCalledTimes(1);
  await expect(login({ ...context, fetchImpl: async () => Response.json({ user: session.user }) })).rejects.toThrow('incompleta');
});

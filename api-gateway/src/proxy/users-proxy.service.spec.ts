import type { Request } from 'express';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { UsersProxyService } from './users-proxy.service.js';

describe('UsersProxyService', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it('forwards the path, query, method, authorization, and body', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('ok'));
    vi.stubGlobal('fetch', fetchMock);
    vi.stubEnv('USERS_SERVICE_URL', 'http://users.internal:3002');

    const service = new UsersProxyService();
    const request = {
      originalUrl: '/auth/login?source=web',
      method: 'POST',
      headers: {
        authorization: 'Bearer access-token',
        'content-type': 'application/json',
      },
      body: { email: 'user@example.com', password: 'secret' },
    } as Request;

    await service.forward(request);

    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, options] = fetchMock.mock.calls[0] as [URL, RequestInit];
    expect(url.toString()).toBe(
      'http://users.internal:3002/auth/login?source=web',
    );
    expect(options.method).toBe('POST');
    expect(new Headers(options.headers).get('authorization')).toBe(
      'Bearer access-token',
    );
    expect(options.body).toBe(
      JSON.stringify({ email: 'user@example.com', password: 'secret' }),
    );
  });

  it('returns a gateway error when the users service cannot be reached', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));

    const service = new UsersProxyService();

    await expect(
      service.forward({
        originalUrl: '/users/me',
        method: 'GET',
        headers: {},
      } as Request),
    ).rejects.toMatchObject({
      status: 502,
      message: 'Users service is unavailable',
    });
  });
});

import type { Request } from 'express';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { UsersProxyService } from './users-proxy.service.js';

describe('UsersProxyService', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('forwards the path, query, method, authorization, and body', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('ok'));
    vi.stubGlobal('fetch', fetchMock);

    const service = new UsersProxyService({
      port: 3000,
      usersServiceUrl: new URL('http://users.internal:3002'),
      ordersServiceUrl: new URL('http://orders.internal:3001/api'),
    });
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

    const service = new UsersProxyService({
      port: 3000,
      usersServiceUrl: new URL('http://localhost:3002'),
      ordersServiceUrl: new URL('http://localhost:3001/api'),
    });

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

  it('forwards Orders routes through the configured API prefix', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('ok'));
    vi.stubGlobal('fetch', fetchMock);
    const config = {
      port: 3000,
      usersServiceUrl: new URL('http://localhost:3002'),
      ordersServiceUrl: new URL('http://orders.internal:3001/api'),
    };
    const service = new UsersProxyService(config);

    await service.forward(
      {
        originalUrl: '/orders/order-1?expand=items',
        method: 'GET',
        headers: {},
      } as Request,
      config.ordersServiceUrl,
      'Orders',
    );

    expect(fetchMock).toHaveBeenCalledOnce();
    expect(fetchMock.mock.calls[0]?.[0].toString()).toBe(
      'http://orders.internal:3001/api/orders/order-1?expand=items',
    );
  });
});

import type { Request } from 'express';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CatalogProxyService } from './catalog-proxy.service.js';

describe('CatalogProxyService', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('forwards the product path, query, method, authorization, and body', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('ok'));
    vi.stubGlobal('fetch', fetchMock);

    const service = new CatalogProxyService({
      port: 3000,
      usersServiceUrl: new URL('http://users.internal:3002'),
      catalogServiceUrl: new URL('http://catalog.internal:3006/api/'),
    });
    const request = {
      originalUrl: '/products?category=Papeler%C3%ADa',
      method: 'POST',
      headers: {
        authorization: 'Bearer access-token',
        'content-type': 'application/json',
      },
      body: { name: 'Cuaderno', price: 12000 },
    } as Request;

    await service.forward(request);

    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, options] = fetchMock.mock.calls[0] as [URL, RequestInit];
    expect(url.toString()).toBe(
      'http://catalog.internal:3006/api/products?category=Papeler%C3%ADa',
    );
    expect(options.method).toBe('POST');
    expect(new Headers(options.headers).get('authorization')).toBe(
      'Bearer access-token',
    );
    expect(options.body).toBe(
      JSON.stringify({ name: 'Cuaderno', price: 12000 }),
    );
  });

  it('returns a gateway error when the catalog service cannot be reached', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));

    const service = new CatalogProxyService({
      port: 3000,
      usersServiceUrl: new URL('http://localhost:3002'),
      catalogServiceUrl: new URL('http://localhost:3006'),
    });

    await expect(
      service.forward({
        originalUrl: '/products',
        method: 'GET',
        headers: {},
      } as Request),
    ).rejects.toMatchObject({
      status: 502,
      message: 'Catalog service is unavailable',
    });
  });
});

import type { Request } from 'express';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SearchProxyService } from './search-proxy.service.js';

describe('SearchProxyService', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('forwards the search path, query, method, and authorization', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('ok'));
    vi.stubGlobal('fetch', fetchMock);

    const service = new SearchProxyService({
      port: 3000,
      usersServiceUrl: new URL('http://users.internal:3002'),
      catalogServiceUrl: new URL('http://catalog.internal:3006'),
      searchServiceUrl: new URL('http://search.internal:3007/api/'),
    });
    const request = {
      originalUrl: '/search?q=cuaderno&page=2&limit=10',
      method: 'GET',
      headers: { authorization: 'Bearer access-token' },
    } as Request;

    await service.forward(request);

    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, options] = fetchMock.mock.calls[0] as [URL, RequestInit];
    expect(url.toString()).toBe(
      'http://search.internal:3007/api/search?q=cuaderno&page=2&limit=10',
    );
    expect(options.method).toBe('GET');
    expect(new Headers(options.headers).get('authorization')).toBe(
      'Bearer access-token',
    );
  });

  it('returns a gateway error when the search service cannot be reached', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));

    const service = new SearchProxyService({
      port: 3000,
      usersServiceUrl: new URL('http://localhost:3002'),
      catalogServiceUrl: new URL('http://localhost:3006'),
      searchServiceUrl: new URL('http://localhost:3007'),
    });

    await expect(
      service.forward({
        originalUrl: '/search?q=cuaderno',
        method: 'GET',
        headers: {},
      } as Request),
    ).rejects.toMatchObject({
      status: 502,
      message: 'Search service is unavailable',
    });
  });
});

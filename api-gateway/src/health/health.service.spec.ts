import { afterEach, describe, expect, it, vi } from 'vitest';
import { HealthService } from './health.service.js';

describe('HealthService', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('reports the gateway ready when all backend services respond successfully', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('ok'));
    vi.stubGlobal('fetch', fetchMock);
    const service = new HealthService({
      port: 3000,
      usersServiceUrl: new URL('http://users.internal:3002/base/'),
      catalogServiceUrl: new URL('http://catalog.internal:3006/catalog/'),
      searchServiceUrl: new URL('http://search.internal:3007/search-api/'),
    });

    await expect(service.checkReadiness()).resolves.toEqual({
      status: 'ok',
      services: {
        'users-service': 'available',
        'catalog-service': 'available',
        'search-service': 'available',
      },
    });
    expect(fetchMock).toHaveBeenCalledWith(
      new URL('http://users.internal:3002/base/api/docs'),
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
    expect(fetchMock).toHaveBeenCalledWith(
      new URL('http://catalog.internal:3006/catalog/api/docs'),
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
    expect(fetchMock).toHaveBeenCalledWith(
      new URL('http://search.internal:3007/search-api/api/docs'),
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
  });

  it('reports catalog-service unavailable when it responds with a server error', async () => {
    vi.stubGlobal('fetch', (url: URL) =>
      Promise.resolve(
        new Response('', {
          status: url.hostname === 'catalog.internal' ? 503 : 200,
        }),
      ),
    );
    const service = new HealthService({
      port: 3000,
      usersServiceUrl: new URL('http://users.internal:3002'),
      catalogServiceUrl: new URL('http://catalog.internal:3006'),
      searchServiceUrl: new URL('http://search.internal:3007'),
    });

    await expect(service.checkReadiness()).resolves.toEqual({
      status: 'unavailable',
      services: {
        'users-service': 'available',
        'catalog-service': 'unavailable',
        'search-service': 'available',
      },
    });
  });

  it('reports search-service unavailable when the request fails', async () => {
    vi.stubGlobal('fetch', (url: URL) =>
      url.hostname === 'search.internal'
        ? Promise.reject(new Error('offline'))
        : Promise.resolve(new Response('ok')),
    );
    const service = new HealthService({
      port: 3000,
      usersServiceUrl: new URL('http://users.internal:3002'),
      catalogServiceUrl: new URL('http://catalog.internal:3006'),
      searchServiceUrl: new URL('http://search.internal:3007'),
    });

    await expect(service.checkReadiness()).resolves.toEqual({
      status: 'unavailable',
      services: {
        'users-service': 'available',
        'catalog-service': 'available',
        'search-service': 'unavailable',
      },
    });
  });
});

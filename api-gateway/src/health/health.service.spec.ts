import { afterEach, describe, expect, it, vi } from 'vitest';
import { HealthService } from './health.service.js';

describe('HealthService', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('reports the gateway ready when Users and Orders respond successfully', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('ok'));
    vi.stubGlobal('fetch', fetchMock);
    const service = new HealthService({
      port: 3000,
      usersServiceUrl: new URL('http://users.internal:3002/base/'),
      ordersServiceUrl: new URL('http://orders.internal:3001/api'),
    });

    await expect(service.checkReadiness()).resolves.toEqual({
      status: 'ok',
      services: {
        'users-service': 'available',
        'orders-service': 'available',
      },
    });
    expect(fetchMock).toHaveBeenCalledWith(
      new URL('http://users.internal:3002/base/api/docs'),
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
    expect(fetchMock).toHaveBeenCalledWith(
      new URL('http://orders.internal:3001/api/health'),
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
  });

  it('reports a dependency unavailable when it responds with a server error', async () => {
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce(new Response('ok'))
      .mockResolvedValueOnce(new Response('', { status: 503 })));
    const service = new HealthService({
      port: 3000,
      usersServiceUrl: new URL('http://users.internal:3002'),
      ordersServiceUrl: new URL('http://orders.internal:3001/api'),
    });

    await expect(service.checkReadiness()).resolves.toEqual({
      status: 'unavailable',
      services: {
        'users-service': 'available',
        'orders-service': 'unavailable',
      },
    });
  });

  it('reports users-service unavailable when the request fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
    const service = new HealthService({
      port: 3000,
      usersServiceUrl: new URL('http://users.internal:3002'),
      ordersServiceUrl: new URL('http://orders.internal:3001/api'),
    });

    await expect(service.checkReadiness()).resolves.toEqual({
      status: 'unavailable',
      services: {
        'users-service': 'unavailable',
        'orders-service': 'unavailable',
      },
    });
  });
});

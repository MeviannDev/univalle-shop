import { afterEach, describe, expect, it, vi } from 'vitest';
import { HealthService } from './health.service.js';

describe('HealthService', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('reports the gateway ready when users-service responds successfully', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('ok'));
    vi.stubGlobal('fetch', fetchMock);
    const service = new HealthService({
      port: 3000,
      usersServiceUrl: new URL('http://users.internal:3002/base/'),
    });

    await expect(service.checkReadiness()).resolves.toEqual({
      status: 'ok',
      services: { 'users-service': 'available' },
    });
    expect(fetchMock).toHaveBeenCalledWith(
      new URL('http://users.internal:3002/base/api/docs'),
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
  });

  it('reports users-service unavailable when it responds with a server error', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response('', { status: 503 })),
    );
    const service = new HealthService({
      port: 3000,
      usersServiceUrl: new URL('http://users.internal:3002'),
    });

    await expect(service.checkReadiness()).resolves.toEqual({
      status: 'unavailable',
      services: { 'users-service': 'unavailable' },
    });
  });

  it('reports users-service unavailable when the request fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
    const service = new HealthService({
      port: 3000,
      usersServiceUrl: new URL('http://users.internal:3002'),
    });

    await expect(service.checkReadiness()).resolves.toEqual({
      status: 'unavailable',
      services: { 'users-service': 'unavailable' },
    });
  });
});

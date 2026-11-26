import { describe, expect, it } from 'vitest';
import { loadAppConfig } from './app-config.js';

describe('loadAppConfig', () => {
  it('uses the defaults when environment variables are absent', () => {
    expect(loadAppConfig({})).toEqual({
      port: 3000,
      usersServiceUrl: new URL('http://localhost:3002'),
      ordersServiceUrl: new URL('http://localhost:3001/api'),
    });
  });

  it('enables Observe when both credentials are configured', () => {
    expect(
      loadAppConfig({
        OBSERVE_APP_KEY: 'app-key',
        OBSERVE_APP_SECRET: 'app-secret',
      }).observe,
    ).toEqual({ appKey: 'app-key', appSecret: 'app-secret' });
  });

  it('rejects incomplete Observe credentials', () => {
    expect(() => loadAppConfig({ OBSERVE_APP_KEY: 'app-key' })).toThrow(
      'OBSERVE_APP_KEY and OBSERVE_APP_SECRET must both be configured',
    );
  });

  it('loads a valid port and users service URL', () => {
    expect(
      loadAppConfig({
        PORT: '3100',
        USERS_SERVICE_URL: 'https://users.example.com/api/',
      }),
    ).toEqual({
      port: 3100,
      usersServiceUrl: new URL('https://users.example.com/api/'),
      ordersServiceUrl: new URL('http://localhost:3001/api'),
    });
  });

  it.each(['0', '-1', '65536', '3.14', 'abc'])(
    'rejects invalid PORT value %s',
    (port) => {
      expect(() => loadAppConfig({ PORT: port })).toThrow(
        'PORT must be an integer between 1 and 65535',
      );
    },
  );

  it.each([
    'not a URL',
    'ftp://users.example.com',
    'http://user:password@users.example.com',
    'http://users.example.com?debug=true',
    'http://users.example.com#section',
  ])('rejects invalid USERS_SERVICE_URL value %s', (url) => {
    expect(() => loadAppConfig({ USERS_SERVICE_URL: url })).toThrow(
      'USERS_SERVICE_URL',
    );
  });

  it('loads the Orders service URL with its API prefix', () => {
    expect(
      loadAppConfig({
        ORDERS_SERVICE_URL: 'http://orders.internal:3001/api/',
      }).ordersServiceUrl,
    ).toEqual(new URL('http://orders.internal:3001/api/'));
  });

  it.each([
    'not a URL',
    'ftp://orders.example.com',
    'http://user:password@orders.example.com',
    'http://orders.example.com?debug=true',
  ])('rejects invalid ORDERS_SERVICE_URL value %s', (url) => {
    expect(() => loadAppConfig({ ORDERS_SERVICE_URL: url })).toThrow(
      'ORDERS_SERVICE_URL',
    );
  });
});

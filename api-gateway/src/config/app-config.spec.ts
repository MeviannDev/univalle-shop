import { describe, expect, it } from 'vitest';
import { loadAppConfig } from './app-config.js';

describe('loadAppConfig', () => {
  it('uses the defaults when environment variables are absent', () => {
    expect(loadAppConfig({})).toEqual({
      port: 3000,
      usersServiceUrl: new URL('http://localhost:3002'),
      catalogServiceUrl: new URL('http://localhost:3006'),
      searchServiceUrl: new URL('http://localhost:3007'),
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
      catalogServiceUrl: new URL('http://localhost:3006'),
      searchServiceUrl: new URL('http://localhost:3007'),
    });
  });

  it('loads a catalog service URL', () => {
    expect(
      loadAppConfig({
        CATALOG_SERVICE_URL: 'https://catalog.example.com/api/',
      }).catalogServiceUrl,
    ).toEqual(new URL('https://catalog.example.com/api/'));
  });

  it('loads a search service URL', () => {
    expect(
      loadAppConfig({
        SEARCH_SERVICE_URL: 'https://search.example.com/api/',
      }).searchServiceUrl,
    ).toEqual(new URL('https://search.example.com/api/'));
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

  it.each([
    'not a URL',
    'ftp://catalog.example.com',
    'http://user:password@catalog.example.com',
    'http://catalog.example.com?debug=true',
    'http://catalog.example.com#section',
  ])('rejects invalid CATALOG_SERVICE_URL value %s', (url) => {
    expect(() => loadAppConfig({ CATALOG_SERVICE_URL: url })).toThrow(
      'CATALOG_SERVICE_URL',
    );
  });

  it.each([
    'not a URL',
    'ftp://search.example.com',
    'http://user:password@search.example.com',
    'http://search.example.com?debug=true',
    'http://search.example.com#section',
  ])('rejects invalid SEARCH_SERVICE_URL value %s', (url) => {
    expect(() => loadAppConfig({ SEARCH_SERVICE_URL: url })).toThrow(
      'SEARCH_SERVICE_URL',
    );
  });
});

export interface AppConfig {
  readonly port: number;
  readonly usersServiceUrl: URL;
  readonly catalogServiceUrl: URL;
  readonly searchServiceUrl: URL;
  readonly observe?: {
    readonly appKey: string;
    readonly appSecret: string;
  };
}

export const APP_CONFIG = Symbol('APP_CONFIG');

export function loadAppConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const rawPort = env.PORT ?? '3000';
  if (!/^\d+$/.test(rawPort)) {
    throw new Error('PORT must be an integer between 1 and 65535');
  }

  const port = Number(rawPort);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('PORT must be an integer between 1 and 65535');
  }

  const usersServiceUrl = loadServiceUrl(
    env.USERS_SERVICE_URL,
    'http://localhost:3002',
    'USERS_SERVICE_URL',
  );
  const catalogServiceUrl = loadServiceUrl(
    env.CATALOG_SERVICE_URL,
    'http://localhost:3006',
    'CATALOG_SERVICE_URL',
  );
  const searchServiceUrl = loadServiceUrl(
    env.SEARCH_SERVICE_URL,
    'http://localhost:3007',
    'SEARCH_SERVICE_URL',
  );

  const appKey = env.OBSERVE_APP_KEY?.trim();
  const appSecret = env.OBSERVE_APP_SECRET?.trim();

  if (!!appKey !== !!appSecret) {
    throw new Error(
      'OBSERVE_APP_KEY and OBSERVE_APP_SECRET must both be configured to enable telemetry',
    );
  }

  return {
    port,
    usersServiceUrl,
    catalogServiceUrl,
    searchServiceUrl,
    ...(appKey && appSecret ? { observe: { appKey, appSecret } } : {}),
  };
}

function loadServiceUrl(
  rawUrl: string | undefined,
  defaultUrl: string,
  variableName: string,
): URL {
  let serviceUrl: URL;
  try {
    serviceUrl = new URL(rawUrl ?? defaultUrl);
  } catch (error) {
    throw new Error(`${variableName} must be a valid absolute URL`, {
      cause: error,
    });
  }

  if (
    !['http:', 'https:'].includes(serviceUrl.protocol) ||
    serviceUrl.username ||
    serviceUrl.password ||
    serviceUrl.search ||
    serviceUrl.hash
  ) {
    throw new Error(
      `${variableName} must use HTTP(S) and cannot include credentials, a query, or a fragment`,
    );
  }

  return serviceUrl;
}

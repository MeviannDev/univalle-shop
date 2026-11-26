export interface AppConfig {
  readonly port: number;
  readonly usersServiceUrl: URL;
  readonly ordersServiceUrl: URL;
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
    'USERS_SERVICE_URL',
    env.USERS_SERVICE_URL ?? 'http://localhost:3002',
  );
  const ordersServiceUrl = loadServiceUrl(
    'ORDERS_SERVICE_URL',
    env.ORDERS_SERVICE_URL ?? 'http://localhost:3001/api',
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
    ordersServiceUrl,
    ...(appKey && appSecret ? { observe: { appKey, appSecret } } : {}),
  };
}

function loadServiceUrl(name: string, value: string): URL {
  let url: URL;
  try {
    url = new URL(value);
  } catch (error) {
    throw new Error(`${name} must be a valid absolute URL`, { cause: error });
  }

  if (
    !['http:', 'https:'].includes(url.protocol) ||
    url.username ||
    url.password ||
    url.search ||
    url.hash
  ) {
    throw new Error(
      `${name} must use HTTP(S) and cannot include credentials, a query, or a fragment`,
    );
  }
  return url;
}

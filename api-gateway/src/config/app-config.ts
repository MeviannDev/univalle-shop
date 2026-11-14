export interface AppConfig {
  readonly port: number;
  readonly usersServiceUrl: URL;
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

  let usersServiceUrl: URL;
  try {
    usersServiceUrl = new URL(env.USERS_SERVICE_URL ?? 'http://localhost:3002');
  } catch (error) {
    throw new Error('USERS_SERVICE_URL must be a valid absolute URL', {
      cause: error,
    });
  }

  if (
    !['http:', 'https:'].includes(usersServiceUrl.protocol) ||
    usersServiceUrl.username ||
    usersServiceUrl.password ||
    usersServiceUrl.search ||
    usersServiceUrl.hash
  ) {
    throw new Error(
      'USERS_SERVICE_URL must use HTTP(S) and cannot include credentials, a query, or a fragment',
    );
  }

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
    ...(appKey && appSecret ? { observe: { appKey, appSecret } } : {}),
  };
}

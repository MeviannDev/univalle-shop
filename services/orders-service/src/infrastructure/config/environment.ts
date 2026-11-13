const ADAPTERS = ['stub', 'http'] as const;
const DEVELOPMENT_JWT_SECRET = 'development-only-secret-change-before-deploy-32';
const DEVELOPMENT_INTERNAL_API_KEY = 'development-only-internal-api-key-change-before-deploy';

function isValidAdapter(value: string | undefined): value is (typeof ADAPTERS)[number] {
  return value !== undefined && ADAPTERS.includes(value as (typeof ADAPTERS)[number]);
}

export function validateEnvironment(environment: Record<string, unknown>): Record<string, unknown> {
  const env = environment as Record<string, string | undefined>;
  const nodeEnv = env.NODE_ENV ?? 'development';

  if (!env.MONGODB_URI?.trim()) {
    throw new Error('MONGODB_URI es obligatorio');
  }
  if (!env.MONGODB_DATABASE?.trim()) {
    throw new Error('MONGODB_DATABASE es obligatorio');
  }
  if (!env.JWT_SECRET || Buffer.byteLength(env.JWT_SECRET) < 32) {
    throw new Error('JWT_SECRET debe tener al menos 32 bytes');
  }
  if (
    nodeEnv === 'production' &&
    env.JWT_SECRET === DEVELOPMENT_JWT_SECRET
  ) {
    throw new Error('JWT_SECRET de desarrollo no se permite en producción');
  }
  if (
    env.STUB_PAYMENT_RESULT !== undefined &&
    !['PENDING', 'APPROVED', 'REJECTED'].includes(env.STUB_PAYMENT_RESULT)
  ) {
    throw new Error('STUB_PAYMENT_RESULT debe ser PENDING, APPROVED o REJECTED');
  }
  if (!env.INTERNAL_SERVICE_API_KEY || Buffer.byteLength(env.INTERNAL_SERVICE_API_KEY) < 32) {
    throw new Error('INTERNAL_SERVICE_API_KEY debe tener al menos 32 bytes');
  }
  if (
    nodeEnv === 'production' &&
    env.INTERNAL_SERVICE_API_KEY === DEVELOPMENT_INTERNAL_API_KEY
  ) {
    throw new Error('INTERNAL_SERVICE_API_KEY de desarrollo no se permite en producción');
  }

  for (const adapterName of ['USERS_ADAPTER', 'CATALOG_ADAPTER', 'PAYMENTS_ADAPTER']) {
    const adapter = env[adapterName] ?? 'stub';
    if (!isValidAdapter(adapter)) {
      throw new Error(`${adapterName} debe ser "stub" o "http"`);
    }
    if (adapter === 'http') {
      const urlNames: Record<string, string> = {
        USERS_ADAPTER: 'USERS_SERVICE_URL',
        CATALOG_ADAPTER: 'CATALOG_SERVICE_URL',
        PAYMENTS_ADAPTER: 'PAYMENTS_SERVICE_URL',
      };
      const urlName = urlNames[adapterName]!;
      if (!env[urlName]?.trim()) {
        throw new Error(`${urlName} es obligatorio cuando ${adapterName}=http`);
      }
    }
  }

  for (const timeoutName of [
    'USERS_TIMEOUT_MS',
    'CATALOG_TIMEOUT_MS',
    'PAYMENTS_TIMEOUT_MS',
    'MONGODB_SERVER_SELECTION_TIMEOUT_MS',
  ]) {
    const value = env[timeoutName];
    if (value !== undefined && (!/^\d+$/.test(value) || Number(value) < 1)) {
      throw new Error(`${timeoutName} debe ser un entero positivo`);
    }
  }
  if (!['development', 'test', 'production'].includes(nodeEnv)) {
    throw new Error('NODE_ENV debe ser development, test o production');
  }
  return { ...environment, NODE_ENV: nodeEnv };
}

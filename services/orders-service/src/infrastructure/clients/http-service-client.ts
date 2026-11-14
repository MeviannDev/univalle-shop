import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RequestIdContext } from './request-id.context.js';

export class ExternalHttpError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ExternalHttpError';
  }
}

@Injectable()
export class HttpServiceClient {
  constructor(
    private readonly requestIds: RequestIdContext,
    private readonly config: ConfigService,
  ) {}

  async request<T>(
    service: 'users' | 'catalog' | 'payments',
    path: string,
    options: {
      method?: string;
      token?: string;
      body?: unknown;
      idempotent?: boolean;
    } = {},
  ): Promise<T> {
    const baseUrl = this.config.getOrThrow<string>(`${service.toUpperCase()}_SERVICE_URL`);
    const timeout = this.config.get<number>(`${service.toUpperCase()}_TIMEOUT_MS`, 3000);
    const attempts = options.idempotent ? 2 : 1;
    let lastError: unknown;

    for (let attempt = 0; attempt < attempts; attempt += 1) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);
      try {
        const headers = new Headers({
          accept: 'application/json',
          'x-request-id': this.requestIds.current() ?? 'orders-service',
        });
        if (options.body !== undefined) {
          headers.set('content-type', 'application/json');
        }
        if (options.token) {
          headers.set('authorization', `Bearer ${options.token}`);
        }
        const response = await fetch(new URL(path, baseUrl), {
          method: options.method ?? 'GET',
          headers,
          body: options.body === undefined ? undefined : JSON.stringify(options.body),
          signal: controller.signal,
        });
        if (!response.ok) {
          const error = new ExternalHttpError(response.status, `HTTP ${response.status}`);
          if (options.idempotent && response.status >= 500 && attempt + 1 < attempts) {
            lastError = error;
            continue;
          }
          throw error;
        }
        if (response.status === 204) {
          return undefined as T;
        }
        const contentType = response.headers.get('content-type') ?? '';
        if (!contentType.includes('application/json')) {
          throw new ExternalHttpError(502, 'Respuesta externa no JSON');
        }
        return (await response.json()) as T;
      } catch (error) {
        lastError = error;
        if (error instanceof ExternalHttpError) {
          throw error;
        }
        if (!(options.idempotent && attempt + 1 < attempts)) {
          throw error;
        }
      } finally {
        clearTimeout(timeoutId);
      }
    }
    throw lastError instanceof Error ? lastError : new Error('La solicitud externa falló');
  }
}

import { BadGatewayException, Inject, Injectable } from '@nestjs/common';
import type { Request } from 'express';
import { APP_CONFIG, type AppConfig } from '../config/app-config.js';

const REQUEST_HEADERS = [
  'accept',
  'accept-language',
  'authorization',
  'content-type',
  'cookie',
  'idempotency-key',
  'user-agent',
  'x-request-id',
];

@Injectable()
export class UsersProxyService {
  constructor(@Inject(APP_CONFIG) private readonly config: AppConfig) {}

  async forward(
    request: Request,
    serviceUrl: URL = this.config.usersServiceUrl,
    serviceName = 'Users',
  ): Promise<globalThis.Response> {
    const basePath = serviceUrl.pathname.replace(/\/+$/, '');
    const targetUrl = new URL(
      `${basePath}${request.originalUrl}`,
      serviceUrl.origin,
    );
    const headers = new Headers();

    for (const name of REQUEST_HEADERS) {
      const value = request.headers[name];
      if (typeof value === 'string') headers.set(name, value);
      else if (value) headers.set(name, value.join(', '));
    }

    const hasBody =
      request.body !== undefined && !['GET', 'HEAD'].includes(request.method);
    const body: BodyInit | undefined = hasBody
      ? Buffer.isBuffer(request.body)
        ? new Uint8Array(request.body)
        : typeof request.body === 'string'
          ? request.body
          : JSON.stringify(request.body)
      : undefined;

    if (hasBody && !headers.has('content-type')) {
      headers.set('content-type', 'application/json');
    }

    try {
      return await fetch(targetUrl, {
        method: request.method,
        headers,
        ...(body === undefined ? {} : { body }),
        redirect: 'manual',
      });
    } catch (error) {
      throw new BadGatewayException(`${serviceName} service is unavailable`, {
        cause: error,
      });
    }
  }
}

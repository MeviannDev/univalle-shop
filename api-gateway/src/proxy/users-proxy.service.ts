import { BadGatewayException, Injectable } from '@nestjs/common';
import type { Request } from 'express';

const REQUEST_HEADERS = [
  'accept',
  'accept-language',
  'authorization',
  'content-type',
  'cookie',
  'user-agent',
  'x-request-id',
];

@Injectable()
export class UsersProxyService {
  private readonly serviceUrl = new URL(
    process.env.USERS_SERVICE_URL ?? 'http://localhost:3002',
  );

  async forward(request: Request): Promise<globalThis.Response> {
    const basePath = this.serviceUrl.pathname.replace(/\/+$/, '');
    const targetUrl = new URL(
      `${basePath}${request.originalUrl}`,
      this.serviceUrl.origin,
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
      throw new BadGatewayException('Users service is unavailable', {
        cause: error,
      });
    }
  }
}

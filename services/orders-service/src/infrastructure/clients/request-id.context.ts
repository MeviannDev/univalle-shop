import { AsyncLocalStorage } from 'node:async_hooks';
import { Injectable, NestMiddleware } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';

const requestIds = new AsyncLocalStorage<string>();

@Injectable()
export class RequestIdContext implements NestMiddleware {
  use(request: Request, response: Response, next: NextFunction): void {
    const requestId = request.header('x-request-id')?.slice(0, 128) || randomUUID();
    response.setHeader('x-request-id', requestId);
    requestIds.run(requestId, next);
  }

  current(): string | undefined {
    return requestIds.getStore();
  }
}

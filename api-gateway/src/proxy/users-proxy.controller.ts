import { All, Controller, Inject, Req, Res } from '@nestjs/common';
import type { Request, Response } from 'express';
import { APP_CONFIG, type AppConfig } from '../config/app-config.js';
import { UsersProxyService } from './users-proxy.service.js';

@Controller()
export class UsersProxyController {
  constructor(
    private readonly usersProxy: UsersProxyService,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
  ) {}

  @All(['auth', 'auth/{*path}', 'users', 'users/{*path}'])
  async proxyUsers(
    @Req() request: Request,
    @Res() response: Response,
  ): Promise<void> {
    await this.forward(
      request,
      response,
      this.config.usersServiceUrl,
      'Users',
    );
  }

  @All(['orders', 'orders/{*path}'])
  async proxyOrders(
    @Req() request: Request,
    @Res() response: Response,
  ): Promise<void> {
    await this.forward(
      request,
      response,
      this.config.ordersServiceUrl,
      'Orders',
    );
  }

  private async forward(
    request: Request,
    response: Response,
    serviceUrl: URL,
    serviceName: string,
  ): Promise<void> {
    const upstream = await this.usersProxy.forward(
      request,
      serviceUrl,
      serviceName,
    );
    response.status(upstream.status);

    upstream.headers.forEach((value, name) => {
      if (
        !['content-encoding', 'content-length', 'transfer-encoding'].includes(
          name,
        )
      ) {
        response.setHeader(name, value);
      }
    });

    if (!upstream.body) {
      response.end();
      return;
    }

    response.end(Buffer.from(await upstream.arrayBuffer()));
  }
}

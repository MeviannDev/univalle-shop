import { All, Controller, Req, Res } from '@nestjs/common';
import type { Request, Response } from 'express';
import { SearchProxyService } from './search-proxy.service.js';

@Controller()
export class SearchProxyController {
  constructor(private readonly searchProxy: SearchProxyService) {}

  @All('search')
  async proxy(
    @Req() request: Request,
    @Res() response: Response,
  ): Promise<void> {
    const upstream = await this.searchProxy.forward(request);
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

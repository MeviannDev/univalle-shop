import { Module } from '@nestjs/common';
import { CatalogProxyController } from './catalog-proxy.controller.js';
import { CatalogProxyService } from './catalog-proxy.service.js';

@Module({
  controllers: [CatalogProxyController],
  providers: [CatalogProxyService],
})
export class CatalogProxyModule {}

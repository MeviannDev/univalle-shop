import { Module } from '@nestjs/common';
import { SearchProxyController } from './search-proxy.controller.js';
import { SearchProxyService } from './search-proxy.service.js';

@Module({
  controllers: [SearchProxyController],
  providers: [SearchProxyService],
})
export class SearchProxyModule {}

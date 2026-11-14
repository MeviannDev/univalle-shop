import { Module } from '@nestjs/common';
import { UsersProxyController } from './users-proxy.controller.js';
import { UsersProxyService } from './users-proxy.service.js';

@Module({
  controllers: [UsersProxyController],
  providers: [UsersProxyService],
})
export class UsersProxyModule {}

import { Controller, Get, HttpStatus, Res } from '@nestjs/common';
import type { Response } from 'express';
import { HealthService } from './health.service.js';

@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  checkLiveness() {
    return { status: 'ok' };
  }

  @Get('ready')
  async checkReadiness(@Res() response: Response) {
    const result = await this.healthService.checkReadiness();
    return response
      .status(
        result.status === 'ok' ? HttpStatus.OK : HttpStatus.SERVICE_UNAVAILABLE,
      )
      .json(result);
  }
}

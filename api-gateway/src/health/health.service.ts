import { Inject, Injectable } from '@nestjs/common';
import { APP_CONFIG, type AppConfig } from '../config/app-config.js';

export interface ReadinessResult {
  status: 'ok' | 'unavailable';
  services: {
    'users-service': 'available' | 'unavailable';
  };
}

@Injectable()
export class HealthService {
  constructor(@Inject(APP_CONFIG) private readonly config: AppConfig) {}

  async checkReadiness(): Promise<ReadinessResult> {
    const healthUrl = new URL(
      `${this.config.usersServiceUrl.pathname.replace(/\/+$/, '')}/api/docs`,
      this.config.usersServiceUrl.origin,
    );

    try {
      const response = await fetch(healthUrl, {
        signal: AbortSignal.timeout(3000),
      });
      const available = response.status < 500;

      return {
        status: available ? 'ok' : 'unavailable',
        services: {
          'users-service': available ? 'available' : 'unavailable',
        },
      };
    } catch {
      return {
        status: 'unavailable',
        services: { 'users-service': 'unavailable' },
      };
    }
  }
}

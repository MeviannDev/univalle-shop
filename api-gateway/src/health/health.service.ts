import { Inject, Injectable } from '@nestjs/common';
import { APP_CONFIG, type AppConfig } from '../config/app-config.js';

export interface ReadinessResult {
  status: 'ok' | 'unavailable';
  services: {
    'users-service': 'available' | 'unavailable';
    'catalog-service': 'available' | 'unavailable';
    'search-service': 'available' | 'unavailable';
  };
}

@Injectable()
export class HealthService {
  constructor(@Inject(APP_CONFIG) private readonly config: AppConfig) {}

  async checkReadiness(): Promise<ReadinessResult> {
    const [usersAvailable, catalogAvailable, searchAvailable] =
      await Promise.all([
        this.isAvailable(this.config.usersServiceUrl),
        this.isAvailable(this.config.catalogServiceUrl),
        this.isAvailable(this.config.searchServiceUrl),
      ]);

    return {
      status:
        usersAvailable && catalogAvailable && searchAvailable
          ? 'ok'
          : 'unavailable',
      services: {
        'users-service': usersAvailable ? 'available' : 'unavailable',
        'catalog-service': catalogAvailable ? 'available' : 'unavailable',
        'search-service': searchAvailable ? 'available' : 'unavailable',
      },
    };
  }

  private async isAvailable(serviceUrl: URL): Promise<boolean> {
    const healthUrl = new URL(
      `${serviceUrl.pathname.replace(/\/+$/, '')}/api/docs`,
      serviceUrl.origin,
    );

    try {
      const response = await fetch(healthUrl, {
        signal: AbortSignal.timeout(3000),
      });
      return response.status < 500;
    } catch {
      return false;
    }
  }
}

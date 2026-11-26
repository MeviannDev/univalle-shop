import { Inject, Injectable } from '@nestjs/common';
import { APP_CONFIG, type AppConfig } from '../config/app-config.js';

export interface ReadinessResult {
  status: 'ok' | 'unavailable';
  services: {
    'users-service': 'available' | 'unavailable';
    'orders-service': 'available' | 'unavailable';
  };
}

@Injectable()
export class HealthService {
  constructor(@Inject(APP_CONFIG) private readonly config: AppConfig) {}

  async checkReadiness(): Promise<ReadinessResult> {
    const [usersAvailable, ordersAvailable] = await Promise.all([
      this.isAvailable(this.config.usersServiceUrl, '/api/docs'),
      this.isAvailable(this.config.ordersServiceUrl, '/health'),
    ]);
    return {
      status: usersAvailable && ordersAvailable ? 'ok' : 'unavailable',
      services: {
        'users-service': usersAvailable ? 'available' : 'unavailable',
        'orders-service': ordersAvailable ? 'available' : 'unavailable',
      },
    };
  }

  private async isAvailable(baseUrl: URL, path: string): Promise<boolean> {
    const basePath = baseUrl.pathname.replace(/\/+$/, '');
    const healthUrl = new URL(
      `${basePath}${path}`,
      baseUrl.origin,
    );
    try {
      const response = await fetch(healthUrl, {
        signal: AbortSignal.timeout(3000),
      });
      return response.ok;
    } catch {
      return false;
    }
  }
}

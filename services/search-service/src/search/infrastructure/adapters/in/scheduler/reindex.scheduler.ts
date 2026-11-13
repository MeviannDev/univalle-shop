import { Logger, type OnApplicationBootstrap, type OnModuleDestroy } from '@nestjs/common';
import type { ReindexCatalog } from '../../../../application/use-cases/reindex-catalog.js';

export interface ReindexSchedule {
  onStartup: boolean;
  intervalMinutes: number;
}

/** Mantiene el índice al día: reindexa al arrancar y cada N minutos. Nunca tumba el servicio si el catálogo falla. */
export class ReindexScheduler implements OnApplicationBootstrap, OnModuleDestroy {
  private readonly logger = new Logger(ReindexScheduler.name);
  private timer?: NodeJS.Timeout;

  constructor(
    private readonly reindex: ReindexCatalog,
    private readonly schedule: ReindexSchedule,
  ) {}

  onApplicationBootstrap(): void {
    if (this.schedule.onStartup) void this.run();
    if (this.schedule.intervalMinutes > 0) {
      this.timer = setInterval(() => void this.run(), this.schedule.intervalMinutes * 60_000);
      this.timer.unref();
    }
  }

  onModuleDestroy(): void {
    if (this.timer) clearInterval(this.timer);
  }

  private async run(): Promise<void> {
    try {
      const { indexed } = await this.reindex.execute();
      this.logger.log(`Índice actualizado: ${indexed} ítems`);
    } catch (error) {
      this.logger.warn(`No se pudo reindexar: ${error instanceof Error ? error.message : error}`);
    }
  }
}
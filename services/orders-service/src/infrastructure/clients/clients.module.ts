import { Module } from '@nestjs/common';
import { CLOCK } from '../../domain/ports/outbound/clock.port.js';
import { ID_GENERATOR } from '../../domain/ports/outbound/id-generator.port.js';
import { RequestIdContext } from './request-id.context.js';
import { HttpServiceClient } from './http-service-client.js';
import { SystemClock } from './system-clock.js';
import { UuidGenerator } from './uuid-generator.js';

@Module({
  providers: [
    RequestIdContext,
    HttpServiceClient,
    SystemClock,
    UuidGenerator,
    { provide: CLOCK, useExisting: SystemClock },
    { provide: ID_GENERATOR, useExisting: UuidGenerator },
  ],
  exports: [
    RequestIdContext,
    HttpServiceClient,
    SystemClock,
    UuidGenerator,
    CLOCK,
    ID_GENERATOR,
  ],
})
export class ClientsModule {}

import { Injectable } from '@nestjs/common';
import type { ClockPort } from '../../domain/ports/outbound/clock.port.js';

@Injectable()
export class SystemClock implements ClockPort {
  now(): Date {
    return new Date();
  }
}

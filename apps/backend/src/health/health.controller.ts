import { type HealthResponse } from '@aura/shared';
import { Controller, Get } from '@nestjs/common';

import { Public } from '../auth/public.decorator';
import { HealthService } from './health.service';

/**
 * `GET /v1/health` (07 §4, 04 §7). Used by the host's health check and the uptime
 * monitor (16 §6), which send no JWT — hence `@Public()`. Without it the global
 * guard would 401 the load balancer, which reads that as "down" and pulls the
 * instance from rotation.
 */
@Controller({ path: 'health', version: '1' })
export class HealthController {
  constructor(private readonly health: HealthService) {}

  @Public()
  @Get()
  check(): Promise<HealthResponse> {
    return this.health.check();
  }
}

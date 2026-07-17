import { type HealthResponse } from '@aura/shared';
import { Controller, Get } from '@nestjs/common';

import { HealthService } from './health.service';

/**
 * `GET /v1/health` (07 §4, 04 §7). Used by the host's health check and the uptime
 * monitor (16 §6), so it stays UNAUTHENTICATED — when Phase 2 makes
 * `SupabaseAuthGuard` global, this route must be marked public or the load
 * balancer will read 401 as "down" and pull the instance.
 */
@Controller({ path: 'health', version: '1' })
export class HealthController {
  constructor(private readonly health: HealthService) {}

  @Get()
  check(): Promise<HealthResponse> {
    return this.health.check();
  }
}

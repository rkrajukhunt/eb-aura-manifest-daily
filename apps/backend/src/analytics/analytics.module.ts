import { Global, Module } from '@nestjs/common';

import { AnalyticsService } from './analytics.service';

/**
 * Server-side analytics (13 §1). Phase 2 ships the stub; Phase 5 emits the
 * generation events through it; Phase 11 completes the catalog audit.
 */
@Global()
@Module({
  providers: [AnalyticsService],
  exports: [AnalyticsService],
})
export class AnalyticsModule {}

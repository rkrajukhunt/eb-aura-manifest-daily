import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';

import { GenerationModule } from '../generation/generation.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { SchedulerService } from './scheduler.service';

/**
 * Crons (04 §5). In-process because the instance count is one; if we ever scale
 * horizontally these move to a dedicated worker, or every instance would run
 * every sweep (documented upgrade path, 04 §7).
 */
@Module({
  imports: [ScheduleModule.forRoot(), GenerationModule, NotificationsModule],
  providers: [SchedulerService],
  exports: [SchedulerService],
})
export class SchedulerModule {}

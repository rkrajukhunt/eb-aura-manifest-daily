import { Module } from '@nestjs/common';

import { NotificationsService } from './notifications.service';

/**
 * Push delivery (11 §1).
 *
 * Deliberately imports NOTHING from memory or generation. That absence is the
 * safety boundary from 11 §3: notification copy may only ever be assembled from
 * her name and a QA-guaranteed moment title, and a module that cannot reach
 * memory cannot leak it onto a lock screen even by mistake.
 */
@Module({
  providers: [NotificationsService],
  exports: [NotificationsService],
})
export class NotificationsModule {}

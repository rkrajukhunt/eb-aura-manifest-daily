import { Inject, Injectable, Logger } from '@nestjs/common';

import { ApiException } from '../common/api.exception';
import { hashUserId } from '../observability/logger.config';
import { SUPABASE_CLIENT, type ServiceRoleClient } from '../supabase/supabase.module';

/** Private bucket holding generated audio: `audio/{user_id}/{moment_id}.mp3` (02 §6). */
const AUDIO_BUCKET = 'audio';

/**
 * Full account deletion (03 §5, 14 §6). "Delete means delete" is a brand promise
 * (product 18 §4), not a best effort.
 *
 * Order matters. Storage objects go FIRST: Postgres cascades rows on
 * `auth.users` delete, but it cannot reach into Storage (02 §6). Delete the user
 * first and the audio is orphaned with no owner left to identify it.
 *
 * Steps 1–2 are synchronous — the response only returns once her data is
 * actually gone. Steps 3–4 (RevenueCat, PostHog) are queued with retry and are
 * no-ops until those phases exist.
 */
@Injectable()
export class AccountService {
  private readonly logger = new Logger(AccountService.name);

  constructor(@Inject(SUPABASE_CLIENT) private readonly supabase: ServiceRoleClient) {}

  async deleteAccount(userId: string): Promise<void> {
    // Logs identify by hash — a raw uuid here joins to someone's whole history (04 §7).
    const userRef = hashUserId(userId);
    this.logger.log(`Account deletion started for ${userRef}`);

    await this.deleteAudioObjects(userId, userRef);

    // 2. Cascades every user table (02 §8).
    const { error } = await this.supabase.auth.admin.deleteUser(userId);
    if (error) {
      // Already gone: the caller's JWT still verifies for its remaining lifetime,
      // so a retry on a flaky connection lands here. That is success, not failure —
      // the desired state holds. Anything else is a real failure.
      if (isUserNotFound(error)) {
        this.logger.log(`Account already deleted for ${userRef}; treating retry as success`);
        return;
      }
      this.logger.error(`Auth deletion failed for ${userRef}: ${error.message}`);
      throw ApiException.internal('Account deletion failed');
    }

    // 3–4. RevenueCat subscriber delete + PostHog person deletion.
    // Intentionally absent until Phases 10/11 own those integrations. Both are
    // queued-with-retry by design, so they do not belong in this synchronous path.
    // Stated window to the user is 30 days (03 §5).

    this.logger.log(`Account deletion completed for ${userRef}`);
  }

  /**
   * Storage has no cascade, so the prefix is listed and removed explicitly.
   * A failure here is fatal to the request on purpose: silently deleting the auth
   * user while her audio survives would leave unreachable recordings of her life
   * and quietly break the promise.
   */
  private async deleteAudioObjects(userId: string, userRef: string): Promise<void> {
    const { data: files, error: listError } = await this.supabase.storage
      .from(AUDIO_BUCKET)
      .list(userId);

    if (listError) {
      // The bucket does not exist until Phase 5 — that is not a deletion failure,
      // it just means there is no audio to remove yet.
      if (isBucketMissing(listError.message)) {
        this.logger.debug(`No audio bucket yet; skipping storage wipe for ${userRef}`);
        return;
      }
      this.logger.error(`Storage list failed for ${userRef}: ${listError.message}`);
      throw ApiException.internal('Account deletion failed');
    }

    if (!files || files.length === 0) return;

    const paths = files.map((file) => `${userId}/${file.name}`);
    const { error: removeError } = await this.supabase.storage.from(AUDIO_BUCKET).remove(paths);

    if (removeError) {
      this.logger.error(`Storage wipe failed for ${userRef}: ${removeError.message}`);
      throw ApiException.internal('Account deletion failed');
    }

    this.logger.log(`Removed ${paths.length} audio object(s) for ${userRef}`);
  }
}

function isBucketMissing(message: string): boolean {
  return /bucket not found/i.test(message);
}

function isUserNotFound(error: { status?: number | undefined; message: string }): boolean {
  return error.status === 404 || /user not found/i.test(error.message);
}

import { Inject, Injectable } from '@nestjs/common';

import { SUPABASE_CLIENT, type ServiceRoleClient } from '../supabase/supabase.module';

const AUDIO_BUCKET = 'audio';

/**
 * Audio upload to the private bucket (10 §3, 02 §6). Path is
 * `audio/{user_id}/{moment_id}.mp3`; mobile reads it via a signed URL created
 * from its own session (the RLS policy allows SELECT only within her folder).
 */
@Injectable()
export class StorageService {
  constructor(@Inject(SUPABASE_CLIENT) private readonly supabase: ServiceRoleClient) {}

  /** Uploads the mp3 and returns its storage path (persisted to `moments.audio_path`). */
  async uploadMomentAudio(userId: string, momentId: string, audio: Buffer): Promise<string> {
    const path = `${userId}/${momentId}.mp3`;

    const { error } = await this.supabase.storage.from(AUDIO_BUCKET).upload(path, audio, {
      contentType: 'audio/mpeg',
      // A retried job may re-upload; overwrite rather than fail on the second try.
      upsert: true,
    });

    if (error) throw new Error(`Audio upload failed: ${error.message}`);
    return path;
  }
}

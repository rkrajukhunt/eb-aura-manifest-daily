import {
  Controller,
  HttpCode,
  HttpStatus,
  Inject,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';

import { UserId } from '../auth/user-id.decorator';
import { SUPABASE_CLIENT, type ServiceRoleClient } from '../supabase/supabase.module';

/**
 * Affirmation lifecycle (07 §2).
 *
 * `keep` lives on the SERVER rather than as a direct Supabase update, and the
 * contract says why: keeping one candidate archives its siblings atomically.
 * A client doing that as three separate writes could be interrupted between
 * them and leave her with two "kept" affirmations from one guided flow, or
 * none — and it also writes memory, which is server-side by rule (00 §D1).
 */
@Controller({ path: 'affirmations', version: '1' })
export class AffirmationsController {
  constructor(@Inject(SUPABASE_CLIENT) private readonly supabase: ServiceRoleClient) {}

  @Post(':id/keep')
  @HttpCode(HttpStatus.OK)
  async keep(
    @UserId() userId: string,
    @Param('id', ParseUUIDPipe) affirmationId: string,
  ): Promise<Record<string, never>> {
    const { data: chosen } = await this.supabase
      .from('affirmations')
      .select('id, user_id, text, kind, created_at')
      .eq('id', affirmationId)
      .maybeSingle();

    // Scoped explicitly — the service-role client bypasses RLS (03 §3).
    if (!chosen || chosen.user_id !== userId) throw new NotFoundException();

    await this.supabase
      .from('affirmations')
      .update({ status: 'kept', saved_at: new Date().toISOString() })
      .eq('id', affirmationId);

    // The siblings from the same guided pass are retired together. They were
    // generated as one set, so leaving them as live candidates would make her
    // collection fill with options she already declined.
    if (chosen.kind === 'guided') {
      await this.supabase
        .from('affirmations')
        .delete()
        .eq('user_id', userId)
        .eq('kind', 'guided')
        .eq('status', 'candidate')
        .neq('id', affirmationId);
    }

    // What she CHOSE is a strong signal about her voice (09 §1) — stronger than
    // anything she was merely shown. Recorded verbatim, since it is her words.
    await this.supabase.from('memory_items').insert({
      user_id: userId,
      category: 'preference',
      tier: 'evolving',
      content: `She kept this affirmation: ${chosen.text}`,
      verbatim: chosen.text,
      source: 'system',
      emotional_weight: 3,
    });

    return {};
  }
}

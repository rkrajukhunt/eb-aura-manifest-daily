import { supabase } from '@/lib/supabase';
import { kv, STORAGE_KEYS } from '@/lib/storage';

/**
 * "Your letter is kept. It's yours forever." (product 08 §when the audio ends).
 *
 * Auto-favouriting is a trust gift, not a hostage: the free tier keeps the
 * letter, and she is told so later on Home rather than being asked to act now.
 * `favorited_at` is one of the three engagement columns her JWT may write — the
 * migration's column-level grant means this succeeds while a body rewrite from
 * the same client would be refused (02 §5).
 *
 * Failure is deliberately silent. The audio has already been cached permanently
 * on device, so the promise holds locally even if this write loses the network;
 * surfacing an error here would put a system fault on top of the most emotional
 * moment in the product.
 */
export async function keepLetter(momentId: string): Promise<void> {
  try {
    await supabase
      .from('moments')
      .update({ favorited_at: new Date().toISOString() })
      .eq('id', momentId)
      .is('favorited_at', null);
  } catch {
    // Intentionally ignored — see above.
  }
}

/** Marks the letter as heard so the boot gate stops routing her back to it (06 §3). */
export function markLetterSeen(): void {
  kv.set(STORAGE_KEYS.letterSeen, true);
}

export function hasSeenLetter(): boolean {
  return kv.get<boolean>(STORAGE_KEYS.letterSeen) === true;
}

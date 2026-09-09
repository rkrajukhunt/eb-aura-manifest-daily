import { Tabs } from 'expo-router';

import { TabBar } from '@/components/TabBar';
import { usePlayerStore } from '@/features/player/playerStore';
import { usePlayback } from '@/features/player/usePlayback';

/**
 * Four tabs, exactly as product 11 / 06 §1 specify: Home · Affirmations ·
 * Gratitude · Profile. No hamburger, no "More" tab — that is a product rule.
 *
 * The floating pill TabBar is the design system's (Phase 1). Nothing rides
 * above it: the mini-player was removed by product decision, so the tab-bar
 * slot is the bar alone. Note this DEPARTS from Aura Design v4, which draws a
 * playback pill at `bottom:74` on Home — restoring it means putting that pill
 * back here and giving it an offset clear of the bar and the safe-area inset.
 *
 * `PlaybackHost` is mounted HERE, once, only after a moment is opened, rather
 * than inside the player screen. That lets audio outlive the cover and keep
 * going while she moves between tabs without creating a native audio player at
 * app startup. Mounting it on the screen would tie the audio's lifetime to a
 * navigation stack entry, and minimizing would silence it.
 */
function PlaybackHost() {
  usePlayback();
  return null;
}

export default function TabsLayout() {
  const hasOpenMoment = usePlayerStore((s) => s.moment !== null);

  return (
    <>
      {hasOpenMoment ? <PlaybackHost /> : null}
      <Tabs screenOptions={{ headerShown: false }} tabBar={(props) => <TabBar {...props} />}>
        <Tabs.Screen name="home" options={{ title: 'Home' }} />
        <Tabs.Screen name="affirmations" options={{ title: 'Affirmations' }} />
        <Tabs.Screen name="gratitude" options={{ title: 'Gratitude' }} />
        <Tabs.Screen name="profile" options={{ title: 'Profile' }} />
      </Tabs>
    </>
  );
}

import { Tabs } from 'expo-router';
import { View } from 'react-native';

import { TabBar } from '@/components/TabBar';
import { MiniPlayer } from '@/features/player/MiniPlayer';
import { usePlayback } from '@/features/player/usePlayback';

/**
 * Four tabs, exactly as product 11 / 06 §1 specify: Home · Affirmations ·
 * Gratitude · Profile. No hamburger, no "More" tab — that is a product rule.
 *
 * The floating pill TabBar is the design system's (Phase 1), and the mini-player
 * rides above it (06 §1).
 *
 * `usePlayback` is mounted HERE, once, rather than inside the player screen —
 * that is what lets audio outlive the cover and keep going while she moves
 * between tabs. Mounting it on the screen would tie the audio's lifetime to a
 * navigation stack entry, and minimizing would silence it.
 */
export default function TabsLayout() {
  const playback = usePlayback();

  return (
    <Tabs
      screenOptions={{ headerShown: false }}
      tabBar={(props) => (
        <View>
          <MiniPlayer onToggle={playback.toggle} testID="mini-player" />
          <TabBar {...props} />
        </View>
      )}
    >
      <Tabs.Screen name="home" options={{ title: 'Home' }} />
      <Tabs.Screen name="affirmations" options={{ title: 'Affirmations' }} />
      <Tabs.Screen name="gratitude" options={{ title: 'Gratitude' }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile' }} />
    </Tabs>
  );
}

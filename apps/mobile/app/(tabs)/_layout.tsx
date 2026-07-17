import { Tabs } from 'expo-router';

import { TabBar } from '@/components/TabBar';

/**
 * Four tabs, exactly as product 11 / 06 §1 specify: Home · Affirmations ·
 * Gratitude · Profile. No hamburger, no "More" tab — that is a product rule.
 *
 * The floating pill TabBar is the design system's (Phase 1). This layout also
 * hosts the mini-player above the bar from Phase 7 (06 §1).
 */
export default function TabsLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false }} tabBar={(props) => <TabBar {...props} />}>
      <Tabs.Screen name="home" options={{ title: 'Home' }} />
      <Tabs.Screen name="affirmations" options={{ title: 'Affirmations' }} />
      <Tabs.Screen name="gratitude" options={{ title: 'Gratitude' }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile' }} />
    </Tabs>
  );
}

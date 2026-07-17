import { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';

import {
  Card,
  Chip,
  CountdownChip,
  EmptyState,
  Input,
  Label,
  Orb,
  PillButton,
  SelectCard,
  SerifDisplay,
  Skeleton,
  TextButton,
  WeekDots,
} from '@/components';
import type { OrbState } from '@/components/Orb';
import { ThemeProvider, useTheme } from '@/theme/ThemeProvider';

/**
 * The Phase 1 DoD surface: every design-system component, light and dark side
 * by side, for the founder's on-device pass ("calm is the brand") and the
 * 60fps orb check. Dev-only — nothing routes here in production.
 *
 * Each half runs its own forced-scheme ThemeProvider, so both worlds render in
 * one screen regardless of the system setting.
 */
export function GalleryScreen() {
  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic">
      <ThemeProvider forceScheme="light">
        <GalleryWorld title="LIGHT" />
      </ThemeProvider>
      <ThemeProvider forceScheme="dark">
        <GalleryWorld title="DARK" />
      </ThemeProvider>
    </ScrollView>
  );
}

function GalleryWorld({ title }: { title: string }) {
  const { colors, spacing, layout } = useTheme();
  const [selectedChip, setSelectedChip] = useState(0);
  const [selectedCard, setSelectedCard] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [orbState, setOrbState] = useState<OrbState>('idle');

  const orbStates: OrbState[] = ['idle', 'listening', 'generating', 'speaking'];

  return (
    <View
      style={{
        backgroundColor: colors.bg.base,
        padding: layout.screenMargin,
        gap: spacing.xl,
      }}
    >
      <Label>{title}</Label>

      <Section label="TYPOGRAPHY">
        <SerifDisplay variant="letterLine">You started this on a Friday in July.</SerifDisplay>
        <SerifDisplay variant="momentTitle">The morning the studio opened</SerifDisplay>
        <SerifDisplay variant="title">Section title</SerifDisplay>
        <Label>TODAY'S MOMENT</Label>
      </Section>

      <Section label="THE ORB — TAP A STATE">
        <View style={{ alignItems: 'center' }}>
          <Orb state={orbState} size={140} />
        </View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
          {orbStates.map((state) => (
            <Chip
              key={state}
              label={state}
              selected={orbState === state}
              onPress={() => setOrbState(state)}
            />
          ))}
        </View>
      </Section>

      <Section label="BUTTONS">
        <PillButton title="Begin" onPress={() => undefined} />
        <PillButton title="Loading" loading onPress={() => undefined} />
        <PillButton title="Disabled" disabled onPress={() => undefined} />
        <TextButton title="Restore purchase" onPress={() => undefined} />
        <TextButton title="Forget it" destructive onPress={() => undefined} />
      </Section>

      <Section label="CHIPS">
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
          {['Feeling fulfilled', 'Financial freedom', 'Being free'].map((label, i) => (
            <Chip
              key={label}
              label={label}
              selected={selectedChip === i}
              onPress={() => setSelectedChip(i)}
            />
          ))}
        </View>
      </Section>

      <Section label="CARDS">
        <Card variant="solid">
          <Text style={{ color: colors.text.primary }}>Solid card — the default surface</Text>
        </Card>
        <Card variant="glassy">
          <Text style={{ color: colors.text.primary }}>Glassy card — heroes only</Text>
        </Card>
        <SelectCard
          title="Cozy cottage"
          subtitle="Somewhere the kettle is always on"
          selected={selectedCard}
          onPress={() => setSelectedCard((v) => !v)}
        />
      </Section>

      <Section label="INPUT">
        <Input
          value={inputValue}
          onChangeText={setInputValue}
          placeholder="Whatever comes to mind"
          hint="even one word helps me"
        />
      </Section>

      <Section label="SMALL PIECES">
        <CountdownChip targetTime={new Date(Date.now() + 2 * 60 * 60 * 1000)} prefix="arrives in" />
        <WeekDots filled={[true, true, true, false, false, false, false]} />
        <Skeleton height={spacing.xl} />
        <EmptyState
          message="Hearts live here. Your first Letter already does."
          actionTitle="Play it"
          onAction={() => undefined}
        />
      </Section>

      {/* Reduce Motion is checked via the SYSTEM setting (Settings →
          Accessibility → Motion) — a in-gallery toggle can't reach the real
          MotionProvider and a control that does nothing would lie. */}
    </View>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  const { spacing } = useTheme();

  return (
    <View style={{ gap: spacing.md }}>
      <Label>{label}</Label>
      {children}
    </View>
  );
}

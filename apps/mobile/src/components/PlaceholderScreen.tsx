import { StyleSheet, Text, View } from 'react-native';

/**
 * Phase 0 scaffolding only. Every tab renders this until its real screen lands.
 *
 * Deliberately unstyled: the design tokens arrive in Phase 1 (05 §4), and there
 * is a lint rule coming that bans raw literals in feature code. Nothing here
 * should survive Phase 1 — if it does, that's a bug.
 */
export function PlaceholderScreen({ title, phase }: { title: string; phase: string }) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.phase}>{phase}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
  title: { fontSize: 20 },
  phase: { fontSize: 13, opacity: 0.6 },
});

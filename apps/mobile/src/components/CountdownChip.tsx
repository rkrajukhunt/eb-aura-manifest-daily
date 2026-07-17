import { useEffect, useState } from 'react';

import { Label } from './Label';

/**
 * Minute-level tick (product 13 §catalog): "Countdown chips — static numerals,
 * minute-level tick. Anticipation without anxiety (no urgent flashing)." No
 * seconds, no animation — a countdown that visibly races is pressure, and this
 * one is a promise.
 */
const TICK_MS = 60_000;

const MS_PER_MINUTE = 60_000;

export interface CountdownChipProps {
  targetTime: Date;
  prefix?: string;
}

function remainingText(targetTime: Date, nowMs: number): string {
  const remaining = targetTime.getTime() - nowMs;
  if (remaining <= 0) return 'now';

  const minutes = Math.ceil(remaining / MS_PER_MINUTE);
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

/** Arrival countdown ("ARRIVES IN 2H 14M") — Label uppercases the copy. */
export function CountdownChip({ targetTime, prefix }: CountdownChipProps) {
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    const interval = setInterval(() => setNowMs(Date.now()), TICK_MS);
    return () => clearInterval(interval);
  }, []);

  const text = [prefix, remainingText(targetTime, nowMs)].filter(Boolean).join(' ');

  return <Label>{text}</Label>;
}

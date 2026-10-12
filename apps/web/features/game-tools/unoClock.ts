export type UnoClockSample = { serverNow: number; monotonicAt: number };

export function sampleUnoClock(serverNow: number | undefined, monotonicAt = performance.now()): UnoClockSample | null {
  return Number.isFinite(serverNow) ? { serverNow: serverNow!, monotonicAt } : null;
}

export function syncUnoClock(current: UnoClockSample | null, serverNow: number | undefined, monotonicAt = performance.now()) {
  const next = sampleUnoClock(serverNow, monotonicAt);
  if (!next || current && next.serverNow <= current.serverNow) return current;
  // Delayed responses must not extend a countdown already in progress.
  return current ? { serverNow: Math.max(next.serverNow, readUnoClock(current, monotonicAt)), monotonicAt } : next;
}

/** Server timestamps use wall time; elapsed time must survive device clock changes. */
export function readUnoClock(sample: UnoClockSample | null, monotonicNow = performance.now(), wallNow = Date.now()) {
  return sample ? sample.serverNow + Math.max(0, monotonicNow - sample.monotonicAt) : wallNow;
}

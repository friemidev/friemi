const primaryPaths = new Set(["mobile-home", "lobby", "footprints", "profile"]);
const maxAgeMs = 30 * 60 * 1000;

export type PrimaryTabSnapshot = {
  href: string;
  scrollY: number;
  savedAt: number;
};

export function primaryTabKey(href: string): string | null {
  if (!href.startsWith("/") || href.startsWith("//")) return null;
  const path = href.split(/[?#]/, 1)[0];
  const segments = path.split("/").filter(Boolean);
  return segments.length === 2 && primaryPaths.has(segments[1]) ? path : null;
}

// Only UI coordinates and filter URLs, never user data or whole page trees.
// Owned by the keyed navigation shell, so signing out discards the snapshots.
export class PrimaryTabState {
  private entries = new Map<string, PrimaryTabSnapshot>();

  save(href: string, scrollY: number, now = Date.now()) {
    const key = primaryTabKey(href);
    if (!key || !Number.isFinite(scrollY) || scrollY < 0) return;
    this.entries.delete(key);
    this.entries.set(key, { href, scrollY, savedAt: now });
    if (this.entries.size > 12)
      this.entries.delete(this.entries.keys().next().value!);
  }

  get(href: string, now = Date.now()): PrimaryTabSnapshot | null {
    const key = primaryTabKey(href);
    const entry = key ? this.entries.get(key) : null;
    if (!entry || now - entry.savedAt > maxAgeMs) return null;
    return entry;
  }
}

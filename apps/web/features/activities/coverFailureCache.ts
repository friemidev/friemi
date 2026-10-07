export class CoverFailureCache {
  private failures = new Map<string, number>();

  constructor(
    private readonly capacity = 160,
    private readonly ttlMs = 60_000,
  ) {}

  has(src: string | null, now = Date.now()) {
    if (!src) return false;
    const failedAt = this.failures.get(src);
    if (failedAt === undefined) return false;
    if (now - failedAt < this.ttlMs) return true;
    this.failures.delete(src);
    return false;
  }

  fail(src: string, now = Date.now()) {
    this.failures.delete(src);
    this.failures.set(src, now);
    if (this.failures.size > this.capacity)
      this.failures.delete(this.failures.keys().next().value!);
  }

  clear(src: string) {
    this.failures.delete(src);
  }
}

export const coverFailureCache = new CoverFailureCache();

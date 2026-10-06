// Keep only a small number of live documents, not an iframe for every list item.
export class DetailSheetRetention {
  private entries = new Map<object, () => void>();

  constructor(private readonly capacity = 2) {}

  retain(key: object, onEvict: () => void) {
    this.entries.delete(key);
    this.entries.set(key, onEvict);
    while (this.entries.size > this.capacity) {
      const oldest = this.entries.entries().next().value;
      if (!oldest) break;
      this.entries.delete(oldest[0]);
      oldest[1]();
    }
  }

  release(key: object) {
    this.entries.delete(key);
  }
}

export const detailSheetRetention = new DetailSheetRetention();
export const detailSheetVisibilityMessage = "friemi:activity-sheet-visibility";

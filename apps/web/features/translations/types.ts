export const translationEntityTypes = [
  "activity",
  "public_event",
  "comment",
  "direct_message",
  "activity_room_message",
  "planet_message",
] as const;

export type TranslationEntityType = (typeof translationEntityTypes)[number];

export const translatableFieldsByEntity = {
  activity: ["title", "description", "address", "priceText", "itinerary"],
  public_event: ["title", "description", "address", "priceText"],
  comment: ["content"],
  direct_message: ["body"],
  activity_room_message: ["body"],
  planet_message: ["content"],
} as const satisfies Record<TranslationEntityType, readonly string[]>;

export type TranslatableField<T extends TranslationEntityType> =
  (typeof translatableFieldsByEntity)[T][number];

export type TranslationResult = {
  cached: boolean;
  detectedSourceLocale: string | null;
  entityId: string;
  entityType: TranslationEntityType;
  field: string;
  locale: string;
  originalText: string;
  translatedText: string;
};

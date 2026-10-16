import { prisma } from "@/lib/prisma";
import {
  createSourceHash,
  isContentLocale,
  normalizeSourceText,
  reusableTranslationProviders,
} from "./translationPolicy";
import type { TranslationEntityType } from "../types";

type Content = { id: string; title: string; description: string };

// Localize complete feed view models in one database read, including nested
// sections. This reads cached text only; it never enqueues API activities.
export async function localizeActivityContentTree<T>(
  value: T,
  locale: string,
): Promise<T> {
  const cards: Array<
    Content & { type: string; publicEventId?: string | null }
  > = [];
  function visit(node: unknown) {
    if (!node || typeof node !== "object" || node instanceof Date) return;
    if (Array.isArray(node)) {
      node.forEach(visit);
      return;
    }
    const record = node as Record<string, unknown>;
    if (
      typeof record.id === "string" &&
      typeof record.title === "string" &&
      typeof record.description === "string" &&
      typeof record.type === "string" &&
      ["PUBLIC_EVENT", "LOCAL", "USER_HOSTED", "TRIP"].includes(record.type)
    ) {
      cards.push(record as (typeof cards)[number]);
    }
    Object.values(record).forEach(visit);
  }
  visit(value);
  const localized = await localizeContentItems(
    cards,
    locale,
    (card) =>
      card.type === "PUBLIC_EVENT" && card.publicEventId
        ? "public_event"
        : "activity",
    (card) =>
      card.type === "PUBLIC_EVENT" && card.publicEventId
        ? card.publicEventId
        : card.id,
  );
  const replacements = new Map(
    cards.map((card, index) => [card, localized[index]]),
  );
  function rebuild(node: unknown): unknown {
    if (!node || typeof node !== "object" || node instanceof Date) return node;
    if (Array.isArray(node)) return node.map(rebuild);
    return Object.fromEntries(
      Object.entries(
        replacements.get(node as (typeof cards)[number]) ?? node,
      ).map(([key, child]) => [key, rebuild(child)]),
    );
  }
  return rebuild(value) as T;
}

export async function localizeContentItems<T extends Content>(
  items: T[],
  locale: string,
  entityType: TranslationEntityType | ((item: T) => TranslationEntityType),
  entityId: (item: T) => string = (item) => item.id,
): Promise<T[]> {
  if (!items.length || !isContentLocale(locale)) return items;
  const keys = items.flatMap((item) =>
    (["title", "description"] as const).map((field) => ({
      entityType:
        typeof entityType === "function" ? entityType(item) : entityType,
      entityId: entityId(item),
      field,
      locale,
      sourceHash: createSourceHash(item[field]),
    })),
  );
  const translations = await prisma.contentTranslation.findMany({
    where: { OR: keys, provider: { in: reusableTranslationProviders } },
    select: {
      entityType: true,
      entityId: true,
      field: true,
      sourceHash: true,
      translatedText: true,
    },
  });
  const byKey = new Map(
    translations.map((translation) => [
      `${translation.entityType}:${translation.entityId}:${translation.field}:${translation.sourceHash}`,
      translation.translatedText,
    ]),
  );
  return items.map((item) => {
    const type =
      typeof entityType === "function" ? entityType(item) : entityType;
    const id = entityId(item);
    return {
      ...item,
      title:
        byKey.get(`${type}:${id}:title:${createSourceHash(item.title)}`) ??
        item.title,
      description:
        byKey.get(
          `${type}:${id}:description:${createSourceHash(item.description)}`,
        ) ?? item.description,
    };
  });
}

export async function localizeContent<T extends Content>(
  item: T,
  locale: string,
  entityType: TranslationEntityType,
): Promise<T> {
  return (await localizeContentItems([item], locale, entityType))[0];
}

export async function hasCachedContent(
  item: Content,
  locale: string,
  entityType: TranslationEntityType,
) {
  if (!isContentLocale(locale)) return false;
  const fields = (["title", "description"] as const).filter((field) =>
    normalizeSourceText(item[field]),
  );
  const count = await prisma.contentTranslation.count({
    where: {
      entityType,
      entityId: item.id,
      locale,
      provider: { in: reusableTranslationProviders },
      OR: fields.map((field) => ({
        field,
        sourceHash: createSourceHash(item[field]),
      })),
    },
  });
  return count === fields.length;
}

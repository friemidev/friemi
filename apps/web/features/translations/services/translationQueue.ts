import { randomUUID } from "node:crypto";
import { after } from "next/server";
import { prisma } from "@/lib/prisma";
import { isLegacyActivityInfoSource } from "@/features/activities/utils/activityInfoSource";
import type { ContentTranslationTask } from "@prisma/client";
import {
  translatableFieldsByEntity,
  type TranslationEntityType,
} from "../types";
import {
  getCloudflareConfiguration,
  isTranslationEnabled,
  requestCloudflare,
  TranslationProviderError,
} from "./cloudflare";
import {
  automaticTranslationFields,
  cloudflareTranslationProvider,
  contentLocales,
  createSourceHash,
  getBudgetPeriod,
  getDailyCharacterLimit,
  isContentLocale,
  normalizeSourceText,
  reusableTranslationProviders,
  splitTranslationText,
  translationChunkVersion,
  type ContentLocale,
} from "./translationPolicy";
import { translateField } from "./translationProcessor";

type QueueInput = {
  entityType: TranslationEntityType;
  entityId: string;
  fields: Record<string, string | null | undefined>;
  locales: readonly ContentLocale[];
};

const gatheringContentSelect = {
  id: true,
  title: true,
  description: true,
  type: true,
  publicEventId: true,
  source: true,
  sourceUrl: true,
  externalSource: true,
  externalId: true,
  externalUrl: true,
  importedAt: true,
  sourcePayload: true,
} as const;

export async function enqueueTranslations(input: QueueInput) {
  if (!isTranslationEnabled()) return;
  for (const [field, value] of Object.entries(input.fields)) {
    const sourceText = normalizeSourceText(value);
    if (
      !sourceText ||
      !(
        translatableFieldsByEntity[input.entityType] as readonly string[]
      ).includes(field)
    )
      continue;
    const sourceHash = createSourceHash(sourceText);
    for (const locale of input.locales) {
      const cached = await prisma.contentTranslation.findUnique({
        where: {
          provider: { in: reusableTranslationProviders },
          entityType_entityId_field_locale_sourceHash: {
            entityType: input.entityType,
            entityId: input.entityId,
            field,
            locale,
            sourceHash,
          },
        },
        select: { id: true },
      });
      if (cached) continue;
      const key = {
        entityType: input.entityType,
        entityId: input.entityId,
        field,
        locale,
      };
      await prisma.contentTranslationTask.createMany({
        data: [{ ...key, sourceHash, sourceText }],
        skipDuplicates: true,
      });
      // Repeated reads do not reset leases or failure backoff. Only changed text
      // replaces a task, so a late worker cannot complete a newer version.
      await prisma.contentTranslationTask.updateMany({
        where: {
          ...key,
          OR: [{ sourceHash: { not: sourceHash } }, { status: "DONE" }],
        },
        data: {
          sourceHash,
          sourceText,
          status: "PENDING",
          lockToken: null,
          lockedUntil: null,
          nextAttemptAt: new Date(),
          attempts: 0,
          lastError: null,
        },
      });
    }
  }
}

export async function enqueueGatheringTranslations(activityId: string) {
  if (!isTranslationEnabled()) return;
  const activity = await prisma.activity.findUnique({
    where: { id: activityId },
    select: gatheringContentSelect,
  });
  if (
    !activity ||
    activity.type === "PUBLIC_EVENT" ||
    isLegacyActivityInfoSource(activity)
  )
    return;
  await enqueueTranslations({
    entityType: "activity",
    entityId: activity.id,
    fields: { title: activity.title, description: activity.description },
    locales: contentLocales,
  });
}

export async function scheduleGatheringTranslations(activityId: string) {
  if (!isTranslationEnabled()) return;
  try {
    // Persist before returning/redirecting. A daily worker recovers unfinished work.
    await enqueueGatheringTranslations(activityId);
    after(async () => {
      try {
        await processTranslationQueue({
          entityType: "activity",
          entityId: activityId,
          limit: 6,
        });
      } catch (error) {
        console.error(
          "Gathering translation worker failed",
          error instanceof Error ? error.name : "UnknownError",
        );
      }
    });
  } catch (error) {
    // Publishing the original content must remain available when translation is down.
    console.error(
      "Could not schedule gathering translations",
      error instanceof Error ? error.name : "UnknownError",
    );
  }
}

function budgetIdentity() {
  const { accountId } = getCloudflareConfiguration();
  const period = getBudgetPeriod(new Date());
  // Stable across API token rotation and workers using the same database.
  return { id: `cloudflare:${accountId}:${period.id}`, period };
}

async function reserveCharacters(characters: number) {
  const { id, period } = budgetIdentity();
  const limit = getDailyCharacterLimit();
  const now = new Date();
  await prisma.contentTranslationBudget.upsert({
    where: { id },
    create: { id },
    update: {},
  });
  const reserved = await prisma.contentTranslationBudget.updateMany({
    where: {
      id,
      usedCharacters: { lte: limit - characters },
      OR: [{ pausedUntil: null }, { pausedUntil: { lte: now } }],
    },
    data: { usedCharacters: { increment: characters } },
  });
  if (!reserved.count) {
    const budget = await prisma.contentTranslationBudget.findUniqueOrThrow({
      where: { id },
    });
    throw new TranslationProviderError(
      budget.pauseReason ?? "TRANSLATION_DAILY_LIMIT",
      budget.pausedUntil ?? period.end,
    );
  }
  return { id, period };
}

async function requestWithinBudget(
  operation: "detect" | "translate",
  text: string,
  locale?: ContentLocale,
  sourceLocale?: string,
  deadline?: number,
) {
  // Conservatively count detection, whitespace and failed/timeout requests too.
  // Never refund an uncertain request that Cloudflare might already have processed.
  const reservation = await reserveCharacters(text.length);
  try {
    return await requestCloudflare(operation, text, {
      locale,
      sourceLocale,
      timeoutMs: deadline ? Math.max(1, deadline - Date.now()) : undefined,
    });
  } catch (error) {
    if (
      error instanceof TranslationProviderError &&
      (error.code === "TRANSLATION_FREE_QUOTA_EXHAUSTED" ||
        error.code === "TRANSLATION_PAID_MODEL_BLOCKED")
    ) {
      const { id, period } = reservation;
      await prisma.contentTranslationBudget.update({
        where: { id },
        data: { pausedUntil: period.end, pauseReason: error.code },
      });
      error.retryAt = period.end;
    }
    throw error;
  }
}

async function getCurrentField(task: ContentTranslationTask) {
  if (task.entityType === "public_event") {
    const event = await prisma.publicEvent.findUnique({
      where: { id: task.entityId },
    });
    if (!event || event.visibility !== "PUBLIC") return null;
    return normalizeSourceText(
      event[task.field as "title" | "description" | "address" | "priceText"],
    );
  }
  if (task.entityType === "activity") {
    const activity = await prisma.activity.findUnique({
      where: { id: task.entityId },
    });
    if (!activity) return null;
    return normalizeSourceText(
      activity[
        task.field as
          | "title"
          | "description"
          | "address"
          | "priceText"
          | "itinerary"
      ],
    );
  }
  if (task.entityType === "direct_message") {
    const message = await prisma.directMessage.findUnique({
      where: { id: task.entityId },
      select: { body: true, recalledAt: true },
    });
    return message && !message.recalledAt
      ? normalizeSourceText(message.body)
      : null;
  }
  if (task.entityType === "activity_room_message") {
    const message = await prisma.activityRoomMessage.findUnique({
      where: { id: task.entityId },
      select: { body: true, deletedAt: true },
    });
    return message && !message.deletedAt
      ? normalizeSourceText(message.body)
      : null;
  }
  if (task.entityType === "planet_message") {
    const message = await prisma.planetMessage.findUnique({
      where: { id: task.entityId },
      select: { content: true },
    });
    return message ? normalizeSourceText(message.content) : null;
  }
  const comment = await prisma.comment.findUnique({
    where: { id: task.entityId },
  });
  return comment && !comment.deletedAt
    ? normalizeSourceText(comment.content)
    : null;
}

async function processTask(task: ContentTranslationTask, deadline: number) {
  if (!isContentLocale(task.locale)) return false;
  const now = new Date();
  const lockToken = randomUUID();
  const claimed = await prisma.contentTranslationTask.updateMany({
    where: {
      id: task.id,
      sourceHash: task.sourceHash,
      nextAttemptAt: { lte: now },
      OR: [
        { status: "PENDING" },
        { status: "PROCESSING", lockedUntil: { lte: now } },
      ],
    },
    data: {
      status: "PROCESSING",
      lockToken,
      lockedUntil: new Date(now.getTime() + 120_000),
      attempts: { increment: 1 },
    },
  });
  if (!claimed.count) return false;
  const ownTask = { id: task.id, sourceHash: task.sourceHash, lockToken };
  try {
    const currentText = await getCurrentField(task);
    if (currentText === null || !currentText) {
      await prisma.contentTranslationTask.updateMany({
        where: ownTask,
        data: { status: "DONE", lockToken: null, lockedUntil: null },
      });
      return false;
    }
    if (createSourceHash(currentText) !== task.sourceHash) {
      if (
        [
          "direct_message",
          "activity_room_message",
          "planet_message",
          "comment",
        ].includes(task.entityType)
      ) {
        // An edit to a message/comment needs a new button click. A pending
        // request must never automatically translate a later version.
        await prisma.contentTranslationTask.updateMany({
          where: ownTask,
          data: { status: "DONE", lockToken: null, lockedUntil: null },
        });
        return false;
      }
      await prisma.contentTranslationTask.updateMany({
        where: ownTask,
        data: {
          status: "PENDING",
          sourceText: currentText,
          sourceHash: createSourceHash(currentText),
          lockToken: null,
          lockedUntil: null,
          nextAttemptAt: now,
        },
      });
      return false;
    }
    const cacheKey = {
      entityType: task.entityType,
      entityId: task.entityId,
      field: task.field,
      locale: task.locale,
      sourceHash: task.sourceHash,
    };
    let cached = await prisma.contentTranslation.findUnique({
      where: {
        entityType_entityId_field_locale_sourceHash: cacheKey,
        provider: { in: reusableTranslationProviders },
      },
    });
    if (!cached) {
      // A copied gathering can reuse an identical event translation.
      const reusable = await prisma.contentTranslation.findFirst({
        where: {
          sourceHash: task.sourceHash,
          field: task.field,
          locale: task.locale,
          sourceText: currentText,
          provider: { in: reusableTranslationProviders },
        },
      });
      const detected = await prisma.contentTranslation.findFirst({
        where: {
          entityType: task.entityType,
          entityId: task.entityId,
          field: { in: [task.field, `${task.field}:source-language`] },
          sourceHash: task.sourceHash,
          detectedSourceLocale: { not: null },
        },
        select: { detectedSourceLocale: true },
      });
      const translated =
        reusable ??
        (await translateField(
          {
            text: currentText,
            locale: task.locale,
            sourceLocale: detected?.detectedSourceLocale,
          },
          {
            async detect(text) {
              if (Date.now() >= deadline)
                throw new TranslationProviderError("TRANSLATION_PENDING");
              const result = (
                await requestWithinBudget(
                  "detect",
                  text,
                  undefined,
                  undefined,
                  deadline,
                )
              )[0];
              if (!result?.language || result.isTranslationSupported === false)
                throw new TranslationProviderError(
                  "TRANSLATION_UNSUPPORTED_SOURCE",
                );
              const key = {
                ...cacheKey,
                field: `${task.field}:source-language`,
                locale: "und",
              };
              await prisma.contentTranslation.upsert({
                where: { entityType_entityId_field_locale_sourceHash: key },
                create: {
                  ...key,
                  sourceText: currentText,
                  translatedText: result.language,
                  detectedSourceLocale: result.language,
                  provider: "cloudflare",
                },
                update: {},
              });
              return result.language;
            },
            async translate(text, locale, sourceLocale) {
              async function translateChunk(chunk: string): Promise<string> {
                const key = {
                  ...cacheKey,
                  field: `${task.field}:chunk:${translationChunkVersion}`,
                  sourceHash: createSourceHash(chunk),
                };
                const cachedChunk = await prisma.contentTranslation.findUnique({
                  where: { entityType_entityId_field_locale_sourceHash: key },
                });
                if (cachedChunk) return cachedChunk.translatedText;
                const splitKey = {
                  ...key,
                  field: `${task.field}:chunk-split:${translationChunkVersion}`,
                };
                const savedSplit = await prisma.contentTranslation.findUnique({
                  where: { entityType_entityId_field_locale_sourceHash: splitKey },
                  select: { id: true },
                });
                let translatedText: string | undefined;
                if (!savedSplit) {
                  if (Date.now() >= deadline)
                    throw new TranslationProviderError("TRANSLATION_PENDING");
                  try {
                    const result = (
                      await requestWithinBudget(
                        "translate", chunk, locale, sourceLocale, deadline,
                      )
                    )[0];
                    translatedText = result?.translations?.find(
                      (translation) =>
                        translation.to === (locale === "zh-CN" ? "zh-Hans" : locale),
                    )?.text;
                    if (!translatedText?.trim())
                      throw new TranslationProviderError("TRANSLATION_EMPTY_RESPONSE");
                  } catch (error) {
                    if (
                      !(error instanceof TranslationProviderError) ||
                      error.code !== "TRANSLATION_INVALID_RESPONSE" ||
                      chunk.length <= 128
                    ) throw error;
                    // Persist the smaller-chunk decision before translating any
                    // children. A retry never repeats the failed large request,
                    // and completed children survive timeout/quota exhaustion.
                    await prisma.contentTranslation.upsert({
                      where: { entityType_entityId_field_locale_sourceHash: splitKey },
                      create: {
                        ...splitKey,
                        sourceText: chunk,
                        translatedText: "split",
                        detectedSourceLocale: sourceLocale,
                        provider: cloudflareTranslationProvider,
                      },
                      update: {},
                    });
                  }
                }
                if (translatedText === undefined) {
                  const parts: string[] = [];
                  for (const part of splitTranslationText(chunk, Math.floor(chunk.length / 2))) {
                    const leading = part.match(/^\s*/)?.[0] ?? "";
                    const trailing = part.match(/\s*$/)?.[0] ?? "";
                    parts.push(part.trim()
                      ? `${leading}${await translateChunk(part.trim())}${trailing}`
                      : part);
                  }
                  translatedText = parts.join("");
                }
                await prisma.contentTranslation.upsert({
                  where: { entityType_entityId_field_locale_sourceHash: key },
                  create: {
                    ...key,
                    sourceText: chunk,
                    translatedText,
                    detectedSourceLocale: sourceLocale,
                    provider: cloudflareTranslationProvider,
                  },
                  update: {},
                });
                return translatedText;
              }
              return translateChunk(text);
            },
          },
        ));
      cached = await prisma.contentTranslation.upsert({
        where: { entityType_entityId_field_locale_sourceHash: cacheKey },
        create: {
          ...cacheKey,
          sourceText: currentText,
          translatedText: translated.translatedText,
          detectedSourceLocale: translated.detectedSourceLocale,
          provider: translated.provider,
        },
        update: {
          translatedText: translated.translatedText,
          detectedSourceLocale: translated.detectedSourceLocale,
          provider: translated.provider,
        },
      });
    }
    await prisma.contentTranslationTask.updateMany({
      where: ownTask,
      data: {
        status: "DONE",
        lastError: null,
        lockToken: null,
        lockedUntil: null,
      },
    });
    return true;
  } catch (error) {
    const code =
      error instanceof TranslationProviderError
        ? error.code
        : "TRANSLATION_PROVIDER_FAILED";
    const retryAt =
      error instanceof TranslationProviderError && error.retryAt
        ? error.retryAt
        : new Date(
            Date.now() +
              Math.min(3600, 60 * 2 ** Math.min(task.attempts, 6)) * 1000,
          );
    await prisma.contentTranslationTask.updateMany({
      where: ownTask,
      data: {
        status: "PENDING",
        lastError: code,
        nextAttemptAt: retryAt,
        lockToken: null,
        lockedUntil: null,
      },
    });
    // Stop this batch on exhaustion/throttling; other queued work stays durable.
    if (
      code === "TRANSLATION_FREE_QUOTA_EXHAUSTED" ||
      code === "TRANSLATION_PAID_MODEL_BLOCKED" ||
      code === "TRANSLATION_DAILY_LIMIT" ||
      code === "TRANSLATION_RATE_LIMITED"
    )
      throw error;
    return false;
  }
}

export async function processTranslationQueue(
  options: {
    entityType?: TranslationEntityType;
    entityId?: string;
    locale?: ContentLocale;
    field?: string;
    limit?: number;
  } = {},
) {
  if (!isTranslationEnabled())
    return {
      completed: 0,
      paused: "TRANSLATION_NOT_CONFIGURED" as string | null,
    };
  const now = new Date();
  // Expose a durable quota pause even if this particular task is already
  // deferred until tomorrow, so repeated clicks keep showing the right status.
  const budget = await prisma.contentTranslationBudget.findUnique({
    where: { id: budgetIdentity().id },
  });
  if (budget?.pausedUntil && budget.pausedUntil > now) {
    return {
      completed: 0,
      paused: budget.pauseReason ?? "TRANSLATION_FREE_QUOTA_EXHAUSTED",
    };
  }
  if (budget && budget.usedCharacters >= getDailyCharacterLimit()) {
    return { completed: 0, paused: "TRANSLATION_DAILY_LIMIT" };
  }
  const tasks = await prisma.contentTranslationTask.findMany({
    where: {
      entityType: options.entityType,
      entityId: options.entityId,
      locale: options.locale,
      field: options.field,
      nextAttemptAt: { lte: now },
      OR: [
        { status: "PENDING" },
        { status: "PROCESSING", lockedUntil: { lte: now } },
      ],
    },
    orderBy: [{ nextAttemptAt: "asc" }, { createdAt: "asc" }],
    take: options.limit ?? 12,
  });
  let completed = 0;
  const deadline = Date.now() + 40_000;
  for (const task of tasks) {
    if (Date.now() >= deadline) break;
    try {
      if (await processTask(task, deadline)) completed += 1;
    } catch (error) {
      if (error instanceof TranslationProviderError)
        return { completed, paused: error.code };
      throw error;
    }
  }
  return { completed, paused: null as string | null };
}

// Existing gatherings are also eligible; API events are never bulk-enqueued.
export async function enqueueExistingGatherings(
  options: { limit?: number; afterId?: string } = {},
) {
  if (!isTranslationEnabled()) return;
  const gatherings = await prisma.activity.findMany({
    where: {
      type: { not: "PUBLIC_EVENT" },
      organizer: { status: "ACTIVE" },
      ...(options.afterId ? { id: { gt: options.afterId } } : {}),
    },
    orderBy: { id: "asc" },
    take: options.limit ?? 100,
    select: gatheringContentSelect,
  });
  let enqueued = 0;
  for (const activity of gatherings) {
    if (isLegacyActivityInfoSource(activity)) continue;
    await enqueueTranslations({
      entityType: "activity",
      entityId: activity.id,
      fields: Object.fromEntries(
        automaticTranslationFields.map((field) => [field, activity[field]]),
      ),
      locales: contentLocales,
    });
    enqueued += 1;
  }
  return { count: gatherings.length, enqueued, afterId: gatherings.at(-1)?.id };
}

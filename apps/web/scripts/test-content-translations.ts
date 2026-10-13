import assert from "node:assert/strict";

const testDatabaseUrl = process.env.TRANSLATION_TEST_DATABASE_URL;
if (
  !testDatabaseUrl ||
  !["127.0.0.1", "localhost"].includes(new URL(testDatabaseUrl).hostname) ||
  !new URL(testDatabaseUrl).pathname.includes("translation_qa")
) {
  throw new Error(
    "Use TRANSLATION_TEST_DATABASE_URL pointing to an isolated local translation_qa database.",
  );
}
process.env.DATABASE_URL = testDatabaseUrl;
process.env.DIRECT_URL = testDatabaseUrl;
process.env.CLERK_SECRET_KEY = "";
process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY = "";
process.env.CLOUDFLARE_TRANSLATOR_ENABLED = "true";
process.env.CLOUDFLARE_WORKERS_PLAN = "FREE";
process.env.CLOUDFLARE_API_TOKEN = "test-key-never-sent-to-the-network";
process.env.CLOUDFLARE_ACCOUNT_ID = "0".repeat(32);
process.env.CLOUDFLARE_TRANSLATOR_DAILY_CHARACTER_LIMIT = "100000";

const { prisma } = await import("../lib/prisma");
const {
  enqueueGatheringTranslations,
  enqueueTranslations,
  processTranslationQueue,
} = await import("../features/translations/services/translationQueue");
const { warmupViewedContent, getTranslationSource } =
  await import("../features/translations/services/contentTranslations");
const { localizeContent, localizeActivityContentTree } =
  await import("../features/translations/services/localizedContent");
const originalFetch = globalThis.fetch;
let calls: Array<{ operation: string; text: string; locale: string | null }> =
  [];
let failQuota = false;
let failChunk = false;
let chunkTranslations = 0;
globalThis.fetch = async (input, init) => {
  const url = new URL(String(input));
  assert.equal(
    url.hostname,
    "api.cloudflare.com",
    "No other provider may be called",
  );
  const body = JSON.parse(String(init?.body));
  const operation = body.response_format.json_schema.properties.language
    ? "detect"
    : "translate";
  const text: string = JSON.parse(body.messages[1].content).text;
  const locale =
    operation === "detect"
      ? null
      : body.messages[0].content.includes("into natural Simplified Chinese")
        ? "zh-Hans"
        : body.messages[0].content.includes("into natural French")
          ? "fr"
          : "en";
  calls.push({ operation, text, locale });
  if (failQuota)
    return Response.json(
      { success: false, errors: [{ code: 3036 }] },
      { status: 429 },
    );
  if (operation === "detect")
    return Response.json({
      success: true,
      result: { response: { language: "fr" } },
    });
  if (failChunk && text.length > 100 && ++chunkTranslations === 2)
    return Response.json(
      { success: false, errors: [{ code: 3040 }] },
      { status: 429, headers: { "retry-after": "60" } },
    );
  return Response.json({
    success: true,
    result: { response: { translated_text: `${locale}: ${text}` } },
  });
};

const eventData = {
  category: "WANDER" as const,
  address: "Jardin du Luxembourg, Paris",
  startAt: new Date("2027-01-20T14:00:00Z"),
  endAt: new Date("2027-01-20T16:00:00Z"),
};
try {
  await prisma.contentTranslation.deleteMany();
  await prisma.contentTranslationTask.deleteMany();
  await prisma.contentTranslationBudget.deleteMany();
  await prisma.merchantResidencySignup.deleteMany();
  await prisma.merchantResidencySlot.deleteMany();
  await prisma.merchantBookingReservation.deleteMany();
  await prisma.merchantBookingSettings.deleteMany();
  await prisma.activity.deleteMany();
  await prisma.merchant.deleteMany();
  await prisma.publicEvent.deleteMany();
  await prisma.userProfile.deleteMany();
  const owner = await prisma.userProfile.create({
    data: { clerkUserId: "translation-qa-owner", nickname: "Camille" },
  });
  const event = await prisma.publicEvent.create({
    data: {
      ...eventData,
      id: "translation-qa-event",
      title: "Balade au jardin du Luxembourg",
      description:
        "Retrouvons-nous pour une promenade au jardin.\n\nEntrée gratuite. https://example.com/reserver",
    },
  });
  assert.equal(
    await prisma.contentTranslationTask.count(),
    0,
    "Imported/API events are not bulk queued",
  );
  assert.equal(
    (await localizeContent(event, "en", "public_event")).title,
    event.title,
  );
  assert.equal(calls.length, 0, "Cache-only reads never call Cloudflare");

  const first = await warmupViewedContent({
    entityId: event.id,
    entityType: "public_event",
    locale: "en",
  });
  assert.equal(first.ready, true);
  assert.equal(
    await prisma.contentTranslationTask.count({
      where: { entityId: event.id, locale: { not: "en" } },
    }),
    0,
  );
  const afterFirst = calls.length;
  assert.equal(
    (
      await warmupViewedContent({
        entityId: event.id,
        entityType: "public_event",
        locale: "en",
      })
    ).ready,
    true,
  );
  assert.equal(
    calls.length,
    afterFirst,
    "Repeat visits reuse database translations",
  );
  assert.match(
    (await localizeContent(event, "en", "public_event")).title,
    /^en:/,
  );
  const titleCache = await prisma.contentTranslation.findFirstOrThrow({
    where: { entityId: event.id, field: "title", locale: "en" },
  });
  await prisma.contentTranslation.update({
    where: { id: titleCache.id },
    data: { provider: "cloudflare", translatedText: "Obsolete M2M title" },
  });
  await prisma.contentTranslation.deleteMany({
    where: {
      entityId: event.id,
      field: "title:chunk:llama-3.1-v1",
      locale: "en",
    },
  });
  await prisma.contentTranslation.create({
    data: {
      entityType: "public_event",
      entityId: event.id,
      field: "title:chunk",
      locale: "en",
      sourceHash: titleCache.sourceHash,
      sourceText: titleCache.sourceText,
      translatedText: "Obsolete M2M chunk",
      detectedSourceLocale: "fr",
      provider: "cloudflare",
    },
  });
  await prisma.contentTranslation.updateMany({
    where: { entityId: event.id, field: "description", locale: "en" },
    data: { provider: "deepl", translatedText: "Legacy DeepL description" },
  });
  const beforeModelUpgrade = calls.length;
  assert.equal(
    (await localizeContent(event, "en", "public_event")).title,
    event.title,
  );
  await warmupViewedContent({
    entityId: event.id,
    entityType: "public_event",
    locale: "en",
  });
  const upgraded = await localizeContent(event, "en", "public_event");
  assert.equal(
    calls.length - beforeModelUpgrade,
    1,
    "Only obsolete M2M text is translated again; cached detection is reusable",
  );
  assert.match(upgraded.title, /^en:/);
  assert.equal(
    upgraded.description,
    "Legacy DeepL description",
    "DeepL cache stays reusable without changing the source hash",
  );
  assert.equal(
    (
      await prisma.contentTranslation.findUniqueOrThrow({
        where: { id: titleCache.id },
      })
    ).provider,
    "cloudflare:llama-3.1-8b-instruct:v1",
  );
  console.log(
    "PASS: obsolete M2M fields/chunks are replaced while DeepL cache and source hashes remain compatible",
  );
  const beforeConcurrent = calls.length;
  await Promise.all(
    Array.from({ length: 8 }, () =>
      warmupViewedContent({
        entityId: event.id,
        entityType: "public_event",
        locale: "zh-CN",
      }),
    ),
  );
  assert.equal(
    calls.length - beforeConcurrent,
    2,
    "One request per untranslated text segment, despite eight viewers",
  );
  assert.equal(
    (
      await warmupViewedContent({
        entityId: event.id,
        entityType: "public_event",
        locale: "zh-CN",
      })
    ).ready,
    true,
  );

  const changed = await prisma.publicEvent.update({
    where: { id: event.id },
    data: { description: "La promenade commence maintenant à quinze heures." },
  });
  assert.equal(
    (await localizeContent(changed, "en", "public_event")).description,
    changed.description,
    "An edited description never uses stale translation",
  );
  const beforeChanged = calls.length;
  await warmupViewedContent({
    entityId: event.id,
    entityType: "public_event",
    locale: "en",
  });
  assert.equal(
    calls.length - beforeChanged,
    2,
    "Only the edited description is detected/translated",
  );

  const gathering = await prisma.activity.create({
    data: {
      ...eventData,
      id: "translation-qa-gathering",
      title: "Promenade entre amis",
      description: "Un petit groupe pour découvrir les jardins ensemble.",
      capacity: 8,
      priceText: "Gratuit",
      organizerId: owner.id,
    },
  });
  const legacyApiActivity = await prisma.activity.create({
    data: {
      ...eventData,
      id: "paris-opendata_qa_legacy",
      title: "Legacy API event",
      description: "Imported API content",
      source: "paris-opendata",
      capacity: 0,
      priceText: "",
      organizerId: owner.id,
    },
  });
  await enqueueGatheringTranslations(legacyApiActivity.id);
  assert.equal(
    await prisma.contentTranslationTask.count({
      where: { entityId: legacyApiActivity.id },
    }),
    0,
    "Legacy API activities must not be mistaken for gatherings",
  );
  await warmupViewedContent({
    entityId: legacyApiActivity.id,
    entityType: "activity",
    locale: "en",
  });
  assert.equal(
    await prisma.contentTranslationTask.count({
      where: { entityId: legacyApiActivity.id, locale: { not: "en" } },
    }),
    0,
    "Viewing a legacy API activity never queues unvisited languages",
  );
  await enqueueGatheringTranslations(gathering.id);
  assert.equal(
    await prisma.contentTranslationTask.count({
      where: { entityId: gathering.id },
    }),
    6,
  );
  await processTranslationQueue({
    entityId: gathering.id,
    entityType: "activity",
    limit: 6,
  });
  assert.equal(
    await prisma.contentTranslation.count({
      where: {
        entityId: gathering.id,
        field: { in: ["title", "description"] },
      },
    }),
    6,
  );
  assert.equal(
    calls.filter(
      (call) => call.operation === "translate" && call.locale === "fr",
    ).length,
    0,
    "Original French is preserved without translating to itself",
  );
  const beforeFeed = calls.length;
  const feed = await localizeActivityContentTree(
    { activities: [{ ...gathering, type: "LOCAL" }] },
    "en",
  );
  assert.match(feed.activities[0].title, /^en:/);
  assert.equal(calls.length, beforeFeed);
  const { saveBookingSettings } = await import("../features/merchants/bookings/service");
  const { getPublicBookingSpaceByActivity, getOwnerBookingDashboard } =
    await import("../features/merchants/bookings/queries");
  await prisma.merchant.create({
    data: {
      slug: "translation-qa-merchant",
      name: "Maison des amis",
      description: "Café de quartier",
      ownerProfileId: owner.id,
    },
  });
  const bookingInput = {
    actorProfileId: owner.id,
    title: "Rencontres au café",
    description: "Réservez une table pour retrouver vos amis.",
    enabled: true,
    enabledChanged: true,
    scheduleMode: "DAILY" as const,
    startDate: "2027-01-20",
    endDate: null,
    weekdays: [],
    specificDates: [],
    closedDates: [],
  };
  const bookingSaved = await saveBookingSettings(bookingInput);
  assert.equal(bookingSaved.status, "SAVED");
  assert.ok(bookingSaved.activityId);
  assert.equal(
    await prisma.contentTranslationTask.count({ where: { entityId: bookingSaved.activityId } }),
    6,
    "Saving a permanent merchant gathering queues all three languages",
  );
  await processTranslationQueue({ entityId: bookingSaved.activityId, entityType: "activity", limit: 6 });
  const bookingSpace = await getPublicBookingSpaceByActivity(bookingSaved.activityId);
  assert.ok(bookingSpace);
  const beforeBookingRead = calls.length;
  const localizedBookingContent = await localizeContent({
    id: bookingSpace.settings.activityId,
    title: bookingSpace.settings.title,
    description: bookingSpace.settings.description,
  }, "en", "activity");
  assert.equal(localizedBookingContent.title, `en: ${bookingInput.title}`);
  assert.equal(localizedBookingContent.description, `en: ${bookingInput.description}`);
  assert.equal(calls.length, beforeBookingRead, "Permanent gathering detail is a cache-only read");
  const ownerDashboard = await getOwnerBookingDashboard(owner.id);
  assert.equal(ownerDashboard?.settings?.title, bookingInput.title, "Owner settings preserve source text");
  await saveBookingSettings({ ...bookingInput, title: "Nouvelle rencontre au café" });
  assert.equal(
    await prisma.contentTranslationTask.count({ where: { entityId: bookingSaved.activityId, field: "title", status: "PENDING" } }),
    3,
    "Editing a permanent gathering queues the changed title in all locales",
  );
  await processTranslationQueue({ entityId: bookingSaved.activityId, entityType: "activity", limit: 6 });
  const editedBookingSpace = await getPublicBookingSpaceByActivity(bookingSaved.activityId);
  assert.ok(editedBookingSpace);
  const editedBookingContent = await localizeContent({
    id: editedBookingSpace.settings.activityId,
    title: editedBookingSpace.settings.title,
    description: editedBookingSpace.settings.description,
  }, "en", "activity");
  assert.equal(editedBookingContent.title, "en: Nouvelle rencontre au café");
  console.log("PASS: permanent merchant gatherings translate on save/edit, public cache hashes match Activity text and owner settings retain originals");

  const { publishResidencySlot } = await import("../features/merchants/residency/service");
  const residencyMerchant = await prisma.merchant.findUniqueOrThrow({ where: { slug: "translation-qa-merchant" } });
  const residencySlot = await prisma.merchantResidencySlot.create({
    data: {
      merchantId: residencyMerchant.id,
      date: new Date("2027-02-20T00:00:00Z"),
      title: "Soirée entre voisins",
      description: "Retrouvons-nous au café pour partager nos histoires.",
      status: "CONFIRMED",
    },
  });
  const residencyPublished = await publishResidencySlot({
    actorProfileId: owner.id,
    slotId: residencySlot.id,
    startTime: "18:00",
    address: "1 rue Friemi, Paris",
  });
  assert.equal(residencyPublished.status, "PUBLISHED");
  assert.ok(residencyPublished.activityId);
  assert.equal(
    await prisma.contentTranslationTask.count({ where: { entityId: residencyPublished.activityId } }),
    6,
    "Publishing a merchant residency gathering queues all three languages",
  );
  await processTranslationQueue({ entityId: residencyPublished.activityId, entityType: "activity", limit: 6 });
  const residencyActivity = await prisma.activity.findUniqueOrThrow({ where: { id: residencyPublished.activityId } });
  const localizedResidency = await localizeContent(residencyActivity, "en", "activity");
  assert.equal(localizedResidency.title, `en: ${residencySlot.title}`);
  assert.equal(localizedResidency.description, `en: ${residencySlot.description}`);
  const beforeResidencyRetry = calls.length;
  await publishResidencySlot({ actorProfileId: owner.id, slotId: residencySlot.id, startTime: "18:00", address: "1 rue Friemi, Paris" });
  await processTranslationQueue({ entityId: residencyPublished.activityId, entityType: "activity", limit: 6 });
  assert.equal(calls.length, beforeResidencyRetry, "Repeated publication reuses completed translations");
  console.log("PASS: merchant residency publication queues all locales and repeated publication reuses the cache");

  const privateGathering = await prisma.activity.create({
    data: {
      ...eventData,
      title: "Privé",
      description: "Privé",
      capacity: 2,
      priceText: "",
      organizerId: owner.id,
      visibility: "PRIVATE",
    },
  });
  await assert.rejects(
    warmupViewedContent({
      entityId: privateGathering.id,
      entityType: "activity",
      locale: "en",
    }),
    /ENTITY_NOT_FOUND/,
  );
  assert.equal(
    await prisma.contentTranslationTask.count({
      where: { entityId: privateGathering.id },
    }),
    0,
  );
  console.log(
    "PASS: on-view translation, database reuse, concurrency, edit invalidation, all-language gatherings, cache-only feeds and private access",
  );

  const peer = await prisma.userProfile.create({
    data: { clerkUserId: "translation-qa-peer", nickname: "Alex" },
  });
  const outsider = await prisma.userProfile.create({
    data: { clerkUserId: "translation-qa-outsider", nickname: "Outside" },
  });
  const conversation = await prisma.conversation.create({
    data: { userAId: owner.id, userBId: peer.id },
  });
  const direct = await prisma.directMessage.create({
    data: {
      conversationId: conversation.id,
      senderId: owner.id,
      body: "Salut, on se retrouve demain ?",
    },
  });
  const roomMessage = await prisma.activityRoomMessage.create({
    data: {
      activityId: gathering.id,
      senderId: owner.id,
      body: "Rendez-vous devant le jardin.",
    },
  });
  const planet = await prisma.planet.create({
    data: {
      name: "Translation QA",
      slug: "translation-qa",
      inviteCode: "translation-qa",
      ownerId: owner.id,
      members: {
        create: [
          { profileId: owner.id, role: "OWNER", status: "APPROVED" },
          { profileId: peer.id, status: "PENDING" },
        ],
      },
    },
  });
  const planetMessage = await prisma.planetMessage.create({
    data: {
      planetId: planet.id,
      authorId: owner.id,
      content: "Bienvenue à notre rencontre.",
    },
  });
  const messageTypes = [
    "direct_message",
    "activity_room_message",
    "planet_message",
  ] as const;
  const beforeMessages = calls.length;
  await processTranslationQueue({ limit: 120 });
  assert.equal(
    calls.length,
    beforeMessages,
    "Creating and reading messages does not translate them",
  );
  assert.equal(
    await prisma.contentTranslationTask.count({
      where: { entityType: { in: [...messageTypes] } },
    }),
    0,
  );
  const directInput = {
    entityType: "direct_message" as const,
    entityId: direct.id,
    field: "body",
  };
  await assert.rejects(getTranslationSource(directInput), /AUTH_REQUIRED/);
  await assert.rejects(
    getTranslationSource({ ...directInput, viewerProfileId: outsider.id }),
    /ENTITY_NOT_FOUND/,
  );
  assert.equal(
    await getTranslationSource({ ...directInput, viewerProfileId: peer.id }),
    direct.body,
  );
  await prisma.directMessageDeletion.create({
    data: { messageId: direct.id, profileId: peer.id },
  });
  await assert.rejects(
    getTranslationSource({ ...directInput, viewerProfileId: peer.id }),
    /ENTITY_NOT_FOUND/,
  );
  assert.equal(
    await getTranslationSource({ ...directInput, viewerProfileId: owner.id }),
    direct.body,
  );
  const roomInput = {
    entityType: "activity_room_message" as const,
    entityId: roomMessage.id,
    field: "body",
  };
  await assert.rejects(
    getTranslationSource({ ...roomInput, viewerProfileId: outsider.id }),
    /ENTITY_NOT_FOUND/,
  );
  assert.equal(
    await getTranslationSource({ ...roomInput, viewerProfileId: owner.id }),
    roomMessage.body,
  );
  const planetInput = {
    entityType: "planet_message" as const,
    entityId: planetMessage.id,
    field: "content",
  };
  await assert.rejects(
    getTranslationSource({ ...planetInput, viewerProfileId: peer.id }),
    /ENTITY_NOT_FOUND/,
  );
  await assert.rejects(
    getTranslationSource({ ...planetInput, viewerProfileId: outsider.id }),
    /ENTITY_NOT_FOUND/,
  );
  assert.equal(
    await getTranslationSource({ ...planetInput, viewerProfileId: owner.id }),
    planetMessage.content,
  );
  for (const [entityType, message, field, text] of [
    ["direct_message", direct, "body", direct.body],
    ["activity_room_message", roomMessage, "body", roomMessage.body],
    ["planet_message", planetMessage, "content", planetMessage.content],
  ] as const) {
    // Simulate the authorized button request after source authorization above.
    await enqueueTranslations({
      entityType,
      entityId: message.id,
      fields: { [field]: text },
      locales: ["en"],
    });
    assert.equal(
      (
        await processTranslationQueue({
          entityType,
          entityId: message.id,
          limit: 1,
        })
      ).completed,
      1,
    );
    assert.equal(
      await prisma.contentTranslation.count({
        where: { entityType, entityId: message.id, field, locale: "en" },
      }),
      1,
    );
    const afterClick: number = calls.length;
    await enqueueTranslations({
      entityType,
      entityId: message.id,
      fields: { [field]: text },
      locales: ["en"],
    });
    await processTranslationQueue({ entityType, entityId: message.id });
    assert.equal(
      calls.length,
      afterClick,
      "Repeated clicks reuse the saved message translation",
    );
    assert.equal(
      await prisma.contentTranslationTask.count({
        where: { entityType, entityId: message.id, locale: { not: "en" } },
      }),
      0,
    );
  }
  await prisma.directMessage.update({
    where: { id: direct.id },
    data: { recalledAt: new Date() },
  });
  await assert.rejects(
    getTranslationSource({ ...directInput, viewerProfileId: owner.id }),
    /ENTITY_NOT_FOUND/,
  );
  await prisma.activityRoomMessage.update({
    where: { id: roomMessage.id },
    data: { deletedAt: new Date() },
  });
  await assert.rejects(
    getTranslationSource({ ...roomInput, viewerProfileId: owner.id }),
    /ENTITY_NOT_FOUND/,
  );
  const pendingMessage = await prisma.planetMessage.create({
    data: {
      planetId: planet.id,
      authorId: owner.id,
      content: "Première version",
    },
  });
  await enqueueTranslations({
    entityType: "planet_message",
    entityId: pendingMessage.id,
    fields: { content: pendingMessage.content },
    locales: ["en"],
  });
  await prisma.planetMessage.update({
    where: { id: pendingMessage.id },
    data: { content: "Nouvelle version" },
  });
  const beforeEdit = calls.length;
  await processTranslationQueue({
    entityType: "planet_message",
    entityId: pendingMessage.id,
  });
  assert.equal(
    calls.length,
    beforeEdit,
    "Edits never automatically translate a new message version",
  );
  console.log(
    "PASS: messages translate only on click, saved results reused, private chat permissions, deletions/recalls and edits respected",
  );

  const longEvent = await prisma.publicEvent.create({
    data: {
      ...eventData,
      title: "Texte long",
      description: Array.from(
        { length: 8 },
        (_, i) => `Segment${i} ` + "a".repeat(230),
      ).join("\n"),
    },
  });
  failChunk = true;
  const partial = await warmupViewedContent({
    entityId: longEvent.id,
    entityType: "public_event",
    locale: "en",
  });
  assert.equal(partial.paused, "TRANSLATION_RATE_LIMITED");
  const savedChunks = calls.filter(
    (call) => call.operation === "translate" && call.text.length > 100,
  );
  const firstChunk = savedChunks[0].text;
  failChunk = false;
  await prisma.contentTranslationTask.updateMany({
    where: { entityId: longEvent.id },
    data: { nextAttemptAt: new Date(0) },
  });
  assert.equal(
    (
      await warmupViewedContent({
        entityId: longEvent.id,
        entityType: "public_event",
        locale: "en",
      })
    ).ready,
    true,
  );
  assert.equal(
    calls.filter(
      (call) => call.operation === "translate" && call.text === firstChunk,
    ).length,
    1,
    "Completed chunks survive partial failures",
  );
  console.log("PASS: long descriptions resume using saved chunks");

  const quotaEvent = await prisma.publicEvent.create({
    data: {
      ...eventData,
      title: "Quota test",
      description: "Quota test description",
    },
  });
  failQuota = true;
  const beforeQuota = calls.length;
  assert.equal(
    (
      await warmupViewedContent({
        entityId: quotaEvent.id,
        entityType: "public_event",
        locale: "en",
      })
    ).paused,
    "TRANSLATION_FREE_QUOTA_EXHAUSTED",
  );
  await warmupViewedContent({
    entityId: quotaEvent.id,
    entityType: "public_event",
    locale: "zh-CN",
  });
  assert.equal(
    (
      await warmupViewedContent({
        entityId: quotaEvent.id,
        entityType: "public_event",
        locale: "en",
      })
    ).paused,
    "TRANSLATION_FREE_QUOTA_EXHAUSTED",
    "Repeated visits keep the durable quota status",
  );
  assert.equal(
    calls.length - beforeQuota,
    1,
    "After free quota exhaustion every worker stops making provider calls",
  );
  assert.equal(
    (await localizeContent(quotaEvent, "en", "public_event")).title,
    quotaEvent.title,
  );
  assert.match(
    (await localizeContent(gathering, "en", "activity")).title,
    /^en:/,
    "Existing translations remain available while paused",
  );
  console.log(
    "PASS: durable daily free quota pause, original fallback and cached translations while paused",
  );

  failQuota = false;
  await prisma.contentTranslationBudget.deleteMany();
  await prisma.contentTranslationTask.updateMany({
    data: { nextAttemptAt: new Date(0) },
  });
  process.env.CLOUDFLARE_TRANSLATOR_DAILY_CHARACTER_LIMIT = "30";
  calls = [];
  await Promise.all([
    warmupViewedContent({
      entityId: quotaEvent.id,
      entityType: "public_event",
      locale: "en",
    }),
    warmupViewedContent({
      entityId: quotaEvent.id,
      entityType: "public_event",
      locale: "zh-CN",
    }),
  ]);
  const used = (await prisma.contentTranslationBudget.findFirstOrThrow())
    .usedCharacters;
  assert.ok(used <= 30, "Atomic reservation must never overrun the local cap");
  assert.equal(
    calls.reduce((sum, call) => sum + call.text.length, 0),
    used,
  );
  console.log("PASS: concurrent daily budget reservations stay within the cap");

  // Preserve these isolated local fixtures for desktop/mobile browser QA.
  await prisma.contentTranslationBudget.deleteMany();
  process.env.CLOUDFLARE_TRANSLATOR_DAILY_CHARACTER_LIMIT = "100000";
  console.log(
    "Browser fixtures: translation-qa-event and translation-qa-gathering (isolated local database only)",
  );
} finally {
  globalThis.fetch = originalFetch;
  await prisma.$disconnect();
}

import nextEnv from "@next/env";

nextEnv.loadEnvConfig(process.cwd());
const { getCloudflareConfiguration } =
  await import("../features/translations/services/cloudflare");
const { enqueueExistingGatherings, processTranslationQueue } =
  await import("../features/translations/services/translationQueue");
const { prisma } = await import("../lib/prisma");

try {
  getCloudflareConfiguration();
  let afterId: string | undefined;
  let count = 0;
  do {
    const batch = await enqueueExistingGatherings({ afterId });
    if (!batch || !batch.count) break;
    count += batch.enqueued;
    afterId = batch.afterId;
  } while (afterId);
  console.log(
    JSON.stringify({
      enqueuedGatherings: count,
      worker: await processTranslationQueue({ limit: 120 }),
    }),
  );
} finally {
  await prisma.$disconnect();
}

import { NextResponse } from "next/server";
import { runScheduledGuestLink } from "@/features/guest-participants/services/guestLinkScheduler";
import { prisma } from "@/lib/prisma";
import {
  getPerformanceRolloutMode,
  isPerformanceRolloutActive,
} from "@/lib/performanceRollouts";

export const dynamic = "force-dynamic";

function isAuthorized(request: Request) {
  const cronSecret = process.env.CRON_SECRET;

  return Boolean(
    cronSecret &&
    request.headers.get("authorization") === `Bearer ${cronSecret}`,
  );
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  if (!isPerformanceRolloutActive("guestLink")) {
    return NextResponse.json({ disabled: true });
  }

  const staleBefore = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const profiles = await prisma.userProfile.findMany({
    where: {
      status: "ACTIVE",
      OR: [
        { guestLinkCheckedAt: null },
        { guestLinkCheckedAt: { lte: staleBefore } },
      ],
      AND: [
        {
          OR: [
            { normalizedContactEmail: { not: null } },
            { normalizedPhone: { not: null } },
            { normalizedWechatId: { not: null } },
            { emailVerifiedAt: { not: null } },
          ],
        },
      ],
    },
    orderBy: [{ guestLinkCheckedAt: "asc" }, { id: "asc" }],
    take: 100,
  });

  let linked = 0;
  let processed = 0;
  let skipped = 0;

  for (let index = 0; index < profiles.length; index += 4) {
    const batch = profiles.slice(index, index + 4);
    const results = await Promise.allSettled(
      batch.map(async (profile) => {
        if (getPerformanceRolloutMode("guestLink", profile.id) === "legacy") {
          return { linked: 0, skipped: true };
        }

        return runScheduledGuestLink({
          force: true,
          prisma,
          profile,
          trigger: "reconciliation",
        });
      }),
    );

    results.forEach((result) => {
      processed += 1;

      if (result.status === "rejected") {
        return;
      }

      linked += result.value.linked;
      skipped += result.value.skipped ? 1 : 0;
    });
  }

  return NextResponse.json({
    candidates: profiles.length,
    linked,
    processed,
    skipped,
  });
}

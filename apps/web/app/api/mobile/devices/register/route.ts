import { NextResponse } from "next/server";
import { z } from "zod";
import { getOptionalCurrentUserProfileSnapshot } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const registerMobileDeviceSchema = z.object({
  appVersion: z.string().trim().max(80).optional().nullable(),
  deviceId: z.string().trim().min(6).max(160).optional().nullable(),
  fcmToken: z.string().trim().min(20).max(4096),
  locale: z.string().trim().max(16).optional().nullable(),
  platform: z.enum(["ANDROID", "IOS"]).default("ANDROID"),
  timezone: z.string().trim().max(80).optional().nullable(),
});

function cleanOptional(value: string | null | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "INVALID_JSON" },
      { status: 400 },
    );
  }

  const parsed = registerMobileDeviceSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "INVALID_MOBILE_DEVICE" },
      { status: 400 },
    );
  }

  const profile = await getOptionalCurrentUserProfileSnapshot();

  if (!profile) {
    return NextResponse.json(
      { ok: false, error: "UNAUTHORIZED" },
      { status: 401 },
    );
  }

  const now = new Date();
  const deviceId = cleanOptional(parsed.data.deviceId);
  const platform = parsed.data.platform;

  if (deviceId) {
    await prisma.mobileDevice.updateMany({
      where: {
        deviceId,
        fcmToken: {
          not: parsed.data.fcmToken,
        },
        platform,
      },
      data: {
        disabledAt: now,
        lastSeenAt: now,
      },
    });
  }

  const device = await prisma.mobileDevice.upsert({
    where: {
      fcmToken: parsed.data.fcmToken,
    },
    create: {
      appVersion: cleanOptional(parsed.data.appVersion),
      deviceId,
      fcmToken: parsed.data.fcmToken,
      lastSeenAt: now,
      locale: cleanOptional(parsed.data.locale),
      platform,
      timezone: cleanOptional(parsed.data.timezone),
      userAgent: cleanOptional(request.headers.get("user-agent")),
      userProfileId: profile.id,
    },
    update: {
      appVersion: cleanOptional(parsed.data.appVersion),
      deviceId,
      disabledAt: null,
      lastSeenAt: now,
      locale: cleanOptional(parsed.data.locale),
      platform,
      timezone: cleanOptional(parsed.data.timezone),
      userAgent: cleanOptional(request.headers.get("user-agent")),
      userProfileId: profile.id,
    },
    select: {
      id: true,
      lastSeenAt: true,
      platform: true,
    },
  });

  return NextResponse.json({
    ok: true,
    device,
  });
}

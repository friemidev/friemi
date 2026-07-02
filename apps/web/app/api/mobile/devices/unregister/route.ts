import { NextResponse } from "next/server";
import { z } from "zod";
import { getOptionalCurrentUserProfileSnapshot } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const unregisterMobileDeviceSchema = z
  .object({
    deviceId: z.string().trim().min(6).max(160).optional().nullable(),
    fcmToken: z.string().trim().min(20).max(4096).optional().nullable(),
    platform: z.enum(["ANDROID", "IOS"]).default("ANDROID"),
  })
  .refine((value) => value.deviceId || value.fcmToken, {
    message: "Missing device identifier.",
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

  const parsed = unregisterMobileDeviceSchema.safeParse(body);

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

  const deviceId = cleanOptional(parsed.data.deviceId);
  const fcmToken = cleanOptional(parsed.data.fcmToken);
  const disabled = await prisma.mobileDevice.updateMany({
    where: {
      platform: parsed.data.platform,
      userProfileId: profile.id,
      OR: [
        ...(deviceId ? [{ deviceId }] : []),
        ...(fcmToken ? [{ fcmToken }] : []),
      ],
    },
    data: {
      disabledAt: new Date(),
    },
  });

  return NextResponse.json({
    ok: true,
    disabledCount: disabled.count,
  });
}

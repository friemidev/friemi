"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { ensureCurrentUserProfile } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { withLocale } from "@/lib/routes";
import {
  getNowCopy,
  getNowExpiry,
  isNowKind,
  isNowVisibilityHours,
  nowOpenCity,
} from "./now";

export type NowActionState = { error?: string; ok?: boolean };

function field(form: FormData, name: string) {
  const value = form.get(name);
  return typeof value === "string" ? value.trim() : "";
}

function refreshNow(locale: string, inviteId?: string) {
  revalidatePath(withLocale(locale, "/mobile-home"));
  revalidatePath(withLocale(locale, "/now"));
  revalidatePath(withLocale(locale, "/now/mine"));
  if (inviteId) revalidatePath(withLocale(locale, `/now/${inviteId}`));
}

const createSchema = z.object({
  area: z.string().trim().min(2).max(80),
  category: z.string().refine(isNowKind),
  title: z.string().trim().min(2).max(48),
  note: z.string().trim().max(50),
  visibilityHours: z.coerce.number().refine(isNowVisibilityHours),
});

export async function createNowInviteAction(
  _previous: NowActionState,
  form: FormData,
): Promise<NowActionState> {
  const locale = field(form, "locale") || "zh-CN";
  const copy = getNowCopy(locale);
  const parsed = createSchema.safeParse({
    area: field(form, "area"),
    category: field(form, "category"),
    title: field(form, "title"),
    note: field(form, "note"),
    visibilityHours: field(form, "visibilityHours"),
  });
  if (!parsed.success) return { error: copy.formError };

  const profile = await ensureCurrentUserProfile(locale, "/now/new");
  const now = new Date();
  const invite = await prisma.nowInvite.create({
    data: {
      organizerId: profile.id,
      category: parsed.data.category,
      title: parsed.data.title,
      city: nowOpenCity,
      area: parsed.data.area,
      note: parsed.data.note || null,
      visibilityHours: parsed.data.visibilityHours,
      expiresAt: getNowExpiry(now, parsed.data.visibilityHours),
    },
    select: { id: true },
  });
  refreshNow(locale, invite.id);
  redirect(withLocale(locale, `/now/${invite.id}`));
}

const interestSchema = z.object({
  inviteId: z.string().min(1).max(100),
  intent: z.enum(["join", "withdraw"]),
  note: z.string().trim().max(50),
});

export async function changeNowInterestAction(
  _previous: NowActionState,
  form: FormData,
): Promise<NowActionState> {
  const locale = field(form, "locale") || "zh-CN";
  const parsed = interestSchema.safeParse({
    inviteId: field(form, "inviteId"),
    intent: field(form, "intent"),
    note: field(form, "note"),
  });
  if (!parsed.success) return { error: getNowCopy(locale).formError };
  const profile = await ensureCurrentUserProfile(
    locale,
    `/now/${parsed.data.inviteId}`,
  );
  const invite = await prisma.nowInvite.findUnique({
    where: { id: parsed.data.inviteId },
    select: { organizerId: true, expiresAt: true },
  });
  if (!invite || invite.organizerId === profile.id)
    return { error: getNowCopy(locale).formError };
  if (parsed.data.intent === "join" && invite.expiresAt <= new Date()) {
    return { error: getNowCopy(locale).closed };
  }
  if (parsed.data.intent === "join") {
    await prisma.nowInterest.upsert({
      where: {
        inviteId_profileId: {
          inviteId: parsed.data.inviteId,
          profileId: profile.id,
        },
      },
      create: {
        inviteId: parsed.data.inviteId,
        profileId: profile.id,
        note: parsed.data.note || null,
      },
      update: {
        withdrawnAt: null,
        selectedAt: null,
        note: parsed.data.note || null,
      },
    });
  } else {
    await prisma.nowInterest.updateMany({
      where: { inviteId: parsed.data.inviteId, profileId: profile.id },
      data: { withdrawnAt: new Date(), selectedAt: null },
    });
  }
  refreshNow(locale, parsed.data.inviteId);
  return { ok: true };
}

const messageSchema = z.object({
  inviteId: z.string().min(1).max(100),
  body: z.string().trim().min(1).max(280),
});

export async function sendNowMessageAction(
  _previous: NowActionState,
  form: FormData,
): Promise<NowActionState> {
  const locale = field(form, "locale") || "zh-CN";
  const parsed = messageSchema.safeParse({
    inviteId: field(form, "inviteId"),
    body: field(form, "body"),
  });
  if (!parsed.success) return { error: getNowCopy(locale).formError };
  const profile = await ensureCurrentUserProfile(
    locale,
    `/now/${parsed.data.inviteId}`,
  );
  const invite = await prisma.nowInvite.findFirst({
    where: {
      id: parsed.data.inviteId,
      OR: [
        { organizerId: profile.id },
        { interests: { some: { profileId: profile.id, withdrawnAt: null } } },
      ],
    },
    select: { id: true },
  });
  if (!invite) return { error: getNowCopy(locale).formError };
  await prisma.nowInviteMessage.create({
    data: { inviteId: invite.id, authorId: profile.id, body: parsed.data.body },
  });
  refreshNow(locale, invite.id);
  return { ok: true };
}

export async function selectNowInterestAction(form: FormData): Promise<void> {
  const locale = field(form, "locale") || "zh-CN";
  const inviteId = field(form, "inviteId");
  const interestProfileId = field(form, "profileId");
  if (!inviteId || !interestProfileId) return;
  const profile = await ensureCurrentUserProfile(locale, `/now/${inviteId}`);
  const invite = await prisma.nowInvite.findFirst({
    where: { id: inviteId, organizerId: profile.id, linkedActivityId: null },
    select: { id: true },
  });
  if (!invite) return;
  await prisma.nowInterest.updateMany({
    where: { inviteId, profileId: interestProfileId, withdrawnAt: null },
    data: { selectedAt: field(form, "selected") === "1" ? new Date() : null },
  });
  refreshNow(locale, inviteId);
}

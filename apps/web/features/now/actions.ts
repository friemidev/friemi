"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import {
  createNotification,
  createNotifications,
} from "@/features/notifications/utils/createNotification";
import { ensureCurrentUserProfile } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { withLocale } from "@/lib/routes";
import {
  getNowCopy,
  getNowExpiry,
  isNowIntentWindow,
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
  intentWindow: z.string().refine(isNowIntentWindow),
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
    intentWindow: field(form, "intentWindow"),
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
      intentWindow: parsed.data.intentWindow,
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
  redirect(withLocale(locale, `/now/${invite.id}?justPublished=1`));
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
    select: { organizerId: true, expiresAt: true, linkedActivityId: true },
  });
  if (!invite || invite.organizerId === profile.id)
    return { error: getNowCopy(locale).formError };
  if (
    parsed.data.intent === "join" &&
    (invite.expiresAt <= new Date() || invite.linkedActivityId)
  ) {
    return { error: getNowCopy(locale).closed };
  }
  if (parsed.data.intent === "join") {
    await prisma.$transaction(async (tx) => {
      const key = {
        inviteId: parsed.data.inviteId,
        profileId: profile.id,
      };
      const previous = await tx.nowInterest.findUnique({
        where: { inviteId_profileId: key },
        select: { withdrawnAt: true },
      });
      const interest = await tx.nowInterest.upsert({
        where: { inviteId_profileId: key },
        create: { ...key, note: parsed.data.note || null },
        update: {
          withdrawnAt: null,
          selectedAt: null,
          note: parsed.data.note || null,
        },
        select: { id: true, updatedAt: true },
      });
      if (!previous || previous.withdrawnAt) {
        await createNotification(tx, {
          actorId: profile.id,
          nowInviteId: parsed.data.inviteId,
          occurrenceId: `${interest.id}:${interest.updatedAt.toISOString()}`,
          recipientId: invite.organizerId,
          type: "NOW_INTERESTED",
        });
      }
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
    select: {
      id: true,
      organizerId: true,
      interests: {
        where: { withdrawnAt: null },
        select: { profileId: true },
      },
    },
  });
  if (!invite) return { error: getNowCopy(locale).formError };
  await prisma.$transaction(async (tx) => {
    const message = await tx.nowInviteMessage.create({
      data: {
        inviteId: invite.id,
        authorId: profile.id,
        body: parsed.data.body,
      },
      select: { id: true },
    });
    const recipients = new Set([
      invite.organizerId,
      ...invite.interests.map((interest) => interest.profileId),
    ]);
    recipients.delete(profile.id);
    await createNotifications(
      tx,
      [...recipients].map((recipientId) => ({
        actorId: profile.id,
        nowInviteId: invite.id,
        occurrenceId: message.id,
        recipientId,
        type: "NOW_MESSAGE" as const,
      })),
    );
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
  const selected = field(form, "selected") === "1";
  await prisma.$transaction(async (tx) => {
    const changed = await tx.nowInterest.updateMany({
      where: {
        inviteId,
        profileId: interestProfileId,
        withdrawnAt: null,
        selectedAt: selected ? null : { not: null },
      },
      data: { selectedAt: selected ? new Date() : null },
    });
    if (selected && changed.count) {
      await createNotification(tx, {
        actorId: profile.id,
        nowInviteId: inviteId,
        occurrenceId: `${inviteId}:${interestProfileId}:${Date.now()}`,
        recipientId: interestProfileId,
        type: "NOW_SELECTED",
      });
    }
  });
  refreshNow(locale, inviteId);
}

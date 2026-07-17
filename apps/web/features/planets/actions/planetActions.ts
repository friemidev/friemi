"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { ensureCurrentUserProfile } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canCreatePlanet } from "@/features/planets/queries/planetCreationEligibility";
import { withLocale } from "@/lib/routes";

const planetSchema = z.object({
  locale: z.string().min(1).default("zh-CN"),
  name: z.string().trim().min(2).max(60),
  description: z.string().trim().max(500).optional(),
  tags: z.string().trim().max(160).optional(),
});

const planetIdSchema = z.object({
  locale: z.string().min(1).default("zh-CN"),
  planetId: z.string().min(1),
  planetSlug: z.string().min(1),
});

const messageSchema = planetIdSchema.extend({
  content: z.string().trim().min(1).max(1000),
});

const momentSchema = planetIdSchema.extend({
  content: z.string().trim().max(2000),
  imageUrls: z.string().optional(),
});

const commentSchema = planetIdSchema.extend({
  momentId: z.string().min(1),
  content: z.string().trim().min(1).max(1000),
});

function readString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function parseImageUrls(value: string | undefined) {
  if (!value) return [];
  try {
    const parsed = z.array(z.string().url()).max(4).safeParse(JSON.parse(value));
    return parsed.success ? parsed.data : [];
  } catch {
    return [];
  }
}

function revalidatePlanet(locale: string, planetSlug?: string) {
  revalidatePath(withLocale(locale, "/planets"));
  if (planetSlug) {
    revalidatePath(withLocale(locale, `/planets/${planetSlug}`));
  }
}

async function requirePlanetMember(planetId: string, profileId: string) {
  const membership = await prisma.planetMember.findUnique({
    where: { planetId_profileId: { planetId, profileId } },
    select: { role: true },
  });

  if (!membership) {
    throw new Error("Planet membership is required.");
  }

  return membership;
}

async function createUniqueSlug(name: string) {
  const normalized = name
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 42);
  const base = normalized || "planet";

  for (let index = 0; index < 20; index += 1) {
    const suffix = index === 0 ? "" : `-${index + 1}`;
    const slug = `${base}${suffix}`;
    const existing = await prisma.planet.findUnique({
      where: { slug },
      select: { id: true },
    });

    if (!existing) {
      return slug;
    }
  }

  return `${base}-${crypto.randomUUID().slice(0, 8)}`;
}

async function createUniqueInviteCode() {
  for (let index = 0; index < 20; index += 1) {
    const inviteCode = crypto.randomUUID().replace(/-/g, "").slice(0, 10).toUpperCase();
    const existing = await prisma.planet.findUnique({
      where: { inviteCode },
      select: { id: true },
    });
    if (!existing) return inviteCode;
  }

  throw new Error("Unable to create a unique planet invite code.");
}

export async function createPlanetAction(formData: FormData) {
  const result = planetSchema.safeParse({
    locale: readString(formData, "locale") || "zh-CN",
    name: readString(formData, "name"),
    description: readString(formData, "description"),
    tags: readString(formData, "tags"),
  });

  if (!result.success) {
    return;
  }

  const profile = await ensureCurrentUserProfile(result.data.locale, "/planets/create");
  if (!(await canCreatePlanet(profile))) {
    redirect(withLocale(result.data.locale, "/planets"));
  }
  const slug = await createUniqueSlug(result.data.name);
  const inviteCode = await createUniqueInviteCode();
  const tags = (result.data.tags ?? "")
    .split(/[,，]/)
    .map((tag) => tag.trim())
    .filter(Boolean)
    .slice(0, 5);

  await prisma.planet.create({
    data: {
      slug,
      inviteCode,
      name: result.data.name,
      description: result.data.description || null,
      tags,
      visibility: "PUBLIC",
      ownerId: profile.id,
      members: { create: { profileId: profile.id, role: "OWNER" } },
    },
  });

  revalidatePlanet(result.data.locale, slug);
  redirect(withLocale(result.data.locale, `/planets/${slug}`));
}

export async function joinPlanetAction(formData: FormData) {
  const result = planetIdSchema.safeParse({
    locale: readString(formData, "locale") || "zh-CN",
    planetId: readString(formData, "planetId"),
    planetSlug: readString(formData, "planetSlug"),
  });
  if (!result.success) return;

  const profile = await ensureCurrentUserProfile(result.data.locale);
  const planet = await prisma.planet.findFirst({
    where: { id: result.data.planetId, slug: result.data.planetSlug, visibility: "PUBLIC" },
    select: { id: true },
  });
  if (!planet) return;

  await prisma.planetMember.upsert({
    where: { planetId_profileId: { planetId: planet.id, profileId: profile.id } },
    create: { planetId: planet.id, profileId: profile.id },
    update: {},
  });
  revalidatePlanet(result.data.locale, result.data.planetSlug);
}

export async function joinPlanetByInviteAction(formData: FormData) {
  const locale = readString(formData, "locale") || "zh-CN";
  const inviteCode = readString(formData, "inviteCode").trim().toUpperCase();
  if (!inviteCode) return;

  const profile = await ensureCurrentUserProfile(locale);
  const planet = await prisma.planet.findUnique({
    where: { inviteCode },
    select: { id: true, slug: true },
  });
  if (!planet) return;

  await prisma.planetMember.upsert({
    where: { planetId_profileId: { planetId: planet.id, profileId: profile.id } },
    create: { planetId: planet.id, profileId: profile.id },
    update: {},
  });
  revalidatePlanet(locale, planet.slug);
  redirect(withLocale(locale, `/planets/${planet.slug}`));
}

export async function leavePlanetAction(formData: FormData) {
  const result = planetIdSchema.safeParse({
    locale: readString(formData, "locale") || "zh-CN",
    planetId: readString(formData, "planetId"),
    planetSlug: readString(formData, "planetSlug"),
  });
  if (!result.success) return;

  const profile = await ensureCurrentUserProfile(result.data.locale);
  const membership = await requirePlanetMember(result.data.planetId, profile.id);
  if (membership.role === "OWNER") return;

  await prisma.planetMember.delete({
    where: { planetId_profileId: { planetId: result.data.planetId, profileId: profile.id } },
  });
  revalidatePlanet(result.data.locale, result.data.planetSlug);
  redirect(withLocale(result.data.locale, "/planets"));
}

export async function sendPlanetMessageAction(formData: FormData) {
  const result = messageSchema.safeParse({
    locale: readString(formData, "locale") || "zh-CN",
    planetId: readString(formData, "planetId"),
    planetSlug: readString(formData, "planetSlug"),
    content: readString(formData, "content"),
  });
  if (!result.success) return;

  const profile = await ensureCurrentUserProfile(result.data.locale);
  await requirePlanetMember(result.data.planetId, profile.id);
  await prisma.planetMessage.create({
    data: { planetId: result.data.planetId, authorId: profile.id, content: result.data.content },
  });
  revalidatePlanet(result.data.locale, result.data.planetSlug);
}

export async function createPlanetMomentAction(formData: FormData) {
  const result = momentSchema.safeParse({
    locale: readString(formData, "locale") || "zh-CN",
    planetId: readString(formData, "planetId"),
    planetSlug: readString(formData, "planetSlug"),
    content: readString(formData, "content"),
    imageUrls: readString(formData, "imageUrls"),
  });
  if (!result.success) return;

  const imageUrls = parseImageUrls(result.data.imageUrls);
  if (!result.data.content && imageUrls.length === 0) return;

  const profile = await ensureCurrentUserProfile(result.data.locale);
  await requirePlanetMember(result.data.planetId, profile.id);
  await prisma.planetMoment.create({
    data: {
      planetId: result.data.planetId,
      authorId: profile.id,
      content: result.data.content,
      imageUrls,
    },
  });
  revalidatePlanet(result.data.locale, result.data.planetSlug);
}
export async function createPlanetMomentCommentAction(formData: FormData) {
  const result = commentSchema.safeParse({
    locale: readString(formData, "locale") || "zh-CN",
    planetId: readString(formData, "planetId"),
    planetSlug: readString(formData, "planetSlug"),
    momentId: readString(formData, "momentId"),
    content: readString(formData, "content"),
  });
  if (!result.success) return;

  const profile = await ensureCurrentUserProfile(result.data.locale);
  await requirePlanetMember(result.data.planetId, profile.id);
  const moment = await prisma.planetMoment.findFirst({
    where: { id: result.data.momentId, planetId: result.data.planetId },
    select: { id: true },
  });
  if (!moment) return;

  await prisma.planetMomentComment.create({
    data: { momentId: moment.id, authorId: profile.id, content: result.data.content },
  });
  revalidatePlanet(result.data.locale, result.data.planetSlug);
}

export async function togglePlanetMomentLikeAction(formData: FormData) {
  const data = planetIdSchema.safeParse({ locale: readString(formData,"locale") || "zh-CN", planetId: readString(formData,"planetId"), planetSlug: readString(formData,"planetSlug") });
  const momentId = readString(formData,"momentId");
  if (!data.success || !momentId) return;
  const profile = await ensureCurrentUserProfile(data.data.locale);
  await requirePlanetMember(data.data.planetId, profile.id);
  const key = { momentId_profileId: { momentId, profileId: profile.id } };
  const existing = await prisma.planetMomentLike.findUnique({ where: key, select: { id: true } });
  if (existing) await prisma.planetMomentLike.delete({ where: key }); else await prisma.planetMomentLike.create({ data: { momentId, profileId: profile.id } });
  revalidatePlanet(data.data.locale, data.data.planetSlug);
}

export async function togglePlanetCommentLikeAction(formData: FormData) {
  const data = planetIdSchema.safeParse({ locale: readString(formData,"locale") || "zh-CN", planetId: readString(formData,"planetId"), planetSlug: readString(formData,"planetSlug") });
  const commentId = readString(formData,"commentId");
  if (!data.success || !commentId) return;
  const profile = await ensureCurrentUserProfile(data.data.locale);
  await requirePlanetMember(data.data.planetId, profile.id);
  const key = { commentId_profileId: { commentId, profileId: profile.id } };
  const existing = await prisma.planetMomentCommentLike.findUnique({ where: key, select: { id: true } });
  if (existing) await prisma.planetMomentCommentLike.delete({ where: key }); else await prisma.planetMomentCommentLike.create({ data: { commentId, profileId: profile.id } });
  revalidatePlanet(data.data.locale, data.data.planetSlug);
}

export async function deletePlanetMomentAction(formData: FormData) {
  const data = planetIdSchema.safeParse({ locale: readString(formData, "locale") || "zh-CN", planetId: readString(formData, "planetId"), planetSlug: readString(formData, "planetSlug") });
  const momentId = readString(formData, "momentId");
  if (!data.success || !momentId) return;
  const profile = await ensureCurrentUserProfile(data.data.locale);
  const moment = await prisma.planetMoment.findFirst({ where: { id: momentId, planetId: data.data.planetId, authorId: profile.id }, select: { id: true } });
  if (!moment) return;
  await prisma.planetMoment.delete({ where: { id: moment.id } });
  revalidatePlanet(data.data.locale, data.data.planetSlug);
  redirect(withLocale(data.data.locale, `/planets/${data.data.planetSlug}`));
}

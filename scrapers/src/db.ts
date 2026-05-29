import { PrismaClient } from "@prisma/client";
import type { NormalizedActivity } from "./types.js";

let prisma: PrismaClient | null = null;

export function getPrismaClient() {
  if (!prisma) {
    prisma = new PrismaClient();
  }
  return prisma;
}

export async function ensureImporterProfile(options: { clerkUserId: string; nickname: string }) {
  const client = getPrismaClient();
  return client.userProfile.upsert({
    where: { clerkUserId: options.clerkUserId },
    update: {
      nickname: options.nickname,
      status: "ACTIVE",
      syncedAt: new Date(),
    },
    create: {
      clerkUserId: options.clerkUserId,
      nickname: options.nickname,
      bio: "Imported from Sortir a Paris and Play in Paris",
      interests: ["巴黎活动", "展览", "本地活动"],
      status: "ACTIVE",
      syncedAt: new Date(),
    },
  });
}

export async function upsertActivities(organizerId: string, activities: NormalizedActivity[]) {
  const client = getPrismaClient();
  let inserted = 0;

  for (const activity of activities) {
    await client.activity.upsert({
      where: { id: activity.id },
      update: {
        title: activity.title,
        description: activity.description,
        itinerary: activity.itinerary ?? null,
        type: activity.type,
        category: activity.category,
        city: activity.city,
        destination: activity.destination ?? null,
        address: activity.address,
        startAt: activity.startAt,
        endAt: activity.endAt ?? null,
        capacity: activity.capacity,
        minParticipants: activity.minParticipants ?? null,
        requiresApproval: activity.requiresApproval,
        priceType: activity.priceType,
        priceText: activity.priceText,
        coverImageUrl: activity.coverImageUrl ?? null,
        status: activity.status,
        visibility: activity.visibility,
      },
      create: {
        id: activity.id,
        title: activity.title,
        description: activity.description,
        itinerary: activity.itinerary ?? null,
        type: activity.type,
        category: activity.category,
        city: activity.city,
        destination: activity.destination ?? null,
        address: activity.address,
        startAt: activity.startAt,
        endAt: activity.endAt ?? null,
        capacity: activity.capacity,
        minParticipants: activity.minParticipants ?? null,
        requiresApproval: activity.requiresApproval,
        priceType: activity.priceType,
        priceText: activity.priceText,
        coverImageUrl: activity.coverImageUrl ?? null,
        status: activity.status,
        visibility: activity.visibility,
        organizerId,
      },
    });
    inserted += 1;
  }

  return inserted;
}

export async function disconnectPrisma() {
  if (prisma) {
    await prisma.$disconnect();
    prisma = null;
  }
}

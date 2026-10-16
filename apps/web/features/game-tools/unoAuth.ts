import "server-only";

import { auth } from "@clerk/nextjs/server";
import { getOptionalCurrentUserProfile } from "@/lib/auth";
import { hasClerkKeys } from "@/lib/clerk";
import { prisma } from "@/lib/prisma";

export async function getUnoProfile() {
  if (!hasClerkKeys() || !(await auth()).userId) return null;
  const profile = await getOptionalCurrentUserProfile();
  return profile?.status === "ACTIVE" ? profile : null;
}

export async function getExistingUnoProfileId() {
  if (!hasClerkKeys()) return null;
  const { userId } = await auth();
  if (!userId) return null;
  const profile = await prisma.userProfile.findUnique({ where: { clerkUserId: userId }, select: { id: true, status: true } });
  return profile?.status === "ACTIVE" ? profile.id : null;
}

import "server-only";

import { auth } from "@clerk/nextjs/server";
import { hasClerkKeys } from "@/lib/clerk";
import { prisma } from "@/lib/prisma";

// Room requests are only made after joining, when the profile already exists.
// Avoid a Clerk user fetch and profile sync on every two-second room poll.
export async function getExistingDrawGuessProfileId() {
  const userId = hasClerkKeys() ? (await auth()).userId : "local-dev-user";
  if (!userId) return null;
  const profile = await prisma.userProfile.findUnique({
    where: { clerkUserId: userId },
    select: { id: true, status: true },
  });
  return profile?.status === "ACTIVE" ? profile.id : null;
}

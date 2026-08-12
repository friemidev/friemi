import type { Prisma } from "@prisma/client";

export type ProfilePresenceEvent = "offline" | "online";

export type ProfilePresenceIdentity =
  | { clerkUserId: string; profileId?: never }
  | { clerkUserId?: never; profileId: string };

export function buildProfilePresenceUpdate({
  event,
  identity,
  now = new Date(),
}: {
  event: ProfilePresenceEvent;
  identity: ProfilePresenceIdentity;
  now?: Date;
}): Prisma.UserProfileUpdateManyArgs {
  return {
    where: {
      status: "ACTIVE",
      ...(identity.clerkUserId
        ? { clerkUserId: identity.clerkUserId }
        : { id: identity.profileId }),
    },
    data: {
      lastActiveAt: event === "offline" ? null : now,
    },
  };
}

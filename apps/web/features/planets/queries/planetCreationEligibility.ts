import { prisma } from "@/lib/prisma";
import type { ParticipantStatus } from "@prisma/client";

const effectiveParticipantStatuses: ParticipantStatus[] = ["JOINED", "APPROVED"];
const minimumEffectiveParticipants = 15;

type PlanetCreationProfile = {
  id: string;
  isCoCreator: boolean;
};

/** Returns whether a user can create a planet under the platform's eligibility rules. */
export async function canCreatePlanet(profile: PlanetCreationProfile | null | undefined) {
  if (!profile) return false;
  if (profile.isCoCreator) return true;

  const [registeredParticipants, guestParticipants] = await Promise.all([
    prisma.activityParticipant.groupBy({
      by: ["activityId"],
      where: {
        status: { in: effectiveParticipantStatuses },
        activity: { organizerId: profile.id },
      },
      _count: { _all: true },
    }),
    prisma.guestActivityParticipant.groupBy({
      by: ["activityId"],
      where: {
        status: { in: effectiveParticipantStatuses },
        activity: { organizerId: profile.id },
      },
      _count: { _all: true },
    }),
  ]);

  const participantCounts = new Map<string, number>();
  for (const participantGroup of [...registeredParticipants, ...guestParticipants]) {
    participantCounts.set(
      participantGroup.activityId,
      (participantCounts.get(participantGroup.activityId) ?? 0) + participantGroup._count._all,
    );
  }

  return [...participantCounts.values()].some(
    (count) => count >= minimumEffectiveParticipants,
  );
}
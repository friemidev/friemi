"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { ensureCurrentUserProfile } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { withLocale } from "@/lib/routes";
import {
  AUTO_CREATED_TEAM_SOURCE,
  getAutoCreatedTeamMetadata,
  isAutoCreatedTeamClaimable,
} from "../utils/autoCreatedTeams";

const claimAutoCreatedActivitySchema = z.object({
  activityId: z.string().min(1),
  locale: z.string().min(1).default("zh-CN"),
  redirectPath: z.string().min(1),
});

export type ClaimAutoCreatedActivityState = {
  formError?: string;
  ok?: boolean;
};

function getString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function getClaimCopy(locale: string) {
  if (locale === "fr") {
    return {
      failed: "Impossible de reclamer cette equipe pour le moment.",
      forbidden: "Cette equipe ne peut plus etre reclamee.",
      self: "Vous etes deja l'organisateur de cette equipe.",
    };
  }

  if (locale === "en") {
    return {
      failed: "Unable to claim this team right now.",
      forbidden: "This team can no longer be claimed.",
      self: "You are already the organizer of this team.",
    };
  }

  return {
    failed: "认领组局失败，请稍后再试。",
    forbidden: "这个组局当前不能再认领了。",
    self: "你已经是这个组局的发起人了。",
  };
}

export async function claimAutoCreatedActivityAction(
  _previousState: ClaimAutoCreatedActivityState,
  formData: FormData,
): Promise<ClaimAutoCreatedActivityState> {
  const fallbackLocale = getString(formData, "locale") || "zh-CN";
  const copy = getClaimCopy(fallbackLocale);
  const result = claimAutoCreatedActivitySchema.safeParse({
    activityId: getString(formData, "activityId"),
    locale: fallbackLocale,
    redirectPath: getString(formData, "redirectPath"),
  });

  if (!result.success) {
    return {
      formError: copy.failed,
    };
  }

  const { activityId, locale, redirectPath } = result.data;
  const viewerProfile = await ensureCurrentUserProfile(locale, redirectPath);
  const t = getClaimCopy(locale);

  const activity = await prisma.activity.findUnique({
    where: {
      id: activityId,
    },
    select: {
      id: true,
      organizerId: true,
      source: true,
      sourcePayload: true,
      startAt: true,
      endAt: true,
      status: true,
    },
  });

  if (!activity) {
    return {
      formError: t.failed,
    };
  }

  if (activity.organizerId === viewerProfile.id) {
    return {
      formError: t.self,
    };
  }

  const metadata = getAutoCreatedTeamMetadata(activity.source, activity.sourcePayload);
  const isClosed =
    activity.status === "CANCELLED" ||
    activity.status === "ENDED" ||
    (activity.endAt ?? activity.startAt) <= new Date();

  if (
    activity.source !== AUTO_CREATED_TEAM_SOURCE ||
    !metadata ||
    !isAutoCreatedTeamClaimable(metadata) ||
    isClosed
  ) {
    return {
      formError: t.forbidden,
    };
  }

  await prisma.activity.update({
    where: {
      id: activity.id,
    },
    data: {
      organizerId: viewerProfile.id,
      sourcePayload: {
        ...metadata,
        claimedAt: new Date().toISOString(),
        claimedByUserProfileId: viewerProfile.id,
      },
    },
  });

  revalidatePath(withLocale(locale, redirectPath));
  revalidatePath(withLocale(locale, "/activities"));
  revalidatePath(withLocale(locale, "/lobby"));
  revalidatePath(withLocale(locale, "/profile"));

  return {
    ok: true,
  };
}

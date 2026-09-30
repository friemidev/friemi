"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { canLinkAllPlanets } from "@/features/activities/queries/getLinkablePlanets";
import { assertCanManageActivity } from "@/features/activities/utils/activityManagement";
import { getActivityDetailPath } from "@/features/activities/utils/activityRoutes";
import { ensureCurrentUserProfile } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { withLocale } from "@/lib/routes";

export type ActivityPlanetLinkState = {
  error?: string;
  ok?: boolean;
  version?: number;
};

const activityPlanetLinkSchema = z.object({
  activityId: z.string().trim().min(1).max(80),
  locale: z.string().trim().min(1).max(16).default("zh-CN"),
  planetIds: z.array(z.string().trim().min(1).max(80)),
});

export async function updateActivityPlanetLinksAction(
  previousState: ActivityPlanetLinkState,
  formData: FormData,
): Promise<ActivityPlanetLinkState> {
  const result = activityPlanetLinkSchema.safeParse({
    activityId: formData.get("activityId"),
    locale: formData.get("locale") || "zh-CN",
    planetIds: Array.from(
      new Set(
        formData
          .getAll("planetIds")
          .flatMap((value) =>
            typeof value === "string" && value.trim() ? [value.trim()] : [],
          ),
      ),
    ),
  });

  if (!result.success) {
    return {
      error: "关联信息无效，请重新选择。",
      version: (previousState.version ?? 0) + 1,
    };
  }

  const profile = await ensureCurrentUserProfile(
    result.data.locale,
    getActivityDetailPath(result.data.activityId),
  );
  const permission = await assertCanManageActivity(
    result.data.activityId,
    profile.id,
  );

  if (!permission.ok) {
    return {
      error: "你没有权限管理这个聚吧。",
      version: (previousState.version ?? 0) + 1,
    };
  }

  const canLink = await canLinkAllPlanets(profile.id, result.data.planetIds);

  if (!canLink) {
    return {
      error: "只能关联你担任主理人或管理员的公开星球。",
      version: (previousState.version ?? 0) + 1,
    };
  }

  try {
    await prisma.$transaction(async (tx) => {
      await tx.planetActivity.deleteMany({
        where: { activityId: result.data.activityId },
      });

      if (result.data.planetIds.length > 0) {
        await tx.planetActivity.createMany({
          data: result.data.planetIds.map((planetId) => ({
            activityId: result.data.activityId,
            planetId,
          })),
          skipDuplicates: true,
        });
      }

      await tx.activityManagementLog.create({
        data: {
          action: "PLANET_LINKS_UPDATED",
          activityId: result.data.activityId,
          actorId: profile.id,
          metadata: {
            planetIds: result.data.planetIds,
            role: permission.role,
          },
        },
      });
    });
  } catch (error) {
    console.error("Failed to update activity planet links", error);
    return {
      error: "保存关联失败，请稍后重试。",
      version: (previousState.version ?? 0) + 1,
    };
  }

  revalidatePath(
    withLocale(
      result.data.locale,
      getActivityDetailPath(result.data.activityId),
    ),
  );
  revalidatePath(
    withLocale(result.data.locale, `/activities/${result.data.activityId}`),
  );

  return {
    ok: true,
    version: (previousState.version ?? 0) + 1,
  };
}

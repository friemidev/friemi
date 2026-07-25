"use server";

import { revalidatePath } from "next/cache";
import type { Prisma } from "@prisma/client";
import { z } from "zod";
import {
  isAchievementKey,
  maxEquippedAchievementCount,
  type AchievementKey,
} from "@/features/achievements/achievementCatalog";
import { ensureCurrentUserProfile } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { withLocale } from "@/lib/routes";

const toggleEquippedAchievementSchema = z.object({
  achievementKey: z.string().min(1),
  intent: z.enum(["equip", "unequip"]),
  locale: z.string().min(1).default("zh-CN"),
});

export type ToggleEquippedAchievementState = {
  achievementKey?: string;
  formError?: string;
  ok?: boolean;
};

function getString(formData: FormData, key: string) {
  const value = formData.get(key);

  return typeof value === "string" ? value : "";
}

function getToggleEquippedAchievementCopy(locale: string) {
  if (locale === "fr") {
    return {
      invalid: "Action indisponible.",
      limit: "Trois badges maximum.",
      locked: "Badge non débloqué.",
    };
  }

  if (locale === "en") {
    return {
      invalid: "Action unavailable.",
      limit: "Up to 3 badges.",
      locked: "Unlock this badge first.",
    };
  }

  return {
    invalid: "操作暂不可用。",
    limit: "最多佩戴 3 个。",
    locked: "先解锁这个成就。",
  };
}

async function reindexEquippedAchievements(
  tx: Prisma.TransactionClient,
  profileId: string,
) {
  const equippedAchievements = await tx.userEquippedAchievement.findMany({
    where: {
      profileId,
    },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    select: {
      id: true,
      sortOrder: true,
    },
  });

  for (const [index, achievement] of equippedAchievements.entries()) {
    if (achievement.sortOrder === index) {
      continue;
    }

    await tx.userEquippedAchievement.update({
      where: {
        id: achievement.id,
      },
      data: {
        sortOrder: index,
      },
    });
  }
}

export async function toggleEquippedAchievementAction(
  _previousState: ToggleEquippedAchievementState,
  formData: FormData,
): Promise<ToggleEquippedAchievementState> {
  const fallbackLocale = getString(formData, "locale") || "zh-CN";
  const copy = getToggleEquippedAchievementCopy(fallbackLocale);
  const result = toggleEquippedAchievementSchema.safeParse({
    achievementKey: getString(formData, "achievementKey"),
    intent: getString(formData, "intent"),
    locale: fallbackLocale,
  });

  if (!result.success || !isAchievementKey(result.data.achievementKey)) {
    return {
      achievementKey: getString(formData, "achievementKey"),
      formError: copy.invalid,
    };
  }

  const { achievementKey, intent, locale } = result.data as {
    achievementKey: AchievementKey;
    intent: "equip" | "unequip";
    locale: string;
  };
  const profile = await ensureCurrentUserProfile(
    locale,
    "/profile/achievements",
  );

  const actionResult = await prisma.$transaction(async (tx) => {
    const unlockedAchievement = await tx.userAchievement.findUnique({
      where: {
        profileId_achievementKey: {
          achievementKey,
          profileId: profile.id,
        },
      },
      select: {
        id: true,
      },
    });

    if (!unlockedAchievement) {
      return {
        formError: copy.locked,
        ok: false,
      };
    }

    const equippedAchievements = await tx.userEquippedAchievement.findMany({
      where: {
        profileId: profile.id,
      },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      select: {
        achievementKey: true,
      },
      take: maxEquippedAchievementCount,
    });
    const alreadyEquipped = equippedAchievements.some(
      (achievement) => achievement.achievementKey === achievementKey,
    );

    if (intent === "unequip") {
      await tx.userEquippedAchievement.deleteMany({
        where: {
          achievementKey,
          profileId: profile.id,
        },
      });
      await reindexEquippedAchievements(tx, profile.id);

      return {
        ok: true,
      };
    }

    if (alreadyEquipped) {
      return {
        ok: true,
      };
    }

    if (equippedAchievements.length >= maxEquippedAchievementCount) {
      return {
        formError: copy.limit,
        ok: false,
      };
    }

    await tx.userEquippedAchievement.create({
      data: {
        achievementKey,
        profileId: profile.id,
        sortOrder: equippedAchievements.length,
      },
    });

    return {
      ok: true,
    };
  });

  if (!actionResult.ok) {
    return {
      achievementKey,
      formError: actionResult.formError,
    };
  }

  revalidatePath(withLocale(locale, "/profile"));
  revalidatePath(withLocale(locale, `/profile/${profile.id}`));
  revalidatePath(withLocale(locale, "/profile/achievements"));

  return {
    achievementKey,
    ok: true,
  };
}

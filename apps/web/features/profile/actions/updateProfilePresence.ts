"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getCurrentUserProfileForMutation } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { withLocale } from "@/lib/routes";
import {
  normalizeUserPresenceStatus,
  type UserPresenceStatusValue,
} from "../presence";

export type UpdateProfilePresenceState = {
  formError?: string;
  status?: UserPresenceStatusValue;
  success?: boolean;
};

const updateProfilePresenceSchema = z.object({
  locale: z.string().min(1).default("zh-CN"),
  status: z.enum(["ONLINE", "AWAY", "INVISIBLE"]),
});

function getString(formData: FormData, key: string) {
  const value = formData.get(key);

  return typeof value === "string" ? value : "";
}

export async function updateProfilePresenceAction(
  _previousState: UpdateProfilePresenceState,
  formData: FormData,
): Promise<UpdateProfilePresenceState> {
  const fallbackLocale = getString(formData, "locale") || "zh-CN";
  const result = updateProfilePresenceSchema.safeParse({
    locale: fallbackLocale,
    status: getString(formData, "status"),
  });

  if (!result.success) {
    return {
      formError:
        fallbackLocale === "fr"
          ? "Statut indisponible."
          : fallbackLocale === "en"
            ? "Status unavailable."
            : "状态不可用。",
    };
  }

  const { locale, status } = result.data;
  const profile = await getCurrentUserProfileForMutation(locale, "/profile");

  await prisma.userProfile.update({
    where: {
      id: profile.id,
    },
    data: {
      lastActiveAt: new Date(),
      presenceStatus: status,
    },
  });

  revalidatePath(withLocale(locale, "/profile"));
  revalidatePath(withLocale(locale, "/footprints"));
  revalidatePath(withLocale(locale, "/messages"));

  return {
    status: normalizeUserPresenceStatus(status),
    success: true,
  };
}

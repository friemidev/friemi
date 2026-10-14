"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUserProfileForMutation } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { withLocale } from "@/lib/routes";
import {
  getActivityRoomAssistantCopy,
  normalizeActivityRoomWelcomeTemplate,
} from "../assistant";
import { updateActivityRoomWelcomeTemplate } from "../services/activityRoomWelcome";

export type ActivityRoomWelcomeActionState = {
  ok?: boolean;
  formError?: string;
  template?: string;
};

export async function updateActivityRoomWelcomeAction(
  _previousState: ActivityRoomWelcomeActionState,
  formData: FormData,
): Promise<ActivityRoomWelcomeActionState> {
  const locale = String(formData.get("locale") ?? "zh-CN");
  const activityId = String(formData.get("activityId") ?? "").trim();
  const template = normalizeActivityRoomWelcomeTemplate(
    String(formData.get("template") ?? ""),
  );
  const copy = getActivityRoomAssistantCopy(locale);
  if (!activityId || activityId.length > 80 || !template) {
    return { formError: copy.invalid };
  }

  try {
    const profile = await getCurrentUserProfileForMutation(
      locale,
      `/lobby/${activityId}/room`,
    );
    const updated = await prisma.$transaction((db) =>
      updateActivityRoomWelcomeTemplate({
        db,
        activityId,
        actorId: profile.id,
        template,
      }),
    );
    if (!updated) return { formError: copy.forbidden };
    revalidatePath(withLocale(locale, `/lobby/${activityId}/room`));
    revalidatePath(withLocale(locale, `/lobby/${activityId}/room/manage`));
    return { ok: true, template };
  } catch (error) {
    console.error("Failed to update activity room welcome", error);
    return { formError: copy.failed };
  }
}

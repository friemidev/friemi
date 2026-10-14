"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import {
  getActivityRoomAssistantCopy,
  normalizeActivityRoomWelcomeTemplate,
} from "@/features/activity-room-chat/assistant";
import { updateActivityRoomWelcomeTemplate } from "@/features/activity-room-chat/services/activityRoomWelcome";
import type { ActivityRoomWelcomeActionState } from "@/features/activity-room-chat/actions/updateRoomWelcome";
import { canUseLocalGroupAssistantPreview } from "./guard";

export async function savePreviewWelcome(
  actorId: string,
  _previous: ActivityRoomWelcomeActionState,
  data: FormData,
): Promise<ActivityRoomWelcomeActionState> {
  const locale = String(data.get("locale") ?? "zh-CN");
  const copy = getActivityRoomAssistantCopy(locale);
  const template = normalizeActivityRoomWelcomeTemplate(
    String(data.get("template") ?? ""),
  );
  if (
    !canUseLocalGroupAssistantPreview() ||
    data.get("activityId") !== "welcome-preview-group"
  )
    return { formError: copy.forbidden };
  if (!template) return { formError: copy.invalid };
  const ok = await prisma.$transaction((db) =>
    updateActivityRoomWelcomeTemplate({
      db,
      activityId: "welcome-preview-group",
      actorId,
      template,
    }),
  );
  if (!ok) return { formError: copy.forbidden };
  revalidatePath(`/${locale}/preview-group-assistant`);
  return { ok: true, template };
}

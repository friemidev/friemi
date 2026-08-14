"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createOfficialMessage } from "@/features/official-messages/services/officialMessages";
import { isCurrentUserAdmin } from "@/lib/admin-auth";
import { ensureCurrentUserProfile } from "@/lib/auth";
import { withLocale } from "@/lib/routes";

const officialMessageSchema = z.object({
  locale: z.string().min(1).default("zh-CN"),
  title: z.string().trim().min(1).max(120),
  content: z.string().trim().min(1).max(4000),
});

export type PublishOfficialMessageState = {
  formError?: string;
  ok?: boolean;
};

export async function publishOfficialMessageAction(
  _previousState: PublishOfficialMessageState,
  formData: FormData,
): Promise<PublishOfficialMessageState> {
  const locale = String(formData.get("locale") ?? "zh-CN");
  const result = officialMessageSchema.safeParse({
    locale,
    title: formData.get("title"),
    content: formData.get("content"),
  });

  if (!result.success) {
    return {
      formError:
        locale === "fr"
          ? "Renseignez le titre et le contenu."
          : locale === "en"
            ? "Enter a title and message."
            : "请填写标题和公告内容。",
    };
  }

  if (!(await isCurrentUserAdmin())) {
    return {
      formError:
        locale === "fr"
          ? "Acces administrateur requis."
          : locale === "en"
            ? "Administrator access is required."
            : "需要网站管理员权限。",
    };
  }

  const profile = await ensureCurrentUserProfile(
    locale,
    "/admin/official-messages",
  );

  await createOfficialMessage({
    authorProfileId: profile.id,
    content: result.data.content,
    title: result.data.title,
  });

  revalidatePath(withLocale(locale, "/admin/official-messages"));
  revalidatePath(withLocale(locale, "/official-messages"));
  revalidatePath(withLocale(locale, "/footprints"));

  return { ok: true };
}

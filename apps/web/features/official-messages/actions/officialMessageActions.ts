"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  createOfficialFeedback,
  createOfficialMessage,
} from "@/features/official-messages/services/officialMessages";
import { scheduleChatInboxRealtimeChange } from "@/features/chat/chatRealtimeServer";
import { isCurrentUserAdmin } from "@/lib/admin-auth";
import { ensureCurrentUserProfile } from "@/lib/auth";
import { withLocale } from "@/lib/routes";
import {
  formatOfficialFeedback,
  officialFeedbackSchema,
} from "../officialFeedbackInput";

const officialMessageSchema = z.object({
  locale: z.string().min(1).default("zh-CN"),
  title: z.string().trim().min(1).max(120),
  content: z.string().trim().min(1).max(4000),
});

export type PublishOfficialMessageState = {
  formError?: string;
  ok?: boolean;
};

export type SubmitOfficialFeedbackState = {
  formError?: string;
  ok?: boolean;
};

export async function submitOfficialFeedbackAction(
  _previousState: SubmitOfficialFeedbackState,
  formData: FormData,
): Promise<SubmitOfficialFeedbackState> {
  const locale = String(formData.get("locale") ?? "zh-CN");
  const result = officialFeedbackSchema.safeParse({
    content: formData.get("content"),
    locale,
    topic: formData.get("topic") ?? "GENERAL",
  });

  if (!result.success) {
    return {
      formError:
        locale === "fr"
          ? "Decrivez le probleme en quelques mots."
          : locale === "en"
            ? "Describe the issue in a few words."
            : "请简单描述你遇到的问题。",
    };
  }

  const profile = await ensureCurrentUserProfile(locale, "/official-messages");
  let feedback;
  try {
    feedback = await createOfficialFeedback({
      content: formatOfficialFeedback(result.data),
      senderProfileId: profile.id,
    });
  } catch {
    return {
      formError:
        locale === "fr"
          ? "Échec de l'envoi. Votre texte est conservé ; veuillez réessayer."
          : locale === "en"
            ? "Could not send. Your text is saved here; please try again."
            : "发送失败，内容已保留，请重试。",
    };
  }
  scheduleChatInboxRealtimeChange({
    profileIds: feedback.recipientProfileIds,
    scope: "official",
    subjectKey: `feedback:${feedback.id}`,
  });

  revalidatePath(withLocale(locale, "/official-feedback"));
  revalidatePath(withLocale(locale, "/footprints"));

  return { ok: true };
}

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

  const message = await createOfficialMessage({
    authorProfileId: profile.id,
    content: result.data.content,
    title: result.data.title,
  });
  scheduleChatInboxRealtimeChange({
    profileIds: message.recipientProfileIds,
    scope: "official",
    subjectKey: `message:${message.id}`,
  });

  revalidatePath(withLocale(locale, "/admin/official-messages"));
  revalidatePath(withLocale(locale, "/official-messages"));
  revalidatePath(withLocale(locale, "/footprints"));

  return { ok: true };
}

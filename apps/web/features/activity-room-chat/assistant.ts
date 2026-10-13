export const activityRoomAssistantId = "friemi-group-assistant";
export const activityRoomAssistantAvatar =
  "/chat/friemi-group-assistant-avatar.png";
export const defaultActivityRoomWelcomeTemplate =
  "欢迎 {nickname} 进入 {activityName} Friemi群！";
export const activityRoomWelcomeTemplateMaxLength = 300;

export function getActivityRoomMessageSenderName(
  message: { senderId: string; senderName: string },
  locale: string,
) {
  return message.senderId === activityRoomAssistantId
    ? getActivityRoomAssistantCopy(locale).name
    : message.senderName;
}

export function getActivityRoomAssistantCopy(locale: string) {
  if (locale === "fr") {
    return {
      name: "Assistant Friemi",
      settings: "Assistant du groupe",
      edit: "Modifier l'accueil",
      title: "Message de bienvenue",
      nickname: "Pseudo",
      activityName: "Nom du groupe",
      preview: "Aperçu",
      save: "Enregistrer",
      saving: "Enregistrement…",
      saved: "Message de bienvenue enregistré.",
      reset: "Rétablir le texte par défaut",
      close: "Fermer",
      failed: "Impossible d'enregistrer. Réessayez.",
      forbidden:
        "Seuls l'organisateur et les administrateurs peuvent modifier ce message.",
      invalid:
        "Saisissez un message de 1 à 300 caractères avec des variables valides.",
      sampleName: "Camille",
    };
  }
  if (locale === "en") {
    return {
      name: "Friemi Assistant",
      settings: "Group assistant",
      edit: "Edit welcome",
      title: "Welcome message",
      nickname: "Nickname",
      activityName: "Group name",
      preview: "Preview",
      save: "Save",
      saving: "Saving…",
      saved: "Welcome message saved.",
      reset: "Restore default",
      close: "Close",
      failed: "Could not save. Try again.",
      forbidden: "Only the organizer and admins can edit this message.",
      invalid: "Enter 1–300 characters using valid variables.",
      sampleName: "Alex",
    };
  }
  return {
    name: "Friemi 群助手",
    settings: "群助手",
    edit: "编辑欢迎词",
    title: "欢迎词",
    nickname: "昵称",
    activityName: "活动名",
    preview: "预览",
    save: "保存",
    saving: "保存中…",
    saved: "欢迎词已保存",
    reset: "恢复默认",
    close: "关闭",
    failed: "暂时无法保存，请重试。",
    forbidden: "只有群主和管理员可以编辑欢迎词。",
    invalid: "请输入 1–300 字的欢迎词，并使用有效变量。",
    sampleName: "小明",
  };
}

export function normalizeActivityRoomWelcomeTemplate(value: string) {
  const template = value.trim();
  const unresolved = template.replace(/\{(?:nickname|activityName)\}/g, "");
  if (
    !template ||
    template.length > activityRoomWelcomeTemplateMaxLength ||
    /[{}]/.test(unresolved)
  ) {
    return null;
  }
  return template;
}

export function renderActivityRoomWelcome(
  template: string | null | undefined,
  nickname: string,
  activityName: string,
) {
  // A single pass keeps braces in user names from becoming template variables.
  return (template ?? defaultActivityRoomWelcomeTemplate).replace(
    /\{(nickname|activityName)\}/g,
    (_, key: string) => (key === "nickname" ? nickname : activityName),
  );
}

export function shouldWelcomeActivityRoomParticipant(
  previousStatus: string | null | undefined,
  nextStatus: string,
) {
  const isActive = (status: string | null | undefined) =>
    status === "JOINED" || status === "APPROVED";
  return !isActive(previousStatus) && isActive(nextStatus);
}

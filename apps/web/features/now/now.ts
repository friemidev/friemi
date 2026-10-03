export const nowKinds = [
  "COFFEE",
  "FOOD",
  "DRINK",
  "TEA",
  "PARK",
  "WALK",
  "SHOP",
  "EXHIBITION",
  "MOVIE",
  "SHOW",
  "GAME",
  "SPORT",
  "CHAT",
  "ADVENTURE",
  "SOCIAL",
  "OTHER",
] as const;

// The current city selector only opens Paris. Keep invite discovery aligned
// until that selector and its profile preference support another city.
export const nowOpenCity = "Paris";

export type NowKind = (typeof nowKinds)[number];
export type NowConversationContext = {
  id: string;
  category: string;
  title: string;
  area: string;
  intentWindow: string;
};

const kindDetails: Record<
  NowKind,
  { emoji: string; zh: string; en: string; fr: string; tone: string }
> = {
  COFFEE: {
    emoji: "☕",
    zh: "喝咖啡",
    en: "Coffee",
    fr: "Café",
    tone: "amber",
  },
  FOOD: { emoji: "🍜", zh: "吃饭", en: "Eat out", fr: "Repas", tone: "coral" },
  DRINK: {
    emoji: "🍷",
    zh: "喝酒",
    en: "A drink",
    fr: "Un verre",
    tone: "rose",
  },
  TEA: { emoji: "🫖", zh: "下午茶", en: "Tea", fr: "Thé", tone: "amber" },
  PARK: { emoji: "🌳", zh: "逛公园", en: "Park", fr: "Parc", tone: "green" },
  WALK: {
    emoji: "🚶",
    zh: "City walk",
    en: "City walk",
    fr: "Balade",
    tone: "green",
  },
  SHOP: {
    emoji: "🛍️",
    zh: "逛街",
    en: "Shopping",
    fr: "Shopping",
    tone: "coral",
  },
  EXHIBITION: {
    emoji: "🖼️",
    zh: "看展",
    en: "Exhibition",
    fr: "Expo",
    tone: "blue",
  },
  MOVIE: { emoji: "🎬", zh: "看电影", en: "Movie", fr: "Cinéma", tone: "blue" },
  SHOW: {
    emoji: "🎵",
    zh: "看演出",
    en: "Show",
    fr: "Spectacle",
    tone: "rose",
  },
  GAME: {
    emoji: "🎲",
    zh: "玩桌游",
    en: "Board games",
    fr: "Jeux",
    tone: "blue",
  },
  SPORT: { emoji: "🏃", zh: "运动", en: "Sport", fr: "Sport", tone: "green" },
  CHAT: {
    emoji: "💬",
    zh: "想聊天",
    en: "Chat",
    fr: "Discuter",
    tone: "coral",
  },
  ADVENTURE: {
    emoji: "✨",
    zh: "想出去走走",
    en: "Explore",
    fr: "Explorer",
    tone: "amber",
  },
  SOCIAL: {
    emoji: "🎉",
    zh: "想热闹一下",
    en: "Something social",
    fr: "Voir du monde",
    tone: "coral",
  },
  OTHER: {
    emoji: "🎈",
    zh: "随便说说",
    en: "Say anything",
    fr: "Dire quelque chose",
    tone: "rose",
  },
};

export function getNowKind(kind: string) {
  return kindDetails[kind as NowKind] ?? kindDetails.OTHER;
}

export function getNowKindLabel(kind: string, locale: string) {
  const detail = getNowKind(kind);
  return locale === "en" ? detail.en : locale === "fr" ? detail.fr : detail.zh;
}

export function isNowKind(value: string): value is NowKind {
  return nowKinds.includes(value as NowKind);
}

export const nowVisibilityHours = [3, 6, 12, 24] as const;

export const nowIntentWindows = ["NOW", "LATER", "TODAY", "TONIGHT"] as const;
export type NowIntentWindow = (typeof nowIntentWindows)[number];

export function isNowIntentWindow(value: string): value is NowIntentWindow {
  return nowIntentWindows.includes(value as NowIntentWindow);
}

export function getNowIntentWindowLabel(value: string, locale: string) {
  const labels: Record<
    NowIntentWindow,
    { zh: string; en: string; fr: string }
  > = {
    NOW: { zh: "现在", en: "Now", fr: "Maintenant" },
    LATER: { zh: "稍后", en: "Soon", fr: "Bientôt" },
    TODAY: { zh: "今天", en: "Today", fr: "Aujourd'hui" },
    TONIGHT: { zh: "今晚", en: "Tonight", fr: "Ce soir" },
  };
  const label = labels[isNowIntentWindow(value) ? value : "NOW"];
  return locale === "en" ? label.en : locale === "fr" ? label.fr : label.zh;
}

export function getNowActivityCategory(kind: string) {
  if (["COFFEE", "FOOD", "DRINK", "TEA"].includes(kind)) return "FOOD";
  if (["PARK", "WALK", "SHOP", "ADVENTURE"].includes(kind)) return "WANDER";
  if (["MOVIE", "SHOW"].includes(kind)) return "AUDIO_VISUAL";
  if (kind === "GAME") return "BOARD_GAME";
  if (kind === "SPORT") return "SPORTS";
  return "OTHER";
}

export function getNowActivityDraftFields({
  area,
  category,
  city,
  inviteId,
  locale,
  note,
  title,
}: {
  area: string;
  category: string;
  city: string;
  inviteId: string;
  locale: string;
  note: string | null;
  title: string;
}) {
  const activityCategory = getNowActivityCategory(category);
  return {
    locale,
    nowInviteId: inviteId,
    title,
    description: note || title,
    itinerary: "",
    coverImageUrl: "",
    type: "LOCAL",
    category: activityCategory,
    visibility: "PUBLIC",
    otherCategoryText:
      activityCategory === "OTHER" ? getNowKindLabel(category, locale) : "",
    city,
    destination: area,
    latitude: "",
    longitude: "",
    endAt: "",
    capacity: "0",
    minParticipants: "",
    priceType: "FREE",
    priceText: "",
    ticketUrl: "",
    ticketLabel: "",
  };
}

export function getNowSuggestedStartAt(intentWindow: string, now = new Date()) {
  const paris = (date: Date) => {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Europe/Paris",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    }).formatToParts(date);
    const part = (type: string) =>
      parts.find((item) => item.type === type)?.value ?? "";
    return `${part("year")}-${part("month")}-${part("day")}T${part("hour")}:${part("minute")}`;
  };
  const rounded = (delayMinutes: number) =>
    paris(
      new Date(
        Math.ceil((now.getTime() + delayMinutes * 60_000) / 900_000) * 900_000,
      ),
    );
  if (intentWindow === "NOW") return rounded(30);
  if (intentWindow === "LATER") return rounded(120);
  const currentLocal = paris(now);
  const targetHour = intentWindow === "TONIGHT" ? 20 : 18;
  const target = `${currentLocal.slice(0, 10)}T${targetHour}:00`;
  return currentLocal < target ? target : rounded(60);
}

export function isNowVisibilityHours(
  value: number,
): value is (typeof nowVisibilityHours)[number] {
  return nowVisibilityHours.includes(
    value as (typeof nowVisibilityHours)[number],
  );
}

export function isNowVisible(expiresAt: Date, now = new Date()) {
  return expiresAt.getTime() > now.getTime();
}

export function getNowStage(
  expiresAt: Date,
  interestCount: number,
  now = new Date(),
) {
  if (!isNowVisible(expiresAt, now)) return "EXPIRED" as const;
  return interestCount > 0 ? ("ALMOST_THERE" as const) : ("ACTIVE" as const);
}

export function getNowStageLabel(
  stage: ReturnType<typeof getNowStage>,
  locale: string,
) {
  if (locale === "fr")
    return stage === "EXPIRED"
      ? "Terminé"
      : stage === "ALMOST_THERE"
        ? "Ça se prépare"
        : "En cours";
  if (locale === "en")
    return stage === "EXPIRED"
      ? "Ended"
      : stage === "ALMOST_THERE"
        ? "People are interested"
        : "Looking for company";
  return stage === "EXPIRED"
    ? "已结束"
    : stage === "ALMOST_THERE"
      ? "有人同频"
      : "寻找同频";
}

export function getNowExpiry(publishedAt: Date, visibilityHours: number) {
  if (!isNowVisibilityHours(visibilityHours))
    throw new Error("INVALID_NOW_VISIBILITY_HOURS");
  return new Date(publishedAt.getTime() + visibilityHours * 3_600_000);
}

// This is an initial, transparent mix of participation, recency and a small
// time-bucketed shuffle. A future recommender can replace only this function.
function hash(value: string) {
  let result = 2166136261;
  for (const char of value)
    result = Math.imul(result ^ char.charCodeAt(0), 16777619);
  return result >>> 0;
}

export function getNowVisitJitter(id: string, visitSeed: string) {
  return (hash(`${id}:${visitSeed}`) % 80) / 10;
}

export function getNowPriority({
  id,
  interestCount,
  createdAt,
  now = new Date(),
}: {
  id: string;
  interestCount: number;
  createdAt: Date;
  now?: Date;
}) {
  const ageHours = Math.max(
    0,
    (now.getTime() - createdAt.getTime()) / 3_600_000,
  );
  const freshness = Math.max(0, 12 - ageHours);
  const hourBucket = Math.floor(now.getTime() / 3_600_000);
  const variety = (hash(`${id}:${hourBucket}`) % 7) / 2;
  const score = interestCount * 7 + freshness + variety;
  const size = score >= 27 ? "large" : score >= 14 ? "medium" : "small";
  return { score, size } as const;
}

export function getNowPreviewLabel(locale: string) {
  return locale === "zh-CN"
    ? "开发预览 · 示例内容"
    : locale === "fr"
      ? "Aperçu · contenu d'exemple"
      : "Preview · sample content";
}

export function getNowPreviewDisabledLabel(locale: string) {
  return locale === "zh-CN"
    ? "开发预览 · 不会发布"
    : locale === "fr"
      ? "Aperçu · aucune publication"
      : "Preview · no publishing";
}

export function getNowCopy(locale: string) {
  if (locale === "fr")
    return {
      heading: "Sur le moment",
      subtitle: "Des envies près de vous",
      seeAll: "Voir tout",
      create: "Lancer une envie",
      mine: "Mes envies",
      empty: "La première envie peut être la vôtre.",
      interested: "Ça me tente",
      withdrawn: "Retirer mon intérêt",
      interestedAlready: "Vous êtes intéressé·e",
      people: "personnes intéressées",
      remaining: "restant",
      expired: "N'apparaît plus à l'accueil",
      publish: "Publier",
      createTitle: "Qu'avez-vous envie de faire ?",
      area: "Quartier ou zone",
      note: "Une phrase pour inviter les autres (facultatif)",
      duration: "Visible à l'accueil pendant",
      title: "Votre invitation",
      discussion: "Messages de groupe",
      message: "Écrire un message",
      send: "Envoyer",
      myCreated: "Mes invitations",
      myInterested: "Mes envies suivies",
      noCreated: "Aucune invitation pour le moment.",
      noInterested: "Vous n'avez encore suivi aucune envie.",
      organize: "Créer une sortie",
      city: "Paris",
      formError: "Vérifiez les champs et réessayez.",
      closed: "Cette invitation n'accepte plus d'intérêt.",
    };
  if (locale === "en")
    return {
      heading: "Right now",
      subtitle: "Ideas happening nearby",
      seeAll: "See all",
      create: "Start an invite",
      mine: "My invites",
      empty: "Your idea could be the first one here.",
      interested: "Me too",
      withdrawn: "Withdraw interest",
      interestedAlready: "You're interested",
      people: "interested",
      remaining: "left",
      expired: "No longer on the home feed",
      publish: "Post invite",
      createTitle: "What do you feel like doing?",
      area: "Neighborhood or area",
      note: "Add a little context (optional)",
      duration: "Show on home for",
      title: "Your invitation",
      discussion: "Group notes",
      message: "Write a message",
      send: "Send",
      myCreated: "Invites I started",
      myInterested: "Invites I liked",
      noCreated: "You have no invites yet.",
      noInterested: "You haven't raised your hand yet.",
      organize: "Create a hangout",
      city: "Paris",
      formError: "Check the fields and try again.",
      closed: "This invite is no longer accepting interest.",
    };
  return {
    heading: "此刻",
    subtitle: "附近的人正在想这些",
    seeAll: "查看全部",
    create: "发起此刻邀约",
    mine: "我的此刻",
    empty: "还没有此刻邀约，先发起一个吧。",
    interested: "我也想",
    withdrawn: "取消举手",
    interestedAlready: "已举手",
    people: "人想一起",
    remaining: "剩余",
    expired: "已退出首页展示",
    publish: "发布此刻",
    createTitle: "现在想做什么？",
    area: "附近街区或区域",
    note: "想说点什么？（选填）",
    duration: "首页展示时间",
    title: "邀约内容",
    discussion: "同频留言",
    message: "说一句话",
    send: "发送",
    myCreated: "我发起的",
    myInterested: "我感兴趣的",
    noCreated: "你还没有发起邀约。",
    noInterested: "你还没有举手表达兴趣。",
    organize: "创建聚吧",
    city: "巴黎",
    formError: "请检查填写内容后重试。",
    closed: "这条邀约已停止接受举手。",
  };
}

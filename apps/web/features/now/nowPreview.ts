import type { NowBubbleItem } from "./NowBubbleField";

const samples: Pick<
  NowBubbleItem,
  | "id"
  | "category"
  | "intentWindow"
  | "title"
  | "area"
  | "interestCount"
  | "size"
>[] = [
  {
    id: "preview-coffee",
    category: "COFFEE",
    intentWindow: "NOW",
    title: "喝杯咖啡",
    area: "Bastille",
    interestCount: 2,
    size: "medium",
  },
  {
    id: "preview-movie",
    category: "MOVIE",
    intentWindow: "TONIGHT",
    title: "看电影",
    area: "Opéra",
    interestCount: 1,
    size: "small",
  },
  {
    id: "preview-tea",
    category: "TEA",
    intentWindow: "LATER",
    title: "下午茶",
    area: "Canal",
    interestCount: 1,
    size: "small",
  },
  {
    id: "preview-drink",
    category: "DRINK",
    intentWindow: "TONIGHT",
    title: "喝一杯",
    area: "Le Marais",
    interestCount: 3,
    size: "large",
  },
  {
    id: "preview-game",
    category: "GAME",
    intentWindow: "TODAY",
    title: "来局桌游",
    area: "République",
    interestCount: 5,
    size: "large",
  },
  {
    id: "preview-park",
    category: "PARK",
    intentWindow: "LATER",
    title: "逛公园",
    area: "Luxembourg",
    interestCount: 2,
    size: "medium",
  },
  {
    id: "preview-walk",
    category: "WALK",
    intentWindow: "NOW",
    title: "City walk",
    area: "Saint-Michel",
    interestCount: 0,
    size: "medium",
  },
];

export function getNowPreviewInvites(now: number): NowBubbleItem[] {
  return samples.map((sample, index) => ({
    ...sample,
    avatars: [
      { name: "Camille", url: null },
      ...[
        { name: "Alex", url: null },
        { name: "Léa", url: null },
        { name: "Mika", url: null },
      ].slice(0, sample.interestCount),
    ],
    createdAt: new Date(now - 2 * 3_600_000).toISOString(),
    expiresAt: new Date(now + (index + 1) * 38 * 60_000).toISOString(),
  }));
}

export function getNowPreviewRows(now: number) {
  return getNowPreviewInvites(now).map((invite) => ({
    id: invite.id,
    organizerId: "preview-organizer",
    category: invite.category,
    intentWindow: invite.intentWindow,
    title: invite.title,
    area: invite.area,
    createdAt: new Date(invite.createdAt),
    expiresAt: new Date(invite.expiresAt),
    _count: { interests: invite.interestCount },
    interests: invite.avatars.slice(1, 4).map((avatar) => ({
      profile: { nickname: avatar.name, avatarUrl: avatar.url },
    })),
    viewerInterested: false,
  }));
}

export function getNowPreviewDetail(
  inviteId: string,
  now: number,
  as: "viewer" | "interested" | "host" = "viewer",
) {
  const sample = getNowPreviewInvites(now).find(
    (invite) => invite.id === inviteId,
  );
  if (!sample) return null;
  const organizer = {
    id: "preview-organizer",
    nickname: "Camille",
    avatarUrl: null,
  };
  const interested = [
    {
      id: "preview-viewer",
      nickname: "Alex",
      avatarUrl: null,
      note: "我也想！刚好在这边。",
    },
    { id: "preview-lea", nickname: "Léa", avatarUrl: null, note: "下班一起！" },
    {
      id: "preview-mika",
      nickname: "Mika",
      avatarUrl: null,
      note: "晚一点到也可以吗？",
    },
    {
      id: "preview-jules",
      nickname: "Jules",
      avatarUrl: null,
      note: "我也在附近。",
    },
    {
      id: "preview-nina",
      nickname: "Nina",
      avatarUrl: null,
      note: "算我一个！",
    },
  ];
  return {
    id: sample.id,
    organizerId: organizer.id,
    organizer,
    category: sample.category,
    intentWindow: sample.intentWindow,
    title: sample.title,
    city: "Paris",
    area: sample.area,
    note: "下班后想找个人一起出门，有人想来吗？",
    createdAt: new Date(sample.createdAt),
    expiresAt: new Date(sample.expiresAt),
    linkedActivity: null,
    isOrganizer: as === "host",
    isInterested: as === "interested",
    interests: interested
      .slice(0, sample.interestCount)
      .map((person, index) => ({
        profileId: person.id,
        profile: {
          id: person.id,
          nickname: person.nickname,
          avatarUrl: person.avatarUrl,
        },
        note: as === "viewer" ? null : person.note,
        selectedAt:
          as !== "viewer" && index === 0 ? new Date(now - 60_000) : null,
        createdAt: new Date(now - (index + 1) * 5 * 60_000),
      })),
    messages:
      as === "viewer"
        ? []
        : [
            {
              id: "preview-message-1",
              author: interested[0],
              body: "我也想！附近下班就能过去。",
            },
            {
              id: "preview-message-2",
              author: organizer,
              body: "太好啦，时间和地点我们一起定。",
            },
          ],
  };
}

type LocalizedTopNewsTitle = {
  en: string;
  fr: string;
  "zh-CN": string;
};

export type MobileHomeTopNewsItem = {
  href: string;
  id: string;
  image: string;
  title: string;
};

type MobileHomeTopNewsConfigItem = {
  active: boolean;
  href: string;
  id: string;
  image: string;
  order: number;
  title: LocalizedTopNewsTitle;
};

const mobileHomeTopNewsConfig: MobileHomeTopNewsConfigItem[] = [
  {
    active: true,
    href: "/updates/v2_4",
    id: "v2-4-release",
    image: "/readme/v2_4/game-tools.png",
    order: 10,
    title: {
      en: "Friemi v2.4 updates",
      fr: "Nouveautes Friemi v2.4",
      "zh-CN": "Friemi v2.4 更新",
    },
  },
  {
    active: true,
    href: "/game-tools/werewolf",
    id: "werewolf-tool",
    image: "/game-tools/werewolf/werewolf.jpeg",
    order: 20,
    title: {
      en: "Werewolf room tool",
      fr: "Outil loup-garou",
      "zh-CN": "狼人杀房间工具",
    },
  },
];

export function getFallbackTopNewsConfigItems() {
  return mobileHomeTopNewsConfig.map((item) => ({
    active: item.active,
    href: item.href,
    id: item.id,
    image: item.image,
    order: item.order,
    title: { ...item.title },
  }));
}

function getLocalizedTopNewsTitle(
  title: LocalizedTopNewsTitle,
  locale: string,
) {
  if (locale === "fr") {
    return title.fr;
  }

  if (locale === "en") {
    return title.en;
  }

  return title["zh-CN"];
}

export function getFallbackMobileHomeTopNewsItems(locale: string) {
  return mobileHomeTopNewsConfig
    .filter((item) => item.active)
    .sort((left, right) => left.order - right.order)
    .map<MobileHomeTopNewsItem>((item) => ({
      href: item.href,
      id: item.id,
      image: item.image,
      title: getLocalizedTopNewsTitle(item.title, locale),
    }));
}

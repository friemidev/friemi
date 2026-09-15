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
  href: string;
  id: string;
  image: string;
  title: LocalizedTopNewsTitle;
};

const mobileHomeTopNewsConfig: MobileHomeTopNewsConfigItem[] = [
  {
    href: "/top-news/werewolf",
    id: "werewolf-guide",
    image: "/game-tools/werewolf/recto/werewolf-promo-landscape.png",
    title: {
      en: "Werewolf game setup guide",
      fr: "Guide de lancement Loups-garous",
      "zh-CN": "狼人杀线下开局指南",
    },
  },
  {
    href: "/top-news/friemi",
    id: "friemi-intro",
    image: "/home/friemi_intro.png",
    title: {
      en: "Discover Friemi",
      fr: "Découvrez Friemi",
      "zh-CN": "发现活动，约朋友，一起出发",
    },
  },
];

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

export function getMobileHomeTopNewsConfigItems(locale: string) {
  return mobileHomeTopNewsConfig.map<MobileHomeTopNewsItem>((item) => ({
    href: item.href,
    id: item.id,
    image: item.image,
    title: getLocalizedTopNewsTitle(item.title, locale),
  }));
}

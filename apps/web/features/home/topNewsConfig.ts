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
    image:
      "https://xyavgkupjnoumlzwkzoq.supabase.co/storage/v1/object/public/activity-covers/top-news/user_3FXtMqINQEiVVZMBm7Ypi2rgx7Q/09464e14-8214-45d0-ad9b-916cfacaf64d.png",
    title: {
      en: "Werewolf game setup guide",
      fr: "Guide de lancement Loups-garous",
      "zh-CN": "狼人杀线下开局指南",
    },
  },
  {
    href: "/top-news/host-recruitment",
    id: "founding-host-recruitment",
    image: "/top_news/founding-host-recruitment-cover.png",
    title: {
      en: "Become a Friemi Founding Host",
      fr: "Devenez hôte fondateur Friemi",
      "zh-CN": "Friemi 共创主理人招募",
    },
  },
  {
    href: "/top-news/friemi",
    id: "friemi-intro",
    image: "/top_news/friemi-intro-cover.png",
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

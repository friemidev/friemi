export function getProfileFollowCopy(locale: string) {
  if (locale === "fr") {
    return {
      friendCount: "Mutuels",
      friendsTitle: "Mutuels",
      friendsDescription: "Les abonnements réciproques apparaissent ici.",
      friendsEmptyTitle: "Aucun mutuel",
      friendsEmptyDescription:
        "Quand vous vous suivrez mutuellement, les profils apparaîtront ici.",
      followersCount: "Me suivent",
      followingCount: "Suivis",
      followingTitle: "Abonnements",
      followingDescription: "Les personnes que vous suivez apparaissent ici.",
      followingEmptyTitle: "Aucun abonnement",
      followingEmptyDescription:
        "Quand vous suivrez des organisateurs ou d'autres utilisateurs, ils apparaîtront ici.",
      followersTitle: "Me suivent",
      followersDescription: "Les personnes qui vous suivent apparaissent ici.",
      followersEmptyTitle: "Aucun abonné",
      followersEmptyDescription:
        "Quand quelqu'un vous suivra, son profil apparaîtra ici.",
      noBio: "Cette personne n'a pas encore ajouté de bio.",
      closePanel: "Fermer",
      searchLabel: "Rechercher",
      searchPlaceholder: "Rechercher un pseudo",
      searchEmptyTitle: "Aucun résultat",
      searchEmptyDescription: (query: string) =>
        `Aucun profil ne correspond à « ${query} ».`,
      clearSearch: "Effacer",
      showMoreUsers: (count: number) =>
        `+ ${count} autre${count > 1 ? "s" : ""}`,
    };
  }

  if (locale === "en") {
    return {
      friendCount: "Mutual",
      friendsTitle: "Mutual",
      friendsDescription: "People who follow you back will appear here.",
      friendsEmptyTitle: "No mutual follows",
      friendsEmptyDescription:
        "When you follow each other, their profiles will show up here.",
      followersCount: "Followers",
      followingCount: "Following",
      followingTitle: "Following",
      followingDescription: "People you follow will appear here.",
      followingEmptyTitle: "No following yet",
      followingEmptyDescription:
        "Once you follow organizers or other users, they will show up here.",
      followersTitle: "Followers",
      followersDescription: "People who follow you will appear here.",
      followersEmptyTitle: "No followers yet",
      followersEmptyDescription:
        "Once someone follows you, their profile will appear here.",
      noBio: "This user has not added a bio yet.",
      closePanel: "Close",
      searchLabel: "Search",
      searchPlaceholder: "Search by nickname",
      searchEmptyTitle: "No matching profile",
      searchEmptyDescription: (query: string) =>
        `No profile matches "${query}".`,
      clearSearch: "Clear search",
      showMoreUsers: (count: number) => `+ ${count} more`,
    };
  }

  return {
    friendCount: "互关",
    friendsTitle: "互相关注",
    friendsDescription: "互相关注的人会显示在这里。",
    friendsEmptyTitle: "还没有互关",
    friendsEmptyDescription: "双方互相关注后，会显示在这里。",
    followersCount: "关注我的",
    followingCount: "我关注的",
    followingTitle: "我关注的",
    followingDescription: "你关注的人会显示在这里。",
    followingEmptyTitle: "还没有关注任何人",
    followingEmptyDescription:
      "当你关注活动发起人或其他用户后，他们会显示在这里。",
    followersTitle: "关注我的",
    followersDescription: "关注你的人会显示在这里。",
    followersEmptyTitle: "还没有人关注你",
    followersEmptyDescription: "当有人关注你后，他们的资料会显示在这里。",
    noBio: "这个用户还没有填写简介。",
    closePanel: "收起",
    searchLabel: "搜索",
    searchPlaceholder: "搜索昵称",
    searchEmptyTitle: "没有匹配用户",
    searchEmptyDescription: (query: string) => `没有找到「${query}」相关用户。`,
    clearSearch: "清空搜索",
    showMoreUsers: (count: number) => `还有 ${count} 位`,
  };
}

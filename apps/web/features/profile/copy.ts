export function getProfileFollowCopy(locale: string) {
  if (locale === "fr") {
    return {
      followersCount: "Abonnes",
      followingCount: "Abonnements",
      followingTitle: "Abonnements",
      followingDescription:
        "Les personnes que vous suivez apparaissent ici.",
      followingEmptyTitle: "Aucun abonnement",
      followingEmptyDescription:
        "Quand vous suivrez des organisateurs ou d'autres utilisateurs, ils apparaitront ici.",
      followersTitle: "Abonnes",
      followersDescription: "Les personnes qui vous suivent apparaissent ici.",
      followersEmptyTitle: "Aucun abonne",
      followersEmptyDescription:
        "Quand quelqu'un vous suivra, son profil apparaitra ici.",
      noBio: "Cette personne n'a pas encore ajoute de bio.",
      closePanel: "Fermer",
      showMoreUsers: (count: number) => `+ ${count} autre${count > 1 ? "s" : ""}`,
    };
  }

  if (locale === "en") {
    return {
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
      showMoreUsers: (count: number) => `+ ${count} more`,
    };
  }

  return {
    followersCount: "粉丝",
    followingCount: "关注",
    followingTitle: "关注",
    followingDescription: "你关注的人会显示在这里。",
    followingEmptyTitle: "还没有关注任何人",
    followingEmptyDescription:
      "当你关注活动发起人或其他用户后，他们会显示在这里。",
    followersTitle: "粉丝",
    followersDescription: "关注你的人会显示在这里。",
    followersEmptyTitle: "还没有粉丝",
    followersEmptyDescription:
      "当有人关注你后，他们的资料会显示在这里。",
    noBio: "这个用户还没有填写简介。",
    closePanel: "收起",
    showMoreUsers: (count: number) => `还有 ${count} 位`,
  };
}

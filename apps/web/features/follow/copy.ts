export function getFollowCopy(locale: string) {
  if (locale === "fr") {
    return {
      follow: "Suivre",
      unfollow: "Ne plus suivre",
      following: "Abonnement...",
      unfollowing: "Mise a jour...",
      signInToFollow: "Se connecter pour suivre",
      followers: "Abonnes",
      followingCount: "Abonnements",
      invalidRequest: "Requete invalide. Actualisez la page puis reessayez.",
      cannotFollowSelf: "Vous ne pouvez pas vous suivre vous-meme.",
      targetUnavailable:
        "Cet utilisateur est introuvable ou temporairement indisponible.",
    };
  }

  if (locale === "en") {
    return {
      follow: "Follow",
      unfollow: "Unfollow",
      following: "Following...",
      unfollowing: "Unfollowing...",
      signInToFollow: "Sign in to follow",
      followers: "Followers",
      followingCount: "Following",
      invalidRequest: "Invalid request. Refresh the page and try again.",
      cannotFollowSelf: "You cannot follow yourself.",
      targetUnavailable:
        "This user does not exist or cannot be followed right now.",
    };
  }

  return {
    follow: "关注",
    unfollow: "取消关注",
    following: "关注中...",
    unfollowing: "取消中...",
    signInToFollow: "登录后关注",
    followers: "粉丝",
    followingCount: "关注",
    invalidRequest: "请求参数无效，请刷新页面后重试。",
    cannotFollowSelf: "不能关注自己。",
    targetUnavailable: "目标用户不存在或暂不可关注。",
  };
}

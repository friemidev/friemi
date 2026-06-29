export function getFollowCopy(locale: string) {
  if (locale === "fr") {
    return {
      follow: "Suivre",
      followed: "Suivi",
      unfollow: "Ne plus suivre",
      following: "Abonnement...",
      unfollowing: "Mise à jour...",
      signInToFollow: "Se connecter pour suivre",
      followers: "Abonnés",
      followingCount: "Abonnements",
      invalidRequest: "Requête invalide. Réessayez plus tard.",
      cannotFollowSelf: "Vous ne pouvez pas vous suivre vous-même.",
      targetUnavailable:
        "Cet utilisateur est introuvable ou temporairement indisponible.",
    };
  }

  if (locale === "en") {
    return {
      follow: "Follow",
      followed: "Following",
      unfollow: "Unfollow",
      following: "Following...",
      unfollowing: "Unfollowing...",
      signInToFollow: "Sign in to follow",
      followers: "Followers",
      followingCount: "Following",
      invalidRequest: "Invalid request. Try again later.",
      cannotFollowSelf: "You cannot follow yourself.",
      targetUnavailable:
        "This user does not exist or cannot be followed right now.",
    };
  }

  return {
    follow: "关注",
    followed: "已关注",
    unfollow: "取消关注",
    following: "关注中...",
    unfollowing: "取消中...",
    signInToFollow: "登录后关注",
    followers: "粉丝",
    followingCount: "关注",
    invalidRequest: "请求无效，请稍后再试。",
    cannotFollowSelf: "不能关注自己。",
    targetUnavailable: "目标用户不存在或暂时不可关注。",
  };
}

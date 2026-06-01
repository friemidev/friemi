export function getActivityFavoriteCopy(locale: string) {
  if (locale === "fr") {
    return {
      favorite: "Ajouter aux favoris",
      unfavorite: "Retirer des favoris",
      favoriting: "Ajout...",
      unfavoriting: "Retrait...",
      signInToFavorite: "Se connecter pour enregistrer",
      invalidRequest: "Requete invalide. Reessayez plus tard.",
      activityUnavailable:
        "Cette activite est introuvable ou ne peut pas etre enregistree.",
    };
  }

  if (locale === "en") {
    return {
      favorite: "Save activity",
      unfavorite: "Saved",
      favoriting: "Saving...",
      unfavoriting: "Removing...",
      signInToFavorite: "Sign in to save",
      invalidRequest: "Invalid request. Try again later.",
      activityUnavailable:
        "This activity does not exist or cannot be saved right now.",
    };
  }

  return {
    favorite: "收藏活动",
    unfavorite: "已收藏",
    favoriting: "收藏中...",
    unfavoriting: "取消中...",
    signInToFavorite: "登录后收藏",
    invalidRequest: "请求无效，请稍后再试。",
    activityUnavailable: "活动不存在或暂不可收藏。",
  };
}

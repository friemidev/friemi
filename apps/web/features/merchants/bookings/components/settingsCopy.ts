export function getBookingSettingsCopy(locale: string) {
  if (locale === "fr")
    return {
      steps: "Étapes de configuration",
      next: "Suivant : disponibilités",
      previous: "Retour au contenu",
      titleRequired: "Donnez un nom à votre sortie (au moins 2 caractères).",
      coverHint: "Une photo pour présenter votre sortie",
      dailyHint: "Réservations possibles chaque jour de la période choisie.",
      weeklyHint: "Choisissez les jours ouverts chaque semaine.",
      datesHint: "Ajoutez une ou plusieurs dates d’ouverture.",
      range: "Période d’ouverture",
      noEnd: "Sans date de fin, les réservations restent ouvertes.",
      exceptions: "Ajouter une fermeture exceptionnelle",
      editContent: "Modifier le contenu",
    };
  if (locale === "en")
    return {
      steps: "Setup steps",
      next: "Next: availability",
      previous: "Back to content",
      titleRequired: "Give your meetup a name (at least 2 characters).",
      coverHint: "A photo to introduce your meetup",
      dailyHint: "Accept bookings every day within your opening dates.",
      weeklyHint: "Choose the days you open each week.",
      datesHint: "Add one or more dates when guests can book.",
      range: "Opening period",
      noEnd: "Leave the end date empty to stay open indefinitely.",
      exceptions: "Add a temporary closure",
      editContent: "Edit meetup content",
    };
  return {
    steps: "设置步骤",
    next: "下一步：开放日期",
    previous: "返回聚吧内容",
    titleRequired: "请填写至少 2 个字的聚吧名称。",
    coverHint: "用一张图片介绍你的聚吧",
    dailyHint: "在开放范围内，每天都可以预约。",
    weeklyHint: "选择每周可以预约的日期，可多选。",
    datesHint: "添加一个或多个可以预约的日期。",
    range: "开放范围",
    noEnd: "不填结束日期，持续开放预约。",
    exceptions: "添加临时休息日",
    editContent: "编辑聚吧内容",
  };
}

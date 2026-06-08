export function getPublicEventCopy(locale: string) {
  if (locale === "fr") {
    return {
      navLabel: "Découverte",
      listTitle: "Découverte d'activités",
      listDescription:
        "Choisissez une activité, puis rejoignez un groupe existant ou créez le vôtre.",
      listScope: "Une activité est une information. L'inscription se fait dans les groupes.",
      publicEventGuideTitle: "Activité",
      publicEventGuideDescription:
        "Une information importée ou officielle pour vérifier l'heure, le lieu et le lien source.",
      teamGuideTitle: "Groupe",
      teamGuideDescription:
        "Une sortie créée par un utilisateur autour de cette activité. C'est ici que l'on s'inscrit.",
      emptyTitle: "Aucune activité disponible",
      emptyDescription: "Les activités importées apparaîtront ici.",
      loadFailedTitle: "Échec du chargement",
      loadFailedDescription:
        "Vérifiez la base de données ou réessayez plus tard.",
      detailSource: "Activité",
      eventInfoTitle: "À propos de l'événement",
      officialPage: "Page officielle",
      viewEvent: "Voir l'événement",
      viewTeams: "Voir les groupes",
      jumpToTeams: "Voir les groupes",
      teamUp: "Créer un groupe",
      actionTitle: "Envie d'y aller avec d'autres membres ?",
      actionDescription:
        "Regardez d'abord les groupes existants. Si aucun ne vous convient, créez le vôtre.",
      existingTeams: "Groupes en cours",
      teamSectionDescription:
        "Rejoignez un groupe existant en priorité. Si aucun ne vous convient, créez le vôtre.",
      teamSectionEndedDescription:
        "Cette activité est terminée. Vous pouvez encore consulter les groupes créés autour d'elle.",
      teamSectionUnavailableDescription:
        "Cette activité n'est plus disponible. Les groupes existants restent visibles pour référence.",
      noTeamsTitle: "Aucun groupe pour le moment",
      noTeamsDescription:
        "Créez un groupe pour trouver des personnes qui souhaitent y aller avec vous.",
      noTeamsEndedDescription:
        "Cette activité est terminée et aucun groupe n'a été créé.",
      noTeamsUnavailableDescription:
        "Cette activité n'est plus disponible et aucun groupe n'a été créé.",
      noTeamsCta: "Créer le premier groupe",
      publicEventRuleTitle: "Information d'activité",
      publicEventRuleDescription:
        "Cette page présente l'activité. Pour y aller avec d'autres membres, rejoignez un groupe ou créez-en un.",
      teamCount: (count: number) =>
        count === 0
          ? "Aucun groupe"
          : `${count} groupe${count > 1 ? "s" : ""}`,
      createTeamTitle: "Créer un groupe",
      createTeamDescription:
        "Les informations de l'activité sont préremplies. Ajoutez vos détails de rendez-vous et le nombre de places.",
      teamTitle: (title: string) => `On y va ensemble : ${title}`,
      backToEvent: "Retour à l'activité",
      backToPublicEvents: "Retour à la découverte",
      basedOnEvent: "Basé sur",
      eventEnded: "Cette activité est terminée.",
      eventCancelled: "Cette activité a été annulée.",
      cancelledBadge: "Annulé",
      officialPriceFallback: "Selon la page officielle",
      linkedEventTitle: "Activité liée",
      linkedEventDescription:
        "Ce groupe a été créé à partir de cette activité.",
      linkedEventCta: "Voir l'activité",
      eventUnavailableError:
        "Cette activité n'est plus disponible. Revenez à sa page et réessayez.",
      eventEndedError:
        "Cette activité est terminée. Vous ne pouvez plus créer de groupe.",
      eventCancelledError:
        "Cette activité a été annulée. Vous ne pouvez plus créer de groupe.",
      duplicateTeamError:
        "Vous avez déjà créé un groupe pour cette activité. Vous pouvez modifier le groupe existant.",
    };
  }

  if (locale === "en") {
    return {
      navLabel: "Discover",
      listTitle: "Activity discovery",
      listDescription:
        "Pick an activity, then join an existing crew or start your own.",
      listScope: "An activity is an information card. Sign-ups happen in crews.",
      publicEventGuideTitle: "Activity",
      publicEventGuideDescription:
        "Imported or official information for time, place, and source link.",
      teamGuideTitle: "Crew",
      teamGuideDescription:
        "A user-created plan around that activity. This is where sign-ups happen.",
      emptyTitle: "No activities yet",
      emptyDescription: "Imported activities will appear here.",
      loadFailedTitle: "Failed to load",
      loadFailedDescription:
        "Check the database connection or try again later.",
      detailSource: "Activity",
      eventInfoTitle: "About this event",
      officialPage: "Official page",
      viewEvent: "View event",
      viewTeams: "View crews",
      jumpToTeams: "See crews",
      teamUp: "Start a crew",
      actionTitle: "Want to go with other members?",
      actionDescription:
        "Check existing crews first. If none fits, start your own.",
      existingTeams: "Crews forming",
      teamSectionDescription:
        "Join an existing crew first. If none fits, start your own.",
      teamSectionEndedDescription:
        "This activity has ended. You can still view crews that were created around it.",
      teamSectionUnavailableDescription:
        "This activity is no longer available. Existing crews remain visible for reference.",
      noTeamsTitle: "No crews yet",
      noTeamsDescription:
        "Start a crew to find people who want to go with you.",
      noTeamsEndedDescription:
        "This activity has ended and no crews were created.",
      noTeamsUnavailableDescription:
        "This activity is no longer available and no crews were created.",
      noTeamsCta: "Start the first crew",
      publicEventRuleTitle: "Activity info",
      publicEventRuleDescription:
        "This page shows the activity itself. To go with other members, join a crew or start one.",
      teamCount: (count: number) =>
        count === 0 ? "No crews yet" : `${count} crew${count === 1 ? "" : "s"}`,
      createTeamTitle: "Start a crew",
      createTeamDescription:
        "Activity details are prefilled. Add your meetup details and crew size.",
      teamTitle: (title: string) => `Go together: ${title}`,
      backToEvent: "Back to event",
      backToPublicEvents: "Back to discovery",
      basedOnEvent: "Based on",
      eventEnded: "This activity has ended.",
      eventCancelled: "This activity was cancelled.",
      cancelledBadge: "Cancelled",
      officialPriceFallback: "See official page",
      linkedEventTitle: "Linked activity",
      linkedEventDescription: "This crew was created from this activity.",
      linkedEventCta: "View activity",
      eventUnavailableError:
        "This activity is no longer available. Go back to the activity page and try again.",
      eventEndedError:
        "This activity has ended. You can no longer start a crew.",
      eventCancelledError:
        "This activity was cancelled. You can no longer start a crew.",
      duplicateTeamError:
        "You already started a crew for this activity. You can edit the existing crew.",
    };
  }

  return {
    navLabel: "活动发现",
    listTitle: "活动发现",
    listDescription: "先选择活动，再加入已有车队或发起自己的组局。",
    listScope: "活动只是信息位，报名和沟通发生在车队里。",
    publicEventGuideTitle: "活动信息",
    publicEventGuideDescription:
      "来自官方、开放数据或爬虫的信息，用来确认时间、地点和来源链接。",
    teamGuideTitle: "组局",
    teamGuideDescription:
      "用户围绕某个活动发起的同行计划，报名、审核和聊天都发生在组局里。",
    emptyTitle: "暂无活动",
    emptyDescription: "导入的活动会显示在这里。",
    loadFailedTitle: "加载失败",
    loadFailedDescription: "请检查数据库连接，或稍后重试。",
    detailSource: "活动信息",
    eventInfoTitle: "活动介绍",
    officialPage: "官方页面",
    viewEvent: "查看活动",
    viewTeams: "查看组局",
    jumpToTeams: "看已有组局",
    teamUp: "发起组局",
    actionTitle: "想和别人一起去？",
    actionDescription:
      "先看看已有组局；没有合适的队伍，再发起自己的组局。",
    existingTeams: "正在组局",
    teamSectionDescription:
      "优先加入已有组局，提高成行概率；没有合适的队伍时，再发起自己的组局。",
    teamSectionEndedDescription:
      "这个活动已经结束，仍可查看当时围绕它创建的组局。",
    teamSectionUnavailableDescription:
      "这个活动已不可用，已有组局仅作为历史记录展示。",
    noTeamsTitle: "暂无组局",
    noTeamsDescription: "发起一个组局，找到想一起去的人。",
    noTeamsEndedDescription: "这个活动已经结束，暂时没有历史组局。",
    noTeamsUnavailableDescription: "这个活动已不可用，暂时没有历史组局。",
    noTeamsCta: "发起第一个组局",
    publicEventRuleTitle: "活动信息",
    publicEventRuleDescription:
      "这里展示的是活动本身。想和平台用户一起去，请加入下方组局，或发起自己的组局。",
    teamCount: (count: number) =>
      count === 0 ? "暂无组局" : `${count} 个组局`,
    createTeamTitle: "发起组局",
    createTeamDescription:
      "活动信息已预填，你只需要补充集合方式、人数和同行说明。",
    teamTitle: (title: string) => `一起去：${title}`,
    backToEvent: "返回活动",
    backToPublicEvents: "返回活动发现",
    basedOnEvent: "基于",
    eventEnded: "这个活动已经结束。",
    eventCancelled: "这个活动已被取消。",
    cancelledBadge: "已取消",
    officialPriceFallback: "以官方页面为准",
    linkedEventTitle: "关联活动",
    linkedEventDescription: "这个组局是基于该活动发起的。",
    linkedEventCta: "查看活动",
    eventUnavailableError:
      "活动不存在或已不可用，请返回活动详情页重新发起组局。",
    eventEndedError: "这个活动已经结束，不能继续发起组局。",
    eventCancelledError: "这个活动已被取消，不能继续发起组局。",
    duplicateTeamError:
      "你已经为这个活动发起过组局，可以直接编辑已有组局。",
  };
}

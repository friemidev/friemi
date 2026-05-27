import type {
  ActivityCategory,
  ActivityStatus,
  ActivityType,
  PriceType,
} from "@chill-club/shared";

export type AppLocale = "zh-CN" | "en" | "fr";

export const localeMeta: Record<
  AppLocale,
  {
    flag: string;
    label: string;
  }
> = {
  "zh-CN": {
    flag: "🇨🇳",
    label: "中文",
  },
  en: {
    flag: "🇬🇧",
    label: "English",
  },
  fr: {
    flag: "🇫🇷",
    label: "Français",
  },
};

const copy = {
  "zh-CN": {
    nav: {
      home: "首页",
      activities: "活动",
      newActivity: "发起活动",
      newActivityShort: "发起",
      profile: "个人空间",
      profileShort: "我的",
      signIn: "登录",
    },
    common: {
      viewAll: "查看全部",
      loadFailed: "加载失败",
      retryDatabase: "请稍后刷新重试，或检查数据库连接是否可用。",
      people: "人",
      switchLanguage: (nextLanguage: string) => `切换到 ${nextLanguage}`,
    },
    auth: {
      clerkMissingTitle: "Clerk 尚未配置",
      signInMissingDescription:
        "填写 `.env.local` 中的 Clerk key 后，这里会显示真实登录组件。",
      signUpMissingDescription:
        "填写 `.env.local` 中的 Clerk key 后，这里会显示真实注册组件。",
    },
    home: {
      eyebrow: "Paris first · 中文活动搭子",
      title: "Next Fun Club",
      tagline: "下一场，Fun 开场",
      description: "面向海外中文用户的活动组织与找搭子平台，从巴黎开始。",
      browseActivities: "浏览活动",
      homeActivityFailedTitle: "活动加载失败",
      homeActivityFailedDescription: "请检查数据库连接后刷新页面。",
      emptyPreviewTitle: "暂无活动",
      emptyPreviewDescription: "数据库新增招募中活动后会显示在这里。",
      recentTitle: "最近活动",
      recentDescription: "展示数据库中最近公开招募或已成团的活动。",
      emptyRecentDescription:
        "数据库新增公开的招募中活动后，刷新页面即可看到。",
    },
    activities: {
      title: "活动发现",
      description: "MVP 阶段先展示手动运营和用户发起的活动。",
      scopeTitle: "当前展示范围",
      scopeDescription:
        "只展示公开、招募中或已成团的活动，并按开始时间从近到远排序。",
      emptyTitle: "暂无活动",
      emptyDescription:
        "当前没有招募中或已成团的活动，创建新活动后会显示在这里。",
    },
    activityDetail: {
      descriptionTitle: "活动说明",
      itineraryTitle: "活动行程",
      emptyItinerary: "发起人暂未填写详细行程。",
      organizerTitle: "发起人",
      emptyOrganizerBio: "这个发起人还没有填写简介。",
      type: "活动类型",
      destination: "目的地",
      participants: "已报名",
      minParticipants: "最少成团",
      seatStatus: "名额状态",
      price: "费用",
      approvalRequired: "报名后需发起人确认",
      approvalAuto: "报名后自动确认",
      editActivity: "编辑活动",
    },
    activityOwner: {
      title: "发起人操作",
      cancel: "取消活动",
      cancelling: "取消中...",
      cancelDescription: "取消后活动会从列表隐藏，用户不能继续报名。",
      cancelConfirm: "确定要取消这个活动吗？取消后用户将不能继续报名。",
      cancelledHint: "活动已取消，用户无法继续报名。",
      endedHint: "活动已结束，不能再取消。",
      refreshError: "请刷新页面后重试。",
      permissionError: "只有活动发起人可以取消这个活动。",
      statusError: "当前活动状态不能取消。",
      endedError: "活动已结束，不能再取消。",
      conflictError: "活动状态刚刚发生变化，请刷新后重试。",
      failedError: "取消活动失败，请稍后重试。",
    },
    approval: {
      title: "报名审核",
      description: "只显示待审核的报名申请，通过后会计入活动人数。",
      pendingCount: (count: number) => `${count} 个待审核`,
      empty: "暂无待审核报名。",
      emptyMessage: "报名者没有填写留言。",
      approve: "通过",
      reject: "拒绝",
      reviewing: "处理中...",
      refreshError: "请刷新页面后重试。",
      missingError: "报名记录不存在或已更新。",
      permissionError: "只有活动发起人可以审核报名。",
      statusError: "当前报名状态不能审核。",
      closedError: "活动已结束或已取消，不能继续审核。",
      fullError: "活动名额已满，不能继续通过报名。",
      conflictError: "报名人数刚刚发生变化，请刷新后重试。",
      failedError: "审核报名失败，请稍后重试。",
    },
    newActivity: {
      title: "发起活动",
      description: "填写活动信息后会写入数据库，并跳转到新活动详情页。",
    },
    editActivity: {
      title: "编辑活动",
      description: "只允许发起人修改活动信息，保存后会回到活动详情页。",
      forbiddenTitle: "无权编辑",
      forbiddenDescription: "只有活动发起人可以编辑这个活动。",
      lockedTitle: "活动不可编辑",
      lockedDescription: "已结束或已取消的活动不能继续编辑。",
    },
    profile: {
      title: "个人空间",
      emailFallback: "未绑定邮箱",
      createdCount: "我发起的活动",
      participationCount: "我参与的活动",
      errorTitle: "个人空间加载失败",
      errorDescription:
        "用户资料已读取，但活动数据暂时加载失败，请稍后刷新重试。",
      createdTitle: "我发起的活动",
      createdDescription: "展示你创建的活动，点击卡片可以进入活动详情页。",
      createdEmptyTitle: "还没有发起活动",
      createdEmptyDescription:
        "创建第一场活动后，它会显示在这里，方便你从个人空间回到详情页。",
      participationTitle: "我参与的活动",
      participationDescription:
        "报名状态会区分待审核、已确认和已取消，点击卡片可以查看活动详情。",
      participationEmptyTitle: "还没有报名记录",
      participationEmptyDescription:
        "报名参加活动后，你可以在这里查看报名状态和活动详情。",
      hiddenCreated: (limit: number, count: number) =>
        `当前显示最近 ${limit} 个发起活动，另有 ${count} 个更早的活动暂未展示。`,
      hiddenParticipation: (limit: number, count: number) =>
        `当前显示最近 ${limit} 条参与记录，另有 ${count} 条更早的记录暂未展示。`,
      signedUpAt: (date: string) => `报名于 ${date}`,
      cancelledAt: (date: string) => `取消于 ${date}`,
      participationAria: (
        title: string,
        participationStatus: string,
        activityStatus: string,
      ) =>
        `${title}，报名状态：${participationStatus}，活动状态：${activityStatus}`,
    },
    join: {
      submitting: "提交中...",
      submitApproval: "提交报名申请",
      submit: "立即报名",
      pendingTitle: "报名申请已提交",
      pendingDescription: "这个活动需要发起人审核，通过后会计入报名人数。",
      joinedTitle: "你已报名",
      joinedDescription: "你已经在这个活动的参与名单中。",
      rejectedTitle: "报名未通过",
      rejectedDescription: "如需重新沟通，可以修改留言后再次提交报名。",
      cancelledTitle: "你已取消报名",
      cancelledDescription: "如计划有变，也可以重新提交报名。",
      closedTitle: "活动已结束",
      closedDescription: "这个活动已经结束或暂不可报名。",
      fullTitle: "名额已满",
      fullDescription: "当前活动名额已满，不能继续报名。",
      signInTitle: "登录后报名",
      signInDescription: "登录后可以提交报名，并让发起人看到你的报名信息。",
      organizerTitle: "你是活动发起人",
      organizerDescription: "发起人不需要报名自己的活动。",
      messageLabel: "报名留言",
      messagePlaceholder: "简单介绍一下你想参加的原因，可选",
      messageHintApproval: "发起人会看到这段留言，用于判断是否通过报名。",
      messageHint: "留言会随报名记录保存，方便发起人了解你。",
      cancelPending: "取消中...",
      cancel: "取消报名",
      cancelConfirm: "确定要取消报名吗？取消后你的名额会释放给其他人。",
    },
    form: {
      basicInfo: "基础信息",
      activityContent: "活动内容",
      title: "标题",
      titlePlaceholder: "例如：周五下班后桌游局",
      description: "描述",
      descriptionPlaceholder: "介绍活动内容、适合人群、注意事项",
      itinerary: "行程",
      itineraryPlaceholder: "18:30 集合\n19:00 开始活动\n21:30 自由交流",
      type: "活动形式",
      typeHint: "本地活动或旅行搭子，创建后会影响列表标签。",
      category: "活动主题",
      categoryHint: "优先选择平台预设主题；没有合适选项时选“其他”。",
      otherCategory: "其他主题",
      otherCategoryPlaceholder: "例如：读书会、语言交换、摄影约拍",
      otherCategoryHint: "会保存到活动说明中，方便参与者理解活动内容。",
      timeLocation: "时间和地点",
      city: "城市",
      destination: "目的地",
      destinationPlaceholder: "例如：Nice / Amsterdam / London",
      destinationHint: "旅行搭子需要填写目的地，方便用户判断是否感兴趣。",
      address: "地址",
      startAt: "开始时间",
      startAtHint: "按巴黎时间保存，需晚于当前时间。",
      endAt: "结束时间",
      endAtHint: "可选；填写时必须晚于开始时间。",
      peoplePrice: "人数和费用",
      capacity: "人数上限",
      minParticipants: "最少成团人数",
      minParticipantsPlaceholder: "例如：4",
      priceType: "费用类型",
      priceText: "费用说明",
      priceTextPlaceholder: "免费 / AA 预计 10 欧 / 门票自理",
      requiresApproval: "报名需要审核",
      requiresApprovalHint: "开启后，用户报名后需要发起人确认。",
      creating: "创建中...",
      create: "创建活动",
      saving: "保存中...",
      save: "保存修改",
      cancelEdit: "返回详情页",
    },
    activityLabels: {
      activityAria: (title: string, date: string, location: string) =>
        `${title}，${date}，${location}`,
      categories: {
        BOARD_GAME: "桌游",
        MOVIE: "电影",
        MUSIC: "音乐",
        SPORTS: "运动",
        TRAVEL: "旅行",
        FOOD: "饭局",
        EXHIBITION: "展览",
        OTHER: "其他",
      },
      statuses: {
        OPEN: "招募中",
        FULL: "已满",
        DRAFT: "草稿",
        RECRUITING: "招募中",
        CONFIRMED: "已成团",
        ENDED: "已结束",
        CANCELLED: "已取消",
      },
      types: {
        PUBLIC_EVENT: "公共活动",
        USER_HOSTED: "用户发起",
        LOCAL: "本地局",
        TRIP: "旅游搭子",
      },
      prices: {
        FREE: "免费",
        AA: "AA",
        FIXED: "固定金额",
        RANGE: "预算区间",
      },
      participationStatuses: {
        JOINED: "已报名",
        PENDING: "待审核",
        APPROVED: "已确认",
        REJECTED: "未通过",
        CANCELLED: "已取消",
      },
      seats: {
        cancelled: "已取消",
        ended: "已结束",
        draft: "未开放",
        full: "已满",
        remaining: (count: number) => `剩 ${count} 位`,
      },
    },
  },
  en: {
    nav: {
      home: "Home",
      activities: "Activities",
      newActivity: "Create activity",
      newActivityShort: "Create",
      profile: "Profile",
      profileShort: "Me",
      signIn: "Sign in",
    },
    common: {
      viewAll: "View all",
      loadFailed: "Load failed",
      retryDatabase:
        "Refresh later, or check whether the database connection is available.",
      people: "people",
      switchLanguage: (nextLanguage: string) => `Switch to ${nextLanguage}`,
    },
    auth: {
      clerkMissingTitle: "Clerk is not configured",
      signInMissingDescription:
        "Add the Clerk keys in `.env.local` to show the real sign-in component here.",
      signUpMissingDescription:
        "Add the Clerk keys in `.env.local` to show the real sign-up component here.",
    },
    home: {
      eyebrow: "Paris first · Chinese-speaking activity crews",
      title: "Next Fun Club",
      tagline: "What's next? Fun begins.",
      description:
        "An activity planning and buddy-finding platform for Chinese-speaking users overseas, starting in Paris.",
      browseActivities: "Browse activities",
      homeActivityFailedTitle: "Activities failed to load",
      homeActivityFailedDescription:
        "Check the database connection and refresh the page.",
      emptyPreviewTitle: "No activities yet",
      emptyPreviewDescription:
        "Recruiting activities will appear here once they are added.",
      recentTitle: "Recent activities",
      recentDescription:
        "Recently published public recruiting or confirmed activities from the database.",
      emptyRecentDescription:
        "Add a public recruiting activity, then refresh to see it here.",
    },
    activities: {
      title: "Activity discovery",
      description:
        "MVP focuses on curated activities and activities created by users.",
      scopeTitle: "Current scope",
      scopeDescription:
        "Showing public recruiting or confirmed activities, sorted by the nearest start time.",
      emptyTitle: "No activities",
      emptyDescription:
        "There are no recruiting or confirmed activities right now. New activities will appear here.",
    },
    activityDetail: {
      descriptionTitle: "About this activity",
      itineraryTitle: "Plan",
      emptyItinerary: "The organizer has not added a detailed plan yet.",
      organizerTitle: "Organizer",
      emptyOrganizerBio: "This organizer has not added a bio yet.",
      type: "Type",
      destination: "Destination",
      participants: "Joined",
      minParticipants: "Minimum group",
      seatStatus: "Seat status",
      price: "Cost",
      approvalRequired: "Organizer approval required",
      approvalAuto: "Auto-confirmed after joining",
      editActivity: "Edit activity",
    },
    activityOwner: {
      title: "Organizer actions",
      cancel: "Cancel activity",
      cancelling: "Cancelling...",
      cancelDescription:
        "After cancellation, the activity is hidden from lists and users cannot join.",
      cancelConfirm:
        "Cancel this activity? Users will no longer be able to join.",
      cancelledHint: "This activity is cancelled. Users can no longer join.",
      endedHint: "This activity has ended and can no longer be cancelled.",
      refreshError: "Refresh the page and try again.",
      permissionError: "Only the organizer can cancel this activity.",
      statusError: "This activity status cannot be cancelled.",
      endedError: "This activity has ended and can no longer be cancelled.",
      conflictError: "The activity status just changed. Refresh and try again.",
      failedError: "Failed to cancel the activity. Try again later.",
    },
    approval: {
      title: "Participation review",
      description:
        "Only pending requests are shown. Approved requests count toward seats.",
      pendingCount: (count: number) => `${count} pending`,
      empty: "No pending requests.",
      emptyMessage: "The participant did not leave a message.",
      approve: "Approve",
      reject: "Reject",
      reviewing: "Reviewing...",
      refreshError: "Refresh the page and try again.",
      missingError: "This request no longer exists or was updated.",
      permissionError: "Only the organizer can review participation requests.",
      statusError: "This request status cannot be reviewed.",
      closedError:
        "This activity has ended or been cancelled, so requests cannot be reviewed.",
      fullError: "This activity is full. No more requests can be approved.",
      conflictError: "Seat availability just changed. Refresh and try again.",
      failedError: "Failed to review this request. Try again later.",
    },
    newActivity: {
      title: "Create activity",
      description:
        "Fill in the activity details, save them to the database, then go to the new detail page.",
    },
    editActivity: {
      title: "Edit activity",
      description:
        "Only the organizer can update this activity. You will return to the detail page after saving.",
      forbiddenTitle: "No edit access",
      forbiddenDescription: "Only the organizer can edit this activity.",
      lockedTitle: "Activity cannot be edited",
      lockedDescription:
        "Ended or cancelled activities can no longer be edited.",
    },
    profile: {
      title: "Profile",
      emailFallback: "No email connected",
      createdCount: "Created",
      participationCount: "Joined",
      errorTitle: "Profile failed to load",
      errorDescription:
        "Your profile loaded, but activity data failed to load. Refresh later.",
      createdTitle: "Created by me",
      createdDescription:
        "Activities you created. Open a card to review the detail page.",
      createdEmptyTitle: "No created activities",
      createdEmptyDescription: "Your first created activity will appear here.",
      participationTitle: "Activities I joined",
      participationDescription:
        "Track pending, confirmed, and cancelled participation records.",
      participationEmptyTitle: "No participation records",
      participationEmptyDescription:
        "Activities you join will appear here with their status.",
      hiddenCreated: (limit: number, count: number) =>
        `Showing the latest ${limit} created activities. ${count} earlier activities are not shown yet.`,
      hiddenParticipation: (limit: number, count: number) =>
        `Showing the latest ${limit} participation records. ${count} earlier records are not shown yet.`,
      signedUpAt: (date: string) => `Joined on ${date}`,
      cancelledAt: (date: string) => `Cancelled on ${date}`,
      participationAria: (
        title: string,
        participationStatus: string,
        activityStatus: string,
      ) =>
        `${title}, participation status: ${participationStatus}, activity status: ${activityStatus}`,
    },
    join: {
      submitting: "Submitting...",
      submitApproval: "Request to join",
      submit: "Join now",
      pendingTitle: "Request submitted",
      pendingDescription:
        "The organizer needs to approve this request before it counts toward attendance.",
      joinedTitle: "You're joined",
      joinedDescription: "You are already on the participant list.",
      rejectedTitle: "Request declined",
      rejectedDescription: "You can adjust your message and submit again.",
      cancelledTitle: "You've cancelled",
      cancelledDescription: "You can submit again if your plans change.",
      closedTitle: "Activity closed",
      closedDescription:
        "This activity has ended or is not currently open for joining.",
      fullTitle: "No seats left",
      fullDescription:
        "This activity is full and cannot accept more participants.",
      signInTitle: "Sign in to join",
      signInDescription:
        "Sign in to submit your request and share your information with the organizer.",
      organizerTitle: "You are the organizer",
      organizerDescription:
        "Organizers do not need to join their own activities.",
      messageLabel: "Message",
      messagePlaceholder: "Briefly share why you want to join. Optional.",
      messageHintApproval:
        "The organizer will use this message when reviewing your request.",
      messageHint: "This message is saved with your participation record.",
      cancelPending: "Cancelling...",
      cancel: "Cancel join",
      cancelConfirm: "Cancel your participation? Your seat will be released.",
    },
    form: {
      basicInfo: "Basic information",
      activityContent: "Activity content",
      title: "Title",
      titlePlaceholder: "Example: Friday board game night",
      description: "Description",
      descriptionPlaceholder: "Describe the activity, audience, and notes",
      itinerary: "Plan",
      itineraryPlaceholder: "18:30 Meet\n19:00 Start\n21:30 Free chat",
      type: "Format",
      typeHint:
        "Choose local activity or trip buddy. This affects the list label.",
      category: "Topic",
      categoryHint:
        "Choose a platform topic first; use Other only when needed.",
      otherCategory: "Other topic",
      otherCategoryPlaceholder: "Book club, language exchange, photo walk",
      otherCategoryHint:
        "Saved into the description so participants understand the activity.",
      timeLocation: "Time and place",
      city: "City",
      destination: "Destination",
      destinationPlaceholder: "Nice / Amsterdam / London",
      destinationHint:
        "Trips need a destination so users can quickly judge fit.",
      address: "Address",
      startAt: "Start time",
      startAtHint: "Saved in Paris time. Must be later than now.",
      endAt: "End time",
      endAtHint: "Optional. Must be after the start time when filled.",
      peoplePrice: "People and cost",
      capacity: "Capacity",
      minParticipants: "Minimum group size",
      minParticipantsPlaceholder: "Example: 4",
      priceType: "Cost type",
      priceText: "Cost note",
      priceTextPlaceholder: "Free / Split around €10 / Tickets self-paid",
      requiresApproval: "Require approval",
      requiresApprovalHint:
        "When enabled, the organizer confirms requests manually.",
      creating: "Creating...",
      create: "Create activity",
      saving: "Saving...",
      save: "Save changes",
      cancelEdit: "Back to detail",
    },
    activityLabels: {
      activityAria: (title: string, date: string, location: string) =>
        `${title}. ${date}. ${location}.`,
      categories: {
        BOARD_GAME: "Board games",
        MOVIE: "Movies",
        MUSIC: "Music",
        SPORTS: "Sports",
        TRAVEL: "Travel",
        FOOD: "Food",
        EXHIBITION: "Exhibition",
        OTHER: "Other",
      },
      statuses: {
        OPEN: "Recruiting",
        FULL: "Full",
        DRAFT: "Draft",
        RECRUITING: "Recruiting",
        CONFIRMED: "Confirmed",
        ENDED: "Ended",
        CANCELLED: "Cancelled",
      },
      types: {
        PUBLIC_EVENT: "Public event",
        USER_HOSTED: "User hosted",
        LOCAL: "Local",
        TRIP: "Trip buddy",
      },
      prices: {
        FREE: "Free",
        AA: "Split",
        FIXED: "Fixed price",
        RANGE: "Budget range",
      },
      participationStatuses: {
        JOINED: "Joined",
        PENDING: "Pending",
        APPROVED: "Confirmed",
        REJECTED: "Declined",
        CANCELLED: "Cancelled",
      },
      seats: {
        cancelled: "Cancelled",
        ended: "Ended",
        draft: "Closed",
        full: "Full",
        remaining: (count: number) => `${count} left`,
      },
    },
  },
  fr: {
    nav: {
      home: "Accueil",
      activities: "Activités",
      newActivity: "Créer une activité",
      newActivityShort: "Créer",
      profile: "Profil",
      profileShort: "Moi",
      signIn: "Connexion",
    },
    common: {
      viewAll: "Tout voir",
      loadFailed: "Échec du chargement",
      retryDatabase:
        "Réessayez plus tard ou vérifiez la connexion à la base de données.",
      people: "pers.",
      switchLanguage: (nextLanguage: string) => `Passer en ${nextLanguage}`,
    },
    auth: {
      clerkMissingTitle: "Clerk n'est pas configuré",
      signInMissingDescription:
        "Ajoutez les clés Clerk dans `.env.local` pour afficher le vrai composant de connexion.",
      signUpMissingDescription:
        "Ajoutez les clés Clerk dans `.env.local` pour afficher le vrai composant d'inscription.",
    },
    home: {
      eyebrow: "Paris d'abord · activités sinophones",
      title: "Next Fun Club",
      tagline: "La prochaine sortie commence ici.",
      description:
        "Une plateforme pour organiser des activités et trouver des compagnons parmi les utilisateurs sinophones à l'étranger, en commençant par Paris.",
      browseActivities: "Voir les activités",
      homeActivityFailedTitle: "Échec du chargement",
      homeActivityFailedDescription:
        "Vérifiez la connexion à la base de données puis actualisez la page.",
      emptyPreviewTitle: "Aucune activité",
      emptyPreviewDescription: "Les activités en recrutement apparaîtront ici.",
      recentTitle: "Activités récentes",
      recentDescription:
        "Activités publiques en recrutement ou confirmées, chargées depuis la base de données.",
      emptyRecentDescription:
        "Ajoutez une activité publique en recrutement puis actualisez la page.",
    },
    activities: {
      title: "Découvrir des activités",
      description:
        "Le MVP affiche d'abord les activités éditorialisées et celles créées par les utilisateurs.",
      scopeTitle: "Périmètre affiché",
      scopeDescription:
        "Activités publiques en recrutement ou confirmées, triées par date de début proche.",
      emptyTitle: "Aucune activité",
      emptyDescription:
        "Aucune activité en recrutement ou confirmée pour le moment. Les nouvelles activités apparaîtront ici.",
    },
    activityDetail: {
      descriptionTitle: "Présentation",
      itineraryTitle: "Programme",
      emptyItinerary:
        "L'organisateur n'a pas encore ajouté de programme détaillé.",
      organizerTitle: "Organisateur",
      emptyOrganizerBio: "Cet organisateur n'a pas encore ajouté de bio.",
      type: "Type",
      destination: "Destination",
      participants: "Inscrits",
      minParticipants: "Minimum",
      seatStatus: "Places",
      price: "Coût",
      approvalRequired: "Validation par l'organisateur requise",
      approvalAuto: "Confirmation automatique après inscription",
      editActivity: "Modifier",
    },
    activityOwner: {
      title: "Actions organisateur",
      cancel: "Annuler l'activité",
      cancelling: "Annulation...",
      cancelDescription:
        "Après annulation, l'activité est masquée des listes et les utilisateurs ne peuvent plus la rejoindre.",
      cancelConfirm:
        "Annuler cette activité ? Les utilisateurs ne pourront plus la rejoindre.",
      cancelledHint:
        "Cette activité est annulée. Les utilisateurs ne peuvent plus la rejoindre.",
      endedHint: "Cette activité est terminée et ne peut plus être annulée.",
      refreshError: "Actualisez la page puis réessayez.",
      permissionError: "Seul l'organisateur peut annuler cette activité.",
      statusError: "Ce statut d'activité ne peut pas être annulé.",
      endedError: "Cette activité est terminée et ne peut plus être annulée.",
      conflictError:
        "Le statut de l'activité vient de changer. Actualisez puis réessayez.",
      failedError: "Échec de l'annulation. Réessayez plus tard.",
    },
    approval: {
      title: "Validation des inscriptions",
      description:
        "Seules les demandes en attente sont affichées. Les demandes validées comptent dans les places.",
      pendingCount: (count: number) => `${count} en attente`,
      empty: "Aucune demande en attente.",
      emptyMessage: "Le participant n'a pas laissé de message.",
      approve: "Valider",
      reject: "Refuser",
      reviewing: "Traitement...",
      refreshError: "Actualisez la page puis réessayez.",
      missingError: "Cette demande n'existe plus ou a été modifiée.",
      permissionError:
        "Seul l'organisateur peut valider les demandes d'inscription.",
      statusError: "Ce statut d'inscription ne peut pas être validé.",
      closedError:
        "Cette activité est terminée ou annulée, les demandes ne peuvent plus être validées.",
      fullError:
        "Cette activité est complète. Aucune demande supplémentaire ne peut être validée.",
      conflictError:
        "Le nombre de places vient de changer. Actualisez puis réessayez.",
      failedError: "Échec de la validation. Réessayez plus tard.",
    },
    newActivity: {
      title: "Créer une activité",
      description:
        "Renseignez les informations, enregistrez l'activité en base, puis ouvrez sa page détail.",
    },
    editActivity: {
      title: "Modifier l'activité",
      description:
        "Seul l'organisateur peut modifier cette activité. Après enregistrement, vous reviendrez au détail.",
      forbiddenTitle: "Accès refusé",
      forbiddenDescription: "Seul l'organisateur peut modifier cette activité.",
      lockedTitle: "Activité non modifiable",
      lockedDescription:
        "Les activités terminées ou annulées ne peuvent plus être modifiées.",
    },
    profile: {
      title: "Profil",
      emailFallback: "Aucun e-mail connecté",
      createdCount: "Créées",
      participationCount: "Participations",
      errorTitle: "Échec du chargement du profil",
      errorDescription:
        "Le profil est chargé, mais les activités n'ont pas pu être récupérées. Réessayez plus tard.",
      createdTitle: "Activités créées",
      createdDescription:
        "Activités que vous avez créées. Ouvrez une carte pour revoir le détail.",
      createdEmptyTitle: "Aucune activité créée",
      createdEmptyDescription: "Votre première activité créée apparaîtra ici.",
      participationTitle: "Activités rejointes",
      participationDescription:
        "Suivez les inscriptions en attente, confirmées et annulées.",
      participationEmptyTitle: "Aucune participation",
      participationEmptyDescription:
        "Les activités rejointes apparaîtront ici avec leur statut.",
      hiddenCreated: (limit: number, count: number) =>
        `Affichage des ${limit} dernières activités créées. ${count} activités plus anciennes ne sont pas encore affichées.`,
      hiddenParticipation: (limit: number, count: number) =>
        `Affichage des ${limit} dernières participations. ${count} plus anciennes ne sont pas encore affichées.`,
      signedUpAt: (date: string) => `Inscrit le ${date}`,
      cancelledAt: (date: string) => `Annulé le ${date}`,
      participationAria: (
        title: string,
        participationStatus: string,
        activityStatus: string,
      ) =>
        `${title}, statut d'inscription : ${participationStatus}, statut de l'activité : ${activityStatus}`,
    },
    join: {
      submitting: "Envoi...",
      submitApproval: "Demander à rejoindre",
      submit: "Rejoindre",
      pendingTitle: "Demande envoyée",
      pendingDescription:
        "L'organisateur doit valider la demande avant qu'elle compte dans les participants.",
      joinedTitle: "Inscription confirmée",
      joinedDescription: "Vous êtes déjà dans la liste des participants.",
      rejectedTitle: "Demande refusée",
      rejectedDescription:
        "Vous pouvez modifier votre message et renvoyer une demande.",
      cancelledTitle: "Inscription annulée",
      cancelledDescription:
        "Vous pouvez renvoyer une demande si vos plans changent.",
      closedTitle: "Activité fermée",
      closedDescription:
        "Cette activité est terminée ou n'accepte pas d'inscriptions.",
      fullTitle: "Complet",
      fullDescription:
        "Cette activité est complète et ne peut plus accepter de participants.",
      signInTitle: "Connectez-vous pour rejoindre",
      signInDescription:
        "Connectez-vous pour envoyer une demande et partager vos informations avec l'organisateur.",
      organizerTitle: "Vous êtes l'organisateur",
      organizerDescription:
        "L'organisateur n'a pas besoin de rejoindre sa propre activité.",
      messageLabel: "Message",
      messagePlaceholder:
        "Expliquez brièvement pourquoi vous voulez participer. Facultatif.",
      messageHintApproval:
        "L'organisateur utilisera ce message pour examiner votre demande.",
      messageHint: "Ce message sera enregistré avec votre participation.",
      cancelPending: "Annulation...",
      cancel: "Annuler l'inscription",
      cancelConfirm: "Annuler votre participation ? Votre place sera libérée.",
    },
    form: {
      basicInfo: "Informations de base",
      activityContent: "Contenu",
      title: "Titre",
      titlePlaceholder: "Exemple : soirée jeux de société vendredi",
      description: "Description",
      descriptionPlaceholder:
        "Décrivez l'activité, le public et les notes utiles",
      itinerary: "Programme",
      itineraryPlaceholder:
        "18:30 Rendez-vous\n19:00 Début\n21:30 Discussion libre",
      type: "Format",
      typeHint:
        "Choisissez activité locale ou compagnon de voyage. Cela influence l'étiquette.",
      category: "Thème",
      categoryHint:
        "Choisissez d'abord un thème proposé ; utilisez Autre si nécessaire.",
      otherCategory: "Autre thème",
      otherCategoryPlaceholder:
        "Club lecture, échange linguistique, sortie photo",
      otherCategoryHint:
        "Enregistré dans la description pour aider les participants à comprendre.",
      timeLocation: "Date et lieu",
      city: "Ville",
      destination: "Destination",
      destinationPlaceholder: "Nice / Amsterdam / Londres",
      destinationHint:
        "Les voyages nécessitent une destination pour juger rapidement l'intérêt.",
      address: "Adresse",
      startAt: "Début",
      startAtHint: "Enregistré à l'heure de Paris. Doit être dans le futur.",
      endAt: "Fin",
      endAtHint: "Facultatif. Si renseignée, doit être après le début.",
      peoplePrice: "Participants et coût",
      capacity: "Capacité",
      minParticipants: "Minimum",
      minParticipantsPlaceholder: "Exemple : 4",
      priceType: "Type de coût",
      priceText: "Note de coût",
      priceTextPlaceholder:
        "Gratuit / Partage env. 10 € / Billet à payer soi-même",
      requiresApproval: "Validation requise",
      requiresApprovalHint:
        "Si activé, l'organisateur confirme manuellement les demandes.",
      creating: "Création...",
      create: "Créer l'activité",
      saving: "Enregistrement...",
      save: "Enregistrer",
      cancelEdit: "Retour au détail",
    },
    activityLabels: {
      activityAria: (title: string, date: string, location: string) =>
        `${title}. ${date}. ${location}.`,
      categories: {
        BOARD_GAME: "Jeux",
        MOVIE: "Cinéma",
        MUSIC: "Musique",
        SPORTS: "Sport",
        TRAVEL: "Voyage",
        FOOD: "Repas",
        EXHIBITION: "Expo",
        OTHER: "Autre",
      },
      statuses: {
        OPEN: "Recrutement",
        FULL: "Complet",
        DRAFT: "Brouillon",
        RECRUITING: "Recrutement",
        CONFIRMED: "Confirmé",
        ENDED: "Terminé",
        CANCELLED: "Annulé",
      },
      types: {
        PUBLIC_EVENT: "Événement public",
        USER_HOSTED: "Créé par utilisateur",
        LOCAL: "Local",
        TRIP: "Compagnon de voyage",
      },
      prices: {
        FREE: "Gratuit",
        AA: "Partage",
        FIXED: "Prix fixe",
        RANGE: "Budget",
      },
      participationStatuses: {
        JOINED: "Inscrit",
        PENDING: "En attente",
        APPROVED: "Confirmé",
        REJECTED: "Refusé",
        CANCELLED: "Annulé",
      },
      seats: {
        cancelled: "Annulé",
        ended: "Terminé",
        draft: "Fermé",
        full: "Complet",
        remaining: (count: number) => `${count} restantes`,
      },
    },
  },
} as const;

export function getCopy(locale: string) {
  return copy[(locale as AppLocale) in copy ? (locale as AppLocale) : "zh-CN"];
}

export function getSupportedLocale(locale: string): AppLocale {
  return (locale as AppLocale) in copy ? (locale as AppLocale) : "zh-CN";
}

export function getCategoryLabel(category: ActivityCategory, locale: string) {
  return getCopy(locale).activityLabels.categories[category];
}

export function getStatusLabel(status: ActivityStatus, locale: string) {
  return getCopy(locale).activityLabels.statuses[status];
}

export function getTypeLabel(type: ActivityType, locale: string) {
  return getCopy(locale).activityLabels.types[type];
}

export function getPriceTypeLabel(priceType: PriceType, locale: string) {
  return getCopy(locale).activityLabels.prices[priceType];
}

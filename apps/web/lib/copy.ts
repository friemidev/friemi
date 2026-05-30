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
      messages: "消息",
      messagesShort: "消息",
      profile: "个人空间",
      profileShort: "我的",
      signIn: "登录",
    },
    accountMenu: {
      fallbackName: "Next Fun Club 用户",
      openMenu: "打开账号菜单",
      profile: "个人空间",
      friends: "好友",
      friendsDescription: "处理好友申请和好友列表",
      messages: "消息",
      messagesDescription: "查看好友私聊和活动前沟通",
      notifications: "通知中心",
      notificationsDescription: "查看报名、审核和活动变更",
      activityOps: "活动运营",
      activityOpsDescription: "维护活动库与公共活动导入",
      merchantOps: "商家管理",
      merchantOpsDescription: "维护合作商家与场地主页",
      accountSettings: "账号设置",
      signOut: "退出登录",
    },
    common: {
      viewAll: "查看全部",
      loadFailed: "加载失败",
      retryDatabase: "暂时无法加载，请稍后再试。",
      people: "人",
      switchLanguage: (nextLanguage: string) => `切换到 ${nextLanguage}`,
    },
    globalSearch: {
      eyebrow: "全站搜索",
      title: "搜索 Next Fun Club",
      description: "快速查找活动、地点和商家。",
      inputLabel: "搜索关键词",
      placeholder: "搜索活动、地点或商家",
      mobileOpen: "打开全站搜索",
      submit: "搜索",
      emptyTitle: "输入关键词开始搜索",
      emptyDescription: "试试活动名称、地点、城市或商家名。",
      noResultsTitle: "没有找到结果",
      noResultsDescription: (query: string) =>
        `没有找到与「${query}」匹配的活动或商家。`,
      loadFailedTitle: "搜索加载失败",
      loadFailedDescription: "暂时无法搜索，请稍后再试。",
      resultSummary: (count: number, query: string) =>
        `找到 ${count} 个与「${query}」相关的结果。`,
      viewMoreActivities: (_shown: number, total: number) =>
        `查看全部 ${total} 个活动`,
      activitiesTitle: "活动",
      merchantsTitle: "商家",
      noActivityResults: "没有匹配的活动。",
      noMerchantResults: "没有匹配的商家。",
      merchantActivityCount: (count: number) => `${count} 个可展示活动`,
      openMerchant: (name: string) => `查看商家：${name}`,
    },
    auth: {
      clerkMissingTitle: "登录暂不可用",
      signInMissingDescription: "登录服务正在准备中，请稍后再试。",
      signUpMissingDescription: "注册服务正在准备中，请稍后再试。",
    },
    home: {
      eyebrow: "Paris first · 中文活动搭子",
      title: "Next Fun Club",
      tagline: "下一场，Fun 开场",
      description: "发现巴黎附近活动，约上朋友或认识新搭子一起出发。",
      browseActivities: "浏览活动",
      homeActivityFailedTitle: "活动加载失败",
      homeActivityFailedDescription: "暂时无法加载活动，请稍后再试。",
      emptyPreviewTitle: "暂无活动",
      emptyPreviewDescription: "有新活动后会显示在这里。",
      recentTitle: "最近活动",
      recentDescription: "按开始时间展示最近可参加的公开活动。",
      emptyRecentDescription: "有新的公开活动后会显示在这里。",
    },
    activities: {
      title: "活动发现",
      description:
        "优先展示正在进行和即将开始的活动，需要时再用搜索和筛选缩小范围。",
      scopeTitle: "当前展示范围",
      scopeDescription:
        "展示公开活动，默认优先显示进行中和未开始的可参与活动，已结束活动靠后。",
      emptyTitle: "暂无活动",
      emptyDescription: "当前没有可展示的公开活动，创建新活动后会显示在这里。",
      emptyFilteredTitle: "没有匹配活动",
      emptyFilteredDescription: "请放宽关键词、主题、城市或状态条件后再试。",
    },
    activityFilters: {
      title: "搜索和筛选",
      description: "按关键词、主题、城市、活动形式和进度快速缩小活动范围。",
      mobileSummary: "搜索 / 筛选",
      keywordLabel: "关键词",
      keywordPlaceholder: "搜索标题或描述，例如：电影 Paris",
      categoryLabel: "主题",
      cityLabel: "城市",
      typeLabel: "活动形式",
      timeStateLabel: "活动进度",
      sortLabel: "日期排序",
      allCategories: "全部主题",
      allCities: "全部城市",
      allTypes: "全部形式",
      allTimeStates: "全部进度",
      sortRecommended: "推荐排序",
      sortSoonest: "从近到远",
      sortLatest: "从远到近",
      apply: "搜索",
      reset: "重置",
      activeKeyword: (keyword: string) => `关键词：${keyword}`,
      removeFilter: (label: string) => `移除筛选：${label}`,
      resultCount: (count: number) => `${count} 个结果`,
    },
    activityPagination: {
      previous: "上一页",
      next: "下一页",
      pageSummary: (page: number, totalPages: number) =>
        `第 ${page} / ${totalPages} 页`,
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
      locationMapTitle: "活动地点",
      openMap: "打开地图",
    },
    activityFriendSignal: {
      title: "好友也在",
      cardSummary: (count: number) => `${count} 位好友已报名`,
      detailSummary: (names: string[], count: number) => {
        if (names.length === 0) {
          return `${count} 位好友已报名`;
        }

        if (count > names.length) {
          return `${names.join("、")} 等 ${count} 位好友已报名`;
        }

        return `${names.join("、")} 已报名`;
      },
      showMore: "查看更多",
      showAllLabel: (count: number) => `查看全部 ${count} 位好友`,
      showLess: "收起",
    },
    activityShare: {
      title: "分享活动",
      description: "复制关键信息，或下载带二维码的宣传图。",
      copyTitle: "复制标题",
      copyTime: "复制时间",
      copyLocation: "复制地点",
      copyPrice: "复制费用",
      copyLink: "复制链接",
      copied: "已复制",
      copyFailed: "复制失败，请手动选择文本。",
      downloadPoster: "下载宣传图",
      downloading: "生成中...",
      downloadFailed: "宣传图生成失败，请稍后重试。",
      posterTime: "时间",
      posterLocation: "地点",
      posterPrice: "费用",
      posterScanTitle: "扫码查看活动详情",
      posterScanDescription: "打开报名页，查看最新名额和活动说明。",
      posterPreviewAlt: "活动宣传图预览",
    },
    merchant: {
      cardLabel: (name: string) => `商家：${name}`,
      detailTitle: "合作商家",
      viewProfile: "查看商家主页",
      profileEyebrow: "商家主页",
      city: "城市",
      address: "地址",
      coordinates: "坐标",
      website: "官网",
      contact: "联系邮箱",
      totalActivities: (count: number) => `${count} 个关联活动`,
      upcomingActivities: (count: number) => `${count} 个可报名活动`,
      activitiesTitle: "商家活动",
      activitiesDescription: (name: string) =>
        `${name} 当前公开招募或已成团的活动。`,
      emptyTitle: "暂无公开活动",
      emptyDescription: "这个商家暂时没有公开招募或已成团的活动。",
    },
    activityComments: {
      title: "评论与提问",
      description: "可以向发起人提问、补充建议，或活动后留下评价。",
      signInTitle: "登录后评论",
      signInDescription: "登录后可以在活动详情页提问或发表建议。",
      emptyTitle: "暂无评论",
      emptyDescription: "成为第一个提问或补充信息的人。",
      typeLabel: "类型",
      contentLabel: "内容",
      contentPlaceholder: "写下你的问题、建议或活动评价",
      contentHint: "最多 500 个字，公开显示在活动详情页。",
      submit: "发布评论",
      submitting: "发布中...",
      pinned: "发起人置顶",
      justNow: "刚刚",
      formError: "请检查评论内容后再提交。",
      authError: "请登录后再评论。",
      activityError: "活动不存在或暂不可评论。",
      failedError: "评论发布失败，请稍后重试。",
      types: {
        QUESTION: "提问",
        SUGGESTION: "建议",
        REVIEW: "评价",
      },
    },
    notifications: {
      title: "通知中心",
      description: "查看报名提交、审核结果和活动取消提醒。",
      unreadCount: (count: number) => `${count} 条未读`,
      allRead: "全部已读",
      markAllRead: "全部标为已读",
      markOneRead: "标为已读",
      emptyTitle: "暂无通知",
      emptyDescription: "报名、审核和活动变更提醒会显示在这里。",
      openActivity: "查看活动",
      openMessages: "去处理",
      openReview: "去审核",
      fallbackActivity: "相关活动",
      read: "已读",
      unread: "未读",
      types: {
        PARTICIPATION_PENDING: {
          title: "报名已提交",
          body: (activityTitle: string, actorName?: string) =>
            actorName
              ? `${actorName}申请参加「${activityTitle}」，等待你审核。`
              : `你已提交「${activityTitle}」的报名申请，等待发起人审核。`,
        },
        PARTICIPATION_CONFIRMED: {
          title: "报名成功",
          body: (activityTitle: string) => `你已成功报名「${activityTitle}」。`,
        },
        PARTICIPATION_APPROVED: {
          title: "报名已通过",
          body: (activityTitle: string, actorName = "发起人") =>
            `${actorName}已通过你对「${activityTitle}」的报名申请。`,
        },
        PARTICIPATION_REJECTED: {
          title: "报名未通过",
          body: (activityTitle: string, actorName = "发起人") =>
            `${actorName}未通过你对「${activityTitle}」的报名申请。`,
        },
        ACTIVITY_CANCELLED: {
          title: "活动已取消",
          body: (activityTitle: string, actorName = "发起人") =>
            `${actorName}已取消「${activityTitle}」。`,
        },
        ACTIVITY_UPDATED: {
          title: "活动信息已更新",
          body: (activityTitle: string, actorName = "发起人") =>
            `${actorName}更新了「${activityTitle}」的时间或地点。`,
        },
        FRIEND_REQUEST: {
          title: "新的好友申请",
          body: (_activityTitle: string, actorName = "有人") =>
            `${actorName}想添加你为好友。`,
        },
      },
    },
    activityOwner: {
      title: "发起人操作",
      cancel: "取消活动",
      cancelling: "取消中...",
      cancelDescription: "取消后活动会从列表隐藏，用户不能继续报名。",
      cancelConfirm: "确定要取消这个活动吗？取消后用户将不能继续报名。",
      cancelledHint: "活动已取消，用户无法继续报名。",
      endedHint: "活动已结束，不能再取消。",
      refreshError: "请稍后再试。",
      permissionError: "只有活动发起人可以取消这个活动。",
      statusError: "当前活动状态不能取消。",
      endedError: "活动已结束，不能再取消。",
      conflictError: "活动状态已更新，请稍后再试。",
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
      refreshError: "请稍后再试。",
      missingError: "报名记录不存在或已更新。",
      permissionError: "只有活动发起人可以审核报名。",
      statusError: "当前报名状态不能审核。",
      closedError: "活动已结束或已取消，不能继续审核。",
      fullError: "活动名额已满，不能继续通过报名。",
      conflictError: "报名人数已更新，请稍后再试。",
      failedError: "审核报名失败，请稍后重试。",
    },
    newActivity: {
      title: "发起活动",
      description: "填写信息后发布活动，发布后会进入详情页。",
    },
    editActivity: {
      title: "编辑活动",
      description: "修改活动信息，保存后回到详情页。",
      forbiddenTitle: "无权编辑",
      forbiddenDescription: "只有活动发起人可以编辑这个活动。",
      lockedTitle: "活动不可编辑",
      lockedDescription: "已结束或已取消的活动不能继续编辑。",
    },
    profile: {
      title: "个人空间",
      emailFallback: "未绑定邮箱",
      friendCodeLabel: "好友号",
      copyFriendCode: "复制好友号",
      friendCodeCopied: "已复制",
      nicknameLabel: "昵称",
      nicknamePlaceholder: "输入你的昵称",
      nicknameSetupTitle: "先设置昵称",
      nicknameSetupDescription:
        "别人只会看到这个昵称和好友号，不会显示你的 Google 姓名或邮箱。",
      saveNickname: "保存昵称",
      savingNickname: "保存中...",
      nicknameError: "昵称不能为空，最多 24 个字。",
      createdCount: "发起活动",
      participationCount: "参加活动",
      errorTitle: "个人空间加载失败",
      errorDescription: "部分内容暂时无法加载，请稍后再试。",
      createdTitle: "发起的活动",
      createdDescription: "",
      createdEmptyTitle: "暂无发起活动",
      createdEmptyDescription: "有活动后会显示在这里。",
      participationTitle: "参加的活动",
      participationDescription: "",
      participationEmptyTitle: "暂无参加记录",
      participationEmptyDescription: "参加活动后会显示在这里。",
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
      coverImage: "封面图片",
      coverDefault: "使用默认活动封面",
      coverImageHint: "上传后会展示在活动卡片和详情页顶部。",
      coverFileHint: "支持 JPG、PNG、WebP，最大 4MB。",
      coverUpload: "上传封面",
      coverDropHere: "松开即可上传",
      coverUploading: "上传中...",
      coverRemove: "移除",
      coverUploadFailed: "封面上传失败，请稍后重试。",
      coverTypeError: "只支持 JPG、PNG 或 WebP 图片。",
      coverSizeError: "图片不能超过 4MB。",
      coverInvalidContentError: "图片内容无效，请重新选择原始图片。",
      coverStorageConfigError: "图片上传暂不可用，请稍后再试。",
      linkImportTitle: "从链接导入",
      linkImportDescription:
        "粘贴支持的网站链接，先预览可识别信息，再套用到创建表单。",
      linkImportPlaceholder:
        "https://meetup.com/.../events/... 或 https://www.eventbrite.fr/e/...",
      linkImportSupportedSitesTitle: "支持的网站",
      linkImportSupportedSitesClose: "关闭",
      linkImportSupportedSitesAriaLabel: "查看支持的网站列表",
      linkImportSupportedSiteExamples:
        "例如：meetup.com、eventbrite.fr、sortiraparis.com、playinparis.com、quefaire.paris.fr",
      linkImportPreview: "解析链接",
      linkImportParsing: "解析中...",
      linkImportApply: "套用到表单",
      linkImportApplied: "已套用到表单，请继续检查必填信息后再发布。",
      linkImportUntitled: "未识别标题",
      linkImportMissingAddress: "未识别地点",
      linkImportMissingFields: (count: number) =>
        `还有 ${count} 项需要手动补充。`,
      linkImportErrors: {
        INVALID_URL: "请输入有效的 https 链接。",
        UNSUPPORTED_HOST:
          "暂不支持这个网站。请先使用 Paris.fr、Que Faire à Paris、Sortir à Paris、Play in Paris、Eventbrite、Billetweb 或 Meetup 链接。",
        UNSUPPORTED_CONTENT: "这个链接不是可解析的活动页面。",
        FETCH_FAILED: "链接解析失败，请稍后重试或手动填写。",
        UNAUTHORIZED: "请登录后再解析链接。",
      },
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
      placePickerTitle: "地图定位",
      placePickerHint:
        "根据城市和地址匹配坐标；保存后活动详情页会显示地图位置。",
      placeSearch: "匹配地点",
      placeSearching: "匹配中...",
      placeSearchNeedAddress: "请先填写地址，再匹配地图位置。",
      placeSearchEmpty: "没有找到匹配地点，可以补充更完整地址后重试。",
      placeSearchFailed: "地点匹配失败，请稍后重试。",
      placeSearchResults: "选择一个匹配结果",
      placeSelected: "已选择坐标",
      placeChangedClear: "地址已变更，请重新匹配地图位置。",
      placeClear: "清除",
      mapPreviewTitle: "地图预览",
      openMap: "打开地图",
      startAt: "开始时间",
      startAtHint:
        "按巴黎时间保存。若填写结束时间且晚于现在，开始时间可早于当前时间。",
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
        OPEN: "可参与",
        FULL: "已满员",
        DRAFT: "草稿",
        RECRUITING: "可参与",
        CONFIRMED: "可参与",
        ENDED: "已结束",
        CANCELLED: "已取消",
      },
      timeStates: {
        ONGOING: "进行中",
        UPCOMING: "未开始",
        ENDED: "已结束",
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
      messages: "Messages",
      messagesShort: "Chat",
      profile: "Profile",
      profileShort: "Me",
      signIn: "Sign in",
    },
    accountMenu: {
      fallbackName: "Next Fun Club user",
      openMenu: "Open account menu",
      profile: "Profile",
      friends: "Friends",
      friendsDescription: "Requests and friend list",
      messages: "Messages",
      messagesDescription: "Open friend chats and activity planning",
      notifications: "Notifications",
      notificationsDescription: "Review joins, approvals, and activity changes",
      activityOps: "Activity operations",
      activityOpsDescription: "Maintain activities and public imports",
      merchantOps: "Merchant management",
      merchantOpsDescription: "Maintain partner and venue profiles",
      accountSettings: "Account settings",
      signOut: "Sign out",
    },
    common: {
      viewAll: "View all",
      loadFailed: "Load failed",
      retryDatabase: "Unable to load right now. Try again later.",
      people: "people",
      switchLanguage: (nextLanguage: string) => `Switch to ${nextLanguage}`,
    },
    globalSearch: {
      eyebrow: "Site search",
      title: "Search Next Fun Club",
      description: "Find activities, places, and merchants quickly.",
      inputLabel: "Search keyword",
      placeholder: "Search activities, places, or merchants",
      mobileOpen: "Open site search",
      submit: "Search",
      emptyTitle: "Enter a keyword to search",
      emptyDescription:
        "Try an activity name, place, city, or merchant name.",
      noResultsTitle: "No results found",
      noResultsDescription: (query: string) =>
        `No activities or merchants matched "${query}".`,
      loadFailedTitle: "Search failed to load",
      loadFailedDescription: "Search is unavailable right now. Try again later.",
      resultSummary: (count: number, query: string) =>
        `${count} result${count === 1 ? "" : "s"} found for "${query}".`,
      viewMoreActivities: (_shown: number, total: number) =>
        `View all ${total} activities`,
      activitiesTitle: "Activities",
      merchantsTitle: "Merchants",
      noActivityResults: "No matching activities.",
      noMerchantResults: "No matching merchants.",
      merchantActivityCount: (count: number) =>
        `${count} visible activit${count === 1 ? "y" : "ies"}`,
      openMerchant: (name: string) => `Open merchant: ${name}`,
    },
    auth: {
      clerkMissingTitle: "Sign-in is unavailable",
      signInMissingDescription: "Sign-in is being prepared. Try again later.",
      signUpMissingDescription: "Sign-up is being prepared. Try again later.",
    },
    home: {
      eyebrow: "Paris first · Chinese-speaking activity crews",
      title: "Next Fun Club",
      tagline: "What's next? Fun begins.",
      description:
        "Discover nearby Paris activities, bring friends, or meet new activity buddies.",
      browseActivities: "Browse activities",
      homeActivityFailedTitle: "Activities failed to load",
      homeActivityFailedDescription:
        "Activities are unavailable right now. Try again later.",
      emptyPreviewTitle: "No activities yet",
      emptyPreviewDescription:
        "Joinable activities will appear here once they are added.",
      recentTitle: "Recent activities",
      recentDescription:
        "Upcoming public activities sorted by the nearest start time.",
      emptyRecentDescription: "New public activities will appear here.",
    },
    activities: {
      title: "Activity discovery",
      description:
        "Ongoing and upcoming activities come first. Search or filter when you need a narrower list.",
      scopeTitle: "Current scope",
      scopeDescription:
        "Showing public activities, with ongoing and upcoming joinable activities first and ended activities later.",
      emptyTitle: "No activities",
      emptyDescription:
        "There are no public activities to show right now. New activities will appear here.",
      emptyFilteredTitle: "No matching activities",
      emptyFilteredDescription:
        "Try a broader keyword, topic, city, or status filter.",
    },
    activityFilters: {
      title: "Search and filters",
      description:
        "Narrow activities by keyword, topic, city, format, and timing.",
      mobileSummary: "Search / Filter",
      keywordLabel: "Keyword",
      keywordPlaceholder: "Search title or description, e.g. film Paris",
      categoryLabel: "Topic",
      cityLabel: "City",
      typeLabel: "Format",
      timeStateLabel: "Timing",
      sortLabel: "Date order",
      allCategories: "All topics",
      allCities: "All cities",
      allTypes: "All formats",
      allTimeStates: "All timing",
      sortRecommended: "Recommended",
      sortSoonest: "Soonest first",
      sortLatest: "Latest first",
      apply: "Search",
      reset: "Reset",
      activeKeyword: (keyword: string) => `Keyword: ${keyword}`,
      removeFilter: (label: string) => `Remove filter: ${label}`,
      resultCount: (count: number) =>
        `${count} result${count === 1 ? "" : "s"}`,
    },
    activityPagination: {
      previous: "Previous",
      next: "Next",
      pageSummary: (page: number, totalPages: number) =>
        `Page ${page} / ${totalPages}`,
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
      locationMapTitle: "Activity location",
      openMap: "Open map",
    },
    activityFriendSignal: {
      title: "Friends joining",
      cardSummary: (count: number) =>
        `${count} friend${count === 1 ? "" : "s"} joined`,
      detailSummary: (names: string[], count: number) => {
        if (names.length === 0) {
          return `${count} friend${count === 1 ? "" : "s"} joined`;
        }

        if (count > names.length) {
          return `${names.join(", ")} and others joined (${count} friends)`;
        }

        return `${names.join(", ")} joined`;
      },
      showMore: "More",
      showAllLabel: (count: number) => `Show all ${count} friends`,
      showLess: "Collapse",
    },
    activityShare: {
      title: "Share activity",
      description: "Copy key details, or download a poster with a QR code.",
      copyTitle: "Copy title",
      copyTime: "Copy time",
      copyLocation: "Copy location",
      copyPrice: "Copy cost",
      copyLink: "Copy link",
      copied: "Copied",
      copyFailed: "Copy failed. Select the text manually.",
      downloadPoster: "Download poster",
      downloading: "Generating...",
      downloadFailed: "Poster generation failed. Try again later.",
      posterTime: "Time",
      posterLocation: "Location",
      posterPrice: "Cost",
      posterScanTitle: "Scan to view details",
      posterScanDescription:
        "Open the activity page for the latest seats and details.",
      posterPreviewAlt: "Activity poster preview",
    },
    merchant: {
      cardLabel: (name: string) => `Merchant: ${name}`,
      detailTitle: "Partner merchant",
      viewProfile: "View merchant page",
      profileEyebrow: "Merchant page",
      city: "City",
      address: "Address",
      coordinates: "Coordinates",
      website: "Website",
      contact: "Contact email",
      totalActivities: (count: number) => `${count} linked activities`,
      upcomingActivities: (count: number) => `${count} joinable activities`,
      activitiesTitle: "Merchant activities",
      activitiesDescription: (name: string) =>
        `Public recruiting or confirmed activities linked to ${name}.`,
      emptyTitle: "No public activities",
      emptyDescription:
        "This merchant has no public recruiting or confirmed activities right now.",
    },
    activityComments: {
      title: "Comments and questions",
      description:
        "Ask the organizer, add suggestions, or leave a review later.",
      signInTitle: "Sign in to comment",
      signInDescription: "Sign in to ask questions or share suggestions.",
      emptyTitle: "No comments yet",
      emptyDescription: "Be the first to ask a question or add useful context.",
      typeLabel: "Type",
      contentLabel: "Message",
      contentPlaceholder: "Write your question, suggestion, or review",
      contentHint: "Up to 500 characters, visible on the activity detail page.",
      submit: "Post comment",
      submitting: "Posting...",
      pinned: "Pinned by organizer",
      justNow: "Just now",
      formError: "Check your comment before posting.",
      authError: "Sign in before commenting.",
      activityError: "This activity does not exist or cannot receive comments.",
      failedError: "Failed to post comment. Try again later.",
      types: {
        QUESTION: "Question",
        SUGGESTION: "Suggestion",
        REVIEW: "Review",
      },
    },
    notifications: {
      title: "Notifications",
      description:
        "Review join submissions, review results, and cancellations.",
      unreadCount: (count: number) => `${count} unread`,
      allRead: "All read",
      markAllRead: "Mark all as read",
      markOneRead: "Mark read",
      emptyTitle: "No notifications",
      emptyDescription:
        "Join, review, and activity change alerts will appear here.",
      openActivity: "Open activity",
      openMessages: "Review",
      openReview: "Review",
      fallbackActivity: "Related activity",
      read: "Read",
      unread: "Unread",
      types: {
        PARTICIPATION_PENDING: {
          title: "Request submitted",
          body: (activityTitle: string, actorName?: string) =>
            actorName
              ? `${actorName} asked to join "${activityTitle}".`
              : `Your request for "${activityTitle}" was submitted and is waiting for organizer review.`,
        },
        PARTICIPATION_CONFIRMED: {
          title: "Join confirmed",
          body: (activityTitle: string) =>
            `You have joined "${activityTitle}".`,
        },
        PARTICIPATION_APPROVED: {
          title: "Join request approved",
          body: (activityTitle: string, actorName = "The organizer") =>
            `${actorName} approved your request for "${activityTitle}".`,
        },
        PARTICIPATION_REJECTED: {
          title: "Join request declined",
          body: (activityTitle: string, actorName = "The organizer") =>
            `${actorName} declined your request for "${activityTitle}".`,
        },
        ACTIVITY_CANCELLED: {
          title: "Activity cancelled",
          body: (activityTitle: string, actorName = "The organizer") =>
            `${actorName} cancelled "${activityTitle}".`,
        },
        ACTIVITY_UPDATED: {
          title: "Activity updated",
          body: (activityTitle: string, actorName = "The organizer") =>
            `${actorName} updated the time or location for "${activityTitle}".`,
        },
        FRIEND_REQUEST: {
          title: "New friend request",
          body: (_activityTitle: string, actorName = "Someone") =>
            `${actorName} wants to add you as a friend.`,
        },
      },
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
      refreshError: "Try again later.",
      permissionError: "Only the organizer can cancel this activity.",
      statusError: "This activity status cannot be cancelled.",
      endedError: "This activity has ended and can no longer be cancelled.",
      conflictError: "The activity status changed. Try again later.",
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
      refreshError: "Try again later.",
      missingError: "This request no longer exists or was updated.",
      permissionError: "Only the organizer can review participation requests.",
      statusError: "This request status cannot be reviewed.",
      closedError:
        "This activity has ended or been cancelled, so requests cannot be reviewed.",
      fullError: "This activity is full. No more requests can be approved.",
      conflictError: "Seat availability changed. Try again later.",
      failedError: "Failed to review this request. Try again later.",
    },
    newActivity: {
      title: "Create activity",
      description:
        "Add the details, publish the activity, then review the detail page.",
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
      friendCodeLabel: "Friend code",
      copyFriendCode: "Copy friend code",
      friendCodeCopied: "Copied",
      nicknameLabel: "Nickname",
      nicknamePlaceholder: "Enter your nickname",
      nicknameSetupTitle: "Set your nickname",
      nicknameSetupDescription:
        "Others will see this nickname and your friend code, not your Google name or email.",
      saveNickname: "Save nickname",
      savingNickname: "Saving...",
      nicknameError: "Nickname is required, up to 24 characters.",
      createdCount: "Created",
      participationCount: "Joined",
      errorTitle: "Profile failed to load",
      errorDescription: "Some profile content is unavailable. Try again later.",
      createdTitle: "Created activities",
      createdDescription: "",
      createdEmptyTitle: "No created activities",
      createdEmptyDescription: "Activities will appear here.",
      participationTitle: "Joined activities",
      participationDescription: "",
      participationEmptyTitle: "No participation records",
      participationEmptyDescription: "Joined activities will appear here.",
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
      coverImage: "Cover image",
      coverDefault: "Use the default activity cover",
      coverImageHint:
        "Uploaded images appear on activity cards and detail pages.",
      coverFileHint: "JPG, PNG, or WebP. Max 4MB.",
      coverUpload: "Upload cover",
      coverDropHere: "Drop to upload",
      coverUploading: "Uploading...",
      coverRemove: "Remove",
      coverUploadFailed: "Cover upload failed. Please try again later.",
      coverTypeError: "Only JPG, PNG, or WebP images are supported.",
      coverSizeError: "Image must be 4MB or smaller.",
      coverInvalidContentError:
        "The image content is invalid. Please choose the original image file.",
      coverStorageConfigError:
        "Image upload is unavailable right now. Try again later.",
      linkImportTitle: "Import from link",
      linkImportDescription:
        "Paste a supported activity page, preview detected details, then apply them to the form.",
      linkImportPlaceholder:
        "https://meetup.com/.../events/... or https://www.eventbrite.fr/e/...",
      linkImportSupportedSitesTitle: "Supported websites",
      linkImportSupportedSitesClose: "Close",
      linkImportSupportedSitesAriaLabel: "View supported websites",
      linkImportSupportedSiteExamples:
        "Examples: meetup.com, eventbrite.fr, sortiraparis.com, playinparis.com, quefaire.paris.fr",
      linkImportPreview: "Preview link",
      linkImportParsing: "Parsing...",
      linkImportApply: "Apply to form",
      linkImportApplied:
        "Applied to the form. Review required fields before publishing.",
      linkImportUntitled: "Title not found",
      linkImportMissingAddress: "Place not found",
      linkImportMissingFields: (count: number) =>
        `${count} item(s) still need manual input.`,
      linkImportErrors: {
        INVALID_URL: "Enter a valid https link.",
        UNSUPPORTED_HOST:
          "This website is not supported yet. Use Paris.fr, Que Faire a Paris, Sortir a Paris, Play in Paris, Eventbrite, Billetweb, or Meetup.",
        UNSUPPORTED_CONTENT: "This link is not a parsable activity page.",
        FETCH_FAILED:
          "Failed to parse the link. Try again later or fill the form manually.",
        UNAUTHORIZED: "Sign in before parsing a link.",
      },
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
      placePickerTitle: "Map location",
      placePickerHint:
        "Match coordinates from the city and address. The detail page will show a map after saving.",
      placeSearch: "Match place",
      placeSearching: "Matching...",
      placeSearchNeedAddress: "Add an address before matching the map point.",
      placeSearchEmpty:
        "No matching place found. Try again with a more complete address.",
      placeSearchFailed: "Place matching failed. Try again later.",
      placeSearchResults: "Choose a matching result",
      placeSelected: "Selected coordinates",
      placeChangedClear: "The address changed. Match the map point again.",
      placeClear: "Clear",
      mapPreviewTitle: "Map preview",
      openMap: "Open map",
      startAt: "Start time",
      startAtHint:
        "Saved in Paris time. If the end time is in the future, the start time may be in the past.",
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
        OPEN: "Joinable",
        FULL: "Full",
        DRAFT: "Draft",
        RECRUITING: "Joinable",
        CONFIRMED: "Joinable",
        ENDED: "Ended",
        CANCELLED: "Cancelled",
      },
      timeStates: {
        ONGOING: "Ongoing",
        UPCOMING: "Upcoming",
        ENDED: "Ended",
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
      messages: "Messages",
      messagesShort: "Chat",
      profile: "Profil",
      profileShort: "Moi",
      signIn: "Connexion",
    },
    accountMenu: {
      fallbackName: "Utilisateur Next Fun Club",
      openMenu: "Ouvrir le menu du compte",
      profile: "Profil",
      friends: "Amis",
      friendsDescription: "Gérer demandes et liste d'amis",
      messages: "Messages",
      messagesDescription: "Ouvrir les échanges avec vos amis",
      notifications: "Notifications",
      notificationsDescription:
        "Suivre inscriptions, validations et changements d'activité",
      activityOps: "Opérations activités",
      activityOpsDescription: "Gérer les activités et les imports publics",
      merchantOps: "Gestion partenaires",
      merchantOpsDescription: "Gérer les profils de partenaires et lieux",
      accountSettings: "Paramètres du compte",
      signOut: "Déconnexion",
    },
    common: {
      viewAll: "Tout voir",
      loadFailed: "Échec du chargement",
      retryDatabase: "Chargement impossible pour le moment. Réessayez plus tard.",
      people: "pers.",
      switchLanguage: (nextLanguage: string) => `Passer en ${nextLanguage}`,
    },
    globalSearch: {
      eyebrow: "Recherche globale",
      title: "Rechercher dans Next Fun Club",
      description: "Trouvez vite une activité, un lieu ou un partenaire.",
      inputLabel: "Mot-clé de recherche",
      placeholder: "Activités, lieux ou partenaires",
      mobileOpen: "Ouvrir la recherche globale",
      submit: "Rechercher",
      emptyTitle: "Saisissez un mot-clé",
      emptyDescription:
        "Essayez un nom d'activité, un lieu, une ville ou un partenaire.",
      noResultsTitle: "Aucun résultat",
      noResultsDescription: (query: string) =>
        `Aucune activité ni partenaire ne correspond à « ${query} ».`,
      loadFailedTitle: "Échec de la recherche",
      loadFailedDescription:
        "La recherche est indisponible pour le moment. Réessayez plus tard.",
      resultSummary: (count: number, query: string) =>
        `${count} résultat${count > 1 ? "s" : ""} pour « ${query} ».`,
      viewMoreActivities: (_shown: number, total: number) =>
        `Voir les ${total} activités`,
      activitiesTitle: "Activités",
      merchantsTitle: "Partenaires",
      noActivityResults: "Aucune activité correspondante.",
      noMerchantResults: "Aucun partenaire correspondant.",
      merchantActivityCount: (count: number) =>
        `${count} activité${count > 1 ? "s" : ""} visible${count > 1 ? "s" : ""}`,
      openMerchant: (name: string) => `Voir le partenaire : ${name}`,
    },
    auth: {
      clerkMissingTitle: "Connexion indisponible",
      signInMissingDescription:
        "La connexion est en préparation. Réessayez plus tard.",
      signUpMissingDescription:
        "L'inscription est en préparation. Réessayez plus tard.",
    },
    home: {
      eyebrow: "Paris d'abord · activités sinophones",
      title: "Next Fun Club",
      tagline: "La prochaine sortie commence ici.",
      description:
        "Découvrez des activités à Paris, venez avec vos amis ou rencontrez de nouveaux compagnons de sortie.",
      browseActivities: "Voir les activités",
      homeActivityFailedTitle: "Échec du chargement",
      homeActivityFailedDescription:
        "Les activités sont indisponibles pour le moment. Réessayez plus tard.",
      emptyPreviewTitle: "Aucune activité",
      emptyPreviewDescription: "Les activités en recrutement apparaîtront ici.",
      recentTitle: "Activités récentes",
      recentDescription:
        "Activités publiques à venir, triées par date de début proche.",
      emptyRecentDescription: "Les nouvelles activités publiques apparaîtront ici.",
    },
    activities: {
      title: "Découvrir des activités",
      description:
        "Les activités en cours et à venir passent d'abord. Recherchez ou filtrez pour affiner.",
      scopeTitle: "Périmètre affiché",
      scopeDescription:
        "Activités publiques, avec les activités en cours ou à venir d'abord, puis les activités terminées.",
      emptyTitle: "Aucune activité",
      emptyDescription:
        "Aucune activité publique à afficher pour le moment. Les nouvelles activités apparaîtront ici.",
      emptyFilteredTitle: "Aucune activité trouvée",
      emptyFilteredDescription:
        "Essayez un mot-clé, un thème, une ville ou un statut plus large.",
    },
    activityFilters: {
      title: "Recherche et filtres",
      description:
        "Affinez les activités par mot-clé, thème, ville, format et avancement.",
      mobileSummary: "Recherche / Filtre",
      keywordLabel: "Mot-clé",
      keywordPlaceholder: "Titre ou description, ex. film Paris",
      categoryLabel: "Thème",
      cityLabel: "Ville",
      typeLabel: "Format",
      timeStateLabel: "Avancement",
      sortLabel: "Tri par date",
      allCategories: "Tous les thèmes",
      allCities: "Toutes les villes",
      allTypes: "Tous les formats",
      allTimeStates: "Tous les états",
      sortRecommended: "Recommandé",
      sortSoonest: "Plus proche",
      sortLatest: "Plus lointain",
      apply: "Rechercher",
      reset: "Réinitialiser",
      activeKeyword: (keyword: string) => `Mot-clé : ${keyword}`,
      removeFilter: (label: string) => `Retirer le filtre : ${label}`,
      resultCount: (count: number) =>
        `${count} résultat${count > 1 ? "s" : ""}`,
    },
    activityPagination: {
      previous: "Précédent",
      next: "Suivant",
      pageSummary: (page: number, totalPages: number) =>
        `Page ${page} / ${totalPages}`,
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
      locationMapTitle: "Lieu de l'activité",
      openMap: "Ouvrir la carte",
    },
    activityFriendSignal: {
      title: "Amis inscrits",
      cardSummary: (count: number) =>
        `${count} ami${count > 1 ? "s" : ""} inscrit${count > 1 ? "s" : ""}`,
      detailSummary: (names: string[], count: number) => {
        if (names.length === 0) {
          return `${count} ami${count > 1 ? "s" : ""} inscrit${count > 1 ? "s" : ""}`;
        }

        if (count > names.length) {
          return `${names.join(", ")} et d'autres amis sont inscrits (${count})`;
        }

        return `${names.join(", ")} ${names.length > 1 ? "sont inscrits" : "est inscrit"}`;
      },
      showMore: "Plus",
      showAllLabel: (count: number) => `Voir les ${count} amis`,
      showLess: "Réduire",
    },
    activityShare: {
      title: "Partager l'activité",
      description:
        "Copiez les infos clés ou téléchargez une affiche avec QR code.",
      copyTitle: "Copier le titre",
      copyTime: "Copier l'heure",
      copyLocation: "Copier le lieu",
      copyPrice: "Copier le coût",
      copyLink: "Copier le lien",
      copied: "Copié",
      copyFailed: "Échec de copie. Sélectionnez le texte manuellement.",
      downloadPoster: "Télécharger l'affiche",
      downloading: "Génération...",
      downloadFailed: "Échec de génération. Réessayez plus tard.",
      posterTime: "Heure",
      posterLocation: "Lieu",
      posterPrice: "Coût",
      posterScanTitle: "Scannez pour voir les détails",
      posterScanDescription:
        "Ouvrez la page de l'activité pour les places et infos à jour.",
      posterPreviewAlt: "Aperçu de l'affiche de l'activité",
    },
    merchant: {
      cardLabel: (name: string) => `Commerçant : ${name}`,
      detailTitle: "Partenaire",
      viewProfile: "Voir la page partenaire",
      profileEyebrow: "Page partenaire",
      city: "Ville",
      address: "Adresse",
      coordinates: "Coordonnées",
      website: "Site web",
      contact: "E-mail de contact",
      totalActivities: (count: number) => `${count} activités associées`,
      upcomingActivities: (count: number) => `${count} activités accessibles`,
      activitiesTitle: "Activités du partenaire",
      activitiesDescription: (name: string) =>
        `Activités publiques en recrutement ou confirmées liées à ${name}.`,
      emptyTitle: "Aucune activité publique",
      emptyDescription:
        "Ce partenaire n'a pas encore d'activité publique en recrutement ou confirmée.",
    },
    activityComments: {
      title: "Commentaires et questions",
      description:
        "Posez une question à l'organisateur, ajoutez une suggestion ou laissez un avis.",
      signInTitle: "Connectez-vous pour commenter",
      signInDescription:
        "Connectez-vous pour poser une question ou partager une suggestion.",
      emptyTitle: "Aucun commentaire",
      emptyDescription:
        "Soyez la première personne à poser une question ou ajouter une information utile.",
      typeLabel: "Type",
      contentLabel: "Message",
      contentPlaceholder: "Écrivez votre question, suggestion ou avis",
      contentHint: "500 caractères maximum, visible sur la page de l'activité.",
      submit: "Publier",
      submitting: "Publication...",
      pinned: "Épinglé par l'organisateur",
      justNow: "À l'instant",
      formError: "Vérifiez votre commentaire avant de publier.",
      authError: "Connectez-vous avant de commenter.",
      activityError:
        "Cette activité n'existe pas ou ne peut pas recevoir de commentaires.",
      failedError: "Échec de publication. Réessayez plus tard.",
      types: {
        QUESTION: "Question",
        SUGGESTION: "Suggestion",
        REVIEW: "Avis",
      },
    },
    notifications: {
      title: "Notifications",
      description:
        "Suivez les demandes d'inscription, validations et annulations.",
      unreadCount: (count: number) => `${count} non lues`,
      allRead: "Tout est lu",
      markAllRead: "Tout marquer comme lu",
      markOneRead: "Marquer lu",
      emptyTitle: "Aucune notification",
      emptyDescription:
        "Les alertes d'inscription, validation et changement d'activité apparaîtront ici.",
      openActivity: "Voir l'activité",
      openMessages: "Traiter",
      openReview: "Valider",
      fallbackActivity: "Activité liée",
      read: "Lu",
      unread: "Non lu",
      types: {
        PARTICIPATION_PENDING: {
          title: "Demande envoyée",
          body: (activityTitle: string, actorName?: string) =>
            actorName
              ? `${actorName} souhaite rejoindre « ${activityTitle} ».`
              : `Votre demande pour « ${activityTitle} » a été envoyée et attend la validation de l'organisateur.`,
        },
        PARTICIPATION_CONFIRMED: {
          title: "Inscription confirmée",
          body: (activityTitle: string) =>
            `Vous êtes inscrit à « ${activityTitle} ».`,
        },
        PARTICIPATION_APPROVED: {
          title: "Demande acceptée",
          body: (activityTitle: string, actorName = "L'organisateur") =>
            `${actorName} a accepté votre demande pour « ${activityTitle} ».`,
        },
        PARTICIPATION_REJECTED: {
          title: "Demande refusée",
          body: (activityTitle: string, actorName = "L'organisateur") =>
            `${actorName} a refusé votre demande pour « ${activityTitle} ».`,
        },
        ACTIVITY_CANCELLED: {
          title: "Activité annulée",
          body: (activityTitle: string, actorName = "L'organisateur") =>
            `${actorName} a annulé « ${activityTitle} ».`,
        },
        ACTIVITY_UPDATED: {
          title: "Activité mise à jour",
          body: (activityTitle: string, actorName = "L'organisateur") =>
            `${actorName} a modifié l'heure ou le lieu de « ${activityTitle} ».`,
        },
        FRIEND_REQUEST: {
          title: "Nouvelle demande d'ami",
          body: (_activityTitle: string, actorName = "Quelqu'un") =>
            `${actorName} souhaite vous ajouter en ami.`,
        },
      },
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
      refreshError: "Réessayez plus tard.",
      permissionError: "Seul l'organisateur peut annuler cette activité.",
      statusError: "Ce statut d'activité ne peut pas être annulé.",
      endedError: "Cette activité est terminée et ne peut plus être annulée.",
      conflictError:
        "Le statut de l'activité a changé. Réessayez plus tard.",
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
      refreshError: "Réessayez plus tard.",
      missingError: "Cette demande n'existe plus ou a été modifiée.",
      permissionError:
        "Seul l'organisateur peut valider les demandes d'inscription.",
      statusError: "Ce statut d'inscription ne peut pas être validé.",
      closedError:
        "Cette activité est terminée ou annulée, les demandes ne peuvent plus être validées.",
      fullError:
        "Cette activité est complète. Aucune demande supplémentaire ne peut être validée.",
      conflictError:
        "Le nombre de places a changé. Réessayez plus tard.",
      failedError: "Échec de la validation. Réessayez plus tard.",
    },
    newActivity: {
      title: "Créer une activité",
      description:
        "Ajoutez les informations, publiez l'activité, puis vérifiez sa page.",
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
      friendCodeLabel: "Code ami",
      copyFriendCode: "Copier le code ami",
      friendCodeCopied: "Copié",
      nicknameLabel: "Pseudo",
      nicknamePlaceholder: "Saisissez votre pseudo",
      nicknameSetupTitle: "Choisissez un pseudo",
      nicknameSetupDescription:
        "Les autres verront ce pseudo et votre code ami, pas votre nom Google ni votre e-mail.",
      saveNickname: "Enregistrer",
      savingNickname: "Enregistrement...",
      nicknameError: "Le pseudo est requis, 24 caractères maximum.",
      createdCount: "Créées",
      participationCount: "Participations",
      errorTitle: "Échec du chargement du profil",
      errorDescription:
        "Certaines informations sont indisponibles. Réessayez plus tard.",
      createdTitle: "Activités créées",
      createdDescription: "",
      createdEmptyTitle: "Aucune activité créée",
      createdEmptyDescription: "Les activités apparaîtront ici.",
      participationTitle: "Activités rejointes",
      participationDescription: "",
      participationEmptyTitle: "Aucune participation",
      participationEmptyDescription: "Les activités rejointes apparaîtront ici.",
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
      coverImage: "Image de couverture",
      coverDefault: "Utiliser la couverture par défaut",
      coverImageHint:
        "L'image s'affiche sur les cartes d'activité et la page détail.",
      coverFileHint: "JPG, PNG ou WebP. 4 Mo maximum.",
      coverUpload: "Importer",
      coverDropHere: "Relâchez pour importer",
      coverUploading: "Import...",
      coverRemove: "Retirer",
      coverUploadFailed:
        "Échec de l'import de la couverture. Réessayez plus tard.",
      coverTypeError: "Seules les images JPG, PNG ou WebP sont acceptées.",
      coverSizeError: "L'image ne doit pas dépasser 4 Mo.",
      coverInvalidContentError:
        "Le contenu de l'image est invalide. Choisissez le fichier original.",
      coverStorageConfigError:
        "L'import d'images est indisponible pour le moment. Réessayez plus tard.",
      linkImportTitle: "Importer depuis un lien",
      linkImportDescription:
        "Collez une page prise en charge, vérifiez les infos détectées, puis appliquez-les au formulaire.",
      linkImportPlaceholder:
        "https://meetup.com/.../events/... ou https://www.eventbrite.fr/e/...",
      linkImportSupportedSitesTitle: "Sites pris en charge",
      linkImportSupportedSitesClose: "Fermer",
      linkImportSupportedSitesAriaLabel: "Voir les sites pris en charge",
      linkImportSupportedSiteExamples:
        "Ex. : meetup.com, eventbrite.fr, sortiraparis.com, playinparis.com, quefaire.paris.fr",
      linkImportPreview: "Analyser le lien",
      linkImportParsing: "Analyse...",
      linkImportApply: "Appliquer au formulaire",
      linkImportApplied:
        "Appliqué au formulaire. Vérifiez les champs requis avant publication.",
      linkImportUntitled: "Titre non détecté",
      linkImportMissingAddress: "Lieu non détecté",
      linkImportMissingFields: (count: number) =>
        `${count} champ(s) restent à compléter.`,
      linkImportErrors: {
        INVALID_URL: "Saisissez un lien https valide.",
        UNSUPPORTED_HOST:
          "Ce site n'est pas encore pris en charge. Utilisez Paris.fr, Que Faire a Paris, Sortir a Paris, Play in Paris, Eventbrite, Billetweb ou Meetup.",
        UNSUPPORTED_CONTENT:
          "Ce lien n'est pas une page d'activité analysable.",
        FETCH_FAILED:
          "Échec de l'analyse du lien. Réessayez plus tard ou remplissez le formulaire manuellement.",
        UNAUTHORIZED: "Connectez-vous avant d'analyser un lien.",
      },
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
      placePickerTitle: "Position sur la carte",
      placePickerHint:
        "Associe des coordonnées à partir de la ville et de l'adresse. La page détail affichera une carte après l'enregistrement.",
      placeSearch: "Associer le lieu",
      placeSearching: "Recherche...",
      placeSearchNeedAddress:
        "Renseignez d'abord une adresse avant de placer le point.",
      placeSearchEmpty:
        "Aucun lieu correspondant. Essayez avec une adresse plus complète.",
      placeSearchFailed: "Échec de recherche du lieu. Réessayez plus tard.",
      placeSearchResults: "Choisissez un résultat",
      placeSelected: "Coordonnées sélectionnées",
      placeChangedClear:
        "L'adresse a changé. Associez à nouveau la position sur la carte.",
      placeClear: "Effacer",
      mapPreviewTitle: "Aperçu carte",
      openMap: "Ouvrir la carte",
      startAt: "Début",
      startAtHint:
        "Heure de Paris. Si la fin est dans le futur, le début peut être dans le passé.",
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
        OPEN: "Ouvert",
        FULL: "Complet",
        DRAFT: "Brouillon",
        RECRUITING: "Ouvert",
        CONFIRMED: "Ouvert",
        ENDED: "Terminé",
        CANCELLED: "Annulé",
      },
      timeStates: {
        ONGOING: "En cours",
        UPCOMING: "À venir",
        ENDED: "Terminé",
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

export const activityTypes = {
  LOCAL: "本地局",
  TRIP: "旅游搭子"
} as const;

export const activityCategories = {
  BOARD_GAME: "桌游",
  MOVIE: "电影",
  MUSIC: "音乐",
  SPORTS: "运动",
  TRAVEL: "旅行",
  FOOD: "饭局",
  EXHIBITION: "展览",
  OTHER: "其他"
} as const;

export const activityStatuses = {
  OPEN: "招募中",
  FULL: "已满",
  DRAFT: "草稿",
  RECRUITING: "招募中",
  CONFIRMED: "已成团",
  ENDED: "已结束",
  CANCELLED: "已取消"
} as const;

export const priceTypes = {
  FREE: "免费",
  AA: "AA",
  FIXED: "固定金额",
  RANGE: "预算区间"
} as const;

export const visibilityTypes = {
  PUBLIC: "公开",
  LINK_ONLY: "仅链接",
  PRIVATE: "私密"
} as const;

export type VersionUpdate = {
  slug: string;
  aliases?: string[];
  version: string;
  title: string;
  releasedAt: string;
  description: string;
  highlights: string[];
  userUpdates: string[];
};

export const versionUpdates: VersionUpdate[] = [
  {
    slug: "v1_1",
    version: "v1.1",
    title: "活动发现与社交体验增强",
    releasedAt: "2026-06-02",
    description:
      "v1.1 重点把公开活动发现和组队大厅拆分成更清晰的两条路径，并补强筛选、分享和更新入口，让找活动、看朋友相关活动和持续跟进都更顺手。",
    highlights: [
      "新增组队大厅，集中查看自己和朋友相关的活动",
      "活动发现支持更完整的筛选和关系视角",
      "活动详情补充复制与分享能力",
      "新增站内更新公告入口",
    ],
    userUpdates: [
      "新增组队大厅，可以集中查看我发起、我参加、我收藏，以及和朋友相关的活动。",
      "活动发现和组队大厅拆分为两个更清晰的入口，公开活动浏览和个人/朋友活动跟进不再混在一起。",
      "活动发现页支持关键词、主题、城市、活动形式和活动进度筛选。",
      "活动发现页支持按关系筛选，可以更快区分我的活动、朋友发起的活动和朋友参加的活动。",
      "活动状态展示更清楚，可以区分可参与、已满员、进行中、未开始和已结束。",
      "活动列表支持分页，活动变多后也不会一次性加载过长页面。",
      "活动发现页加入每日推荐排序，同一天内展示顺序更稳定。",
      "顶部提供更直接的搜索入口，方便搜索活动、地点和商家。",
      "活动详情页可以一键复制时间、地点、费用和活动链接。",
      "活动详情页可以生成带二维码的宣传图，方便下载后分享给朋友。",
      "首页和导航入口围绕“发现活动”与“组队跟进”做了重新整理，切换路径更直观。",
      "新增站内更新公告页，后续版本更新会统一从这里查看。",
    ],
  },
  {
    slug: "v1_0",
    aliases: ["nextfun_version1.0"],
    version: "v1.0",
    title: "MVP 基础活动闭环",
    releasedAt: "2026-06-01",
    description:
      "第一版 MVP 完成发现活动、查看详情、发起活动、报名参加和个人空间管理的核心闭环。",
    highlights: [
      "真实活动数据接入",
      "创建和报名活动",
      "个人空间管理活动记录",
      "发起人可以编辑活动和处理审核",
    ],
    userUpdates: [
      "首页和活动页不再使用模拟数据，可以看到数据库中的真实活动。",
      "点击活动卡片可以进入完整活动详情页。",
      "登录用户可以创建活动，填写标题、介绍、时间、地点、人数和费用后发布。",
      "用户可以报名参加活动，也可以填写报名留言。",
      "需要审核的活动会先进入待确认状态，由发起人决定是否通过。",
      "已报名用户可以取消报名，页面会同步更新报名状态。",
      "活动发起人可以修改活动信息，或在计划变化时取消活动。",
      "个人空间展示个人资料、自己发起的活动和自己参与的活动。",
      "活动详情页支持基础提问、建议和评价，方便参加前沟通细节。",
      "活动可以关联场地、商家或组织者主页，帮助用户了解活动背景。",
      "活动可以上传封面图，活动卡片和详情页更直观。",
      "活动地点可以展示地图信息，方便确认位置。",
      "报名、审核、活动取消和活动变更会进入通知中心。",
      "创建活动时可以从活动链接导入标题、时间、地点、封面和费用等信息。",
    ],
  },
];

export function getVersionUpdatesDescending() {
  return [...versionUpdates].sort((a, b) =>
    b.releasedAt.localeCompare(a.releasedAt),
  );
}

export function getVersionUpdateBySlug(slug: string) {
  return (
    versionUpdates.find(
      (update) => update.slug === slug || update.aliases?.includes(slug),
    ) ?? null
  );
}

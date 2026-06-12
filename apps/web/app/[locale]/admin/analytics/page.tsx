import Link from "next/link";
import {
  AlertCircle,
  ArrowRight,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  Flame,
  Gauge,
  MessageCircle,
  Share2,
  ShieldQuestion,
  Sparkles,
  SlidersHorizontal,
  TrendingUp,
  TimerReset,
  UsersRound,
  type LucideIcon,
} from "lucide-react";
import { PageContainer } from "@/components/layout/PageContainer";
import {
  adminAnalyticsWindowOptions,
  getAdminAnalyticsDashboard,
  getAdminAnalyticsWindowDays,
  type AdminAnalyticsDashboard,
  type AdminAnalyticsWindowDays,
} from "@/features/analytics/queries/getAdminAnalyticsDashboard";
import { requireAdminPageAccess } from "@/lib/admin-auth";
import { withLocale } from "@/lib/routes";

export const dynamic = "force-dynamic";

type AdminAnalyticsPageProps = {
  params: Promise<{
    locale: string;
  }>;
  searchParams: Promise<{
    section?: string;
    window?: string;
  }>;
};

const adminAnalyticsSections = [
  "overview",
  "journey",
  "latency",
  "sources",
  "community",
] as const;

type AdminAnalyticsSection = (typeof adminAnalyticsSections)[number];

function getAdminAnalyticsSection(value: unknown): AdminAnalyticsSection {
  return adminAnalyticsSections.includes(value as AdminAnalyticsSection)
    ? (value as AdminAnalyticsSection)
    : "overview";
}

function getCopy(locale: string) {
  if (locale === "fr") {
    return {
      actionUsers: "Utilisateurs actifs",
      activityDiscovery: "Découverte",
      activityDiscoveryDescription: "Les cartes donnent-elles envie d'ouvrir ?",
      activityInfo: "Activités publiques",
      activityInfoDescription:
        "Les activités publiques créent-elles des groupes ?",
      activityRankActivity: "Groupe",
      activityRankEmpty: "Les contenus populaires apparaîtront ici.",
      activityRankPublicEvent: "Activité",
      activityRankTeam: "Groupe",
      activityRankTitle: "Activités à suivre",
      activityRankDescription:
        "Classement par vues et actions utiles sur la période choisie.",
      adminShortcuts: "Actions",
      communityRiskDescription:
        "Suivre les signalements pour garder un espace lisible et sûr.",
      communityRiskTitle: "Communauté",
      comments: "Commentaires",
      contact: "Contacts",
      conversations: "Discussions ouvertes",
      conversion: "Conversion",
      createdTeams: "Groupes créés",
      dataWindow: (days: number) => `${days} derniers jours`,
      description:
        "Vue d'ensemble pour lire la découverte, les groupes, les inscriptions, la communauté et la valeur des sources.",
      environment: "Environnement",
      environmentBreakdown: "Par environnement",
      fieldsCopied: "Champs copiés",
      friendAccepted: "Acceptées",
      friendRate: "Taux d'acceptation",
      friendSent: "Demandes",
      friendsTitle: "Amis",
      latencyAverage: "Moy.",
      latencyCount: "Échantillons",
      latencyDescription:
        "Repérer les pages et actions lentes, séparées par environnement.",
      latencyFailed: "Échecs",
      latencyKindOperation: "Action",
      latencyKindPage: "Page",
      latencyMax: "Max",
      latencyNoData: "Les mesures de ressenti apparaîtront ici.",
      latencyP95: "P95",
      latencyPhase: "Étape",
      latencySlow: "Lents",
      latencyTitle: "Ressenti",
      range7: "7 jours",
      range30: "30 jours",
      range90: "90 jours",
      rangeLabel: "Période",
      importSource: "Source",
      imported: "Importées",
      intentActions: "Interactions utiles",
      intentWindow: (days: number) => `${days} jours`,
      join: "Inscriptions",
      joinDescription: "Les pages groupe déclenchent-elles une inscription ?",
      linksCopied: "Liens copiés",
      messages: "Messages",
      newReports: "Nouveaux",
      noSources: "Pas encore assez de données de source.",
      pendingReports: "À traiter",
      posters: "Affiches",
      productSignals: "Signaux produit",
      publicEventSources: "Sources publiques",
      publicEventSourcesDescription:
        "Comparer les sources par imports, clics et groupes créés.",
      qr: "QR codes",
      reportActivity: "Groupes",
      reportComment: "Commentaires",
      reportPublicEvent: "Activités",
      reportTargets: "Signalements",
      reportUser: "Utilisateurs",
      reviewTime: "Délai moyen",
      reviewTimeEmpty: "À venir",
      reviewedReports: "Traités",
      sectionCommunity: "Communauté",
      sectionJourney: "Parcours",
      sectionLatency: "Ressenti",
      sectionOverview: "Vue d'ensemble",
      sectionSources: "Sources",
      seeReports: "Traiter les signalements",
      seeScraper: "Gérer les imports",
      shareTitle: "Partage",
      sourceClicks: "Clics source",
      sourceSurfaceTitle: "Entrées des groupes",
      sourceSurfaceDescription: "D'où viennent les visites de pages groupe.",
      subtitle: "Données",
      title: "Tableau de bord",
      topDecision: "Vue d'ensemble",
      totalSamples: "Mesures",
      trendCommunication: "Échanges",
      trendDiscovery: "Découverte",
      trendJoin: "Inscriptions",
      trendTeam: "Groupes",
      trendTitle: "Rythme des usages",
      trendDescription:
        "Lire rapidement les jours où la découverte, les groupes et les échanges progressent.",
      viewCount: "Vues",
      clickCount: "Clics",
      openRate: "Taux d'ouverture",
    };
  }

  if (locale === "en") {
    return {
      actionUsers: "Active users",
      activityDiscovery: "Discovery",
      activityDiscoveryDescription: "Do cards make people open details?",
      activityInfo: "Public activities",
      activityInfoDescription: "Do public activities turn into crews?",
      activityRankActivity: "Crew",
      activityRankEmpty: "Popular items will appear here.",
      activityRankPublicEvent: "Activity",
      activityRankTeam: "Crew",
      activityRankTitle: "Popular activity ranking",
      activityRankDescription:
        "Ranked by views and meaningful actions in the selected window.",
      adminShortcuts: "Actions",
      communityRiskDescription:
        "Track reports so community issues can be handled quickly.",
      communityRiskTitle: "Community health",
      comments: "Comments",
      contact: "Organizer contact",
      conversations: "Chats opened",
      conversion: "Conversion",
      createdTeams: "Crews created",
      dataWindow: (days: number) => `Last ${days} days`,
      description:
        "A concise view of discovery, crew creation, joins, community health, and source value.",
      environment: "Environment",
      environmentBreakdown: "By environment",
      fieldsCopied: "Fields copied",
      friendAccepted: "Accepted",
      friendRate: "Accept rate",
      friendSent: "Requests",
      friendsTitle: "Friends",
      latencyAverage: "Avg",
      latencyCount: "Samples",
      latencyDescription:
        "Find slow pages and actions, separated by environment.",
      latencyFailed: "Failed",
      latencyKindOperation: "Action",
      latencyKindPage: "Page",
      latencyMax: "Max",
      latencyNoData: "Perceived latency samples will appear here.",
      latencyP95: "P95",
      latencyPhase: "Phase",
      latencySlow: "Slow",
      latencyTitle: "Perceived latency",
      range7: "7 days",
      range30: "30 days",
      range90: "90 days",
      rangeLabel: "Range",
      importSource: "Source",
      imported: "Imported",
      intentActions: "Useful interactions",
      intentWindow: (days: number) => `${days} days`,
      join: "Join funnel",
      joinDescription: "Do crew pages convert into joins?",
      linksCopied: "Links copied",
      messages: "Messages",
      newReports: "New reports",
      noSources: "Not enough source data yet.",
      pendingReports: "Pending",
      posters: "Posters",
      productSignals: "Product signals",
      publicEventSources: "Public sources",
      publicEventSourcesDescription:
        "Compare sources by imports, clicks, and crews created.",
      qr: "QR codes",
      reportActivity: "Crews",
      reportComment: "Comments",
      reportPublicEvent: "Activities",
      reportTargets: "Reports",
      reportUser: "Users",
      reviewTime: "Avg. review",
      reviewTimeEmpty: "Not enough data",
      reviewedReports: "Reviewed",
      sectionCommunity: "Community",
      sectionJourney: "Journey",
      sectionLatency: "Latency",
      sectionOverview: "Overview",
      sectionSources: "Sources",
      seeReports: "Review reports",
      seeScraper: "Manage imports",
      shareTitle: "Sharing",
      sourceClicks: "Source clicks",
      sourceSurfaceTitle: "Crew entry points",
      sourceSurfaceDescription: "Where crew detail visits came from.",
      subtitle: "Data",
      title: "Operations dashboard",
      topDecision: "Overview",
      totalSamples: "Samples",
      trendCommunication: "Communication",
      trendDiscovery: "Discovery",
      trendJoin: "Joins",
      trendTeam: "Crews",
      trendTitle: "Usage rhythm",
      trendDescription:
        "See which days bring discovery, crew creation, joins, and conversations.",
      viewCount: "Views",
      clickCount: "Clicks",
      openRate: "Open rate",
    };
  }

  return {
    actionUsers: "活跃用户",
    activityDiscovery: "活动发现",
    activityDiscoveryDescription: "活动卡片是否吸引用户点开。",
    activityInfo: "活动",
    activityInfoDescription: "公共活动是否真的促成组队。",
    activityRankActivity: "组队",
    activityRankEmpty: "有足够浏览和互动后，这里会显示热门内容。",
    activityRankPublicEvent: "活动",
    activityRankTeam: "组局",
    activityRankTitle: "热门活动排行",
    activityRankDescription:
      "按浏览和后续动作加权，帮助判断哪些内容值得继续运营。",
    adminShortcuts: "快捷处理",
    communityRiskDescription: "关注举报处理进度，让社区环境保持清晰可控。",
    communityRiskTitle: "社区反馈",
    comments: "评论回复",
    contact: "联系发起人",
    conversations: "打开私聊",
    conversion: "转化率",
    createdTeams: "转成组队",
    dataWindow: (days: number) => `最近 ${days} 天`,
    description:
      "给运营和管理员快速判断：用户是否发现活动、是否发起组队、报名沟通是否顺畅、来源是否值得维护。",
    environment: "环境",
    environmentBreakdown: "按环境拆分",
    fieldsCopied: "字段复制",
    friendAccepted: "通过",
    friendRate: "通过率",
    friendSent: "申请",
    friendsTitle: "好友关系",
    latencyAverage: "平均",
    latencyCount: "样本",
    latencyDescription:
      "区分页面加载和用户操作，按环境查看最近最慢的体感等待。",
    latencyFailed: "失败",
    latencyKindOperation: "操作",
    latencyKindPage: "页面",
    latencyMax: "最高",
    latencyNoData: "有页面或操作耗时样本后，这里会显示排行。",
    latencyP95: "P95",
    latencyPhase: "阶段",
    latencySlow: "慢样本",
    latencyTitle: "体感耗时",
    range7: "7 天",
    range30: "30 天",
    range90: "90 天",
    rangeLabel: "时间范围",
    importSource: "来源",
    imported: "导入",
    intentActions: "有效互动",
    intentWindow: (days: number) => `近 ${days} 天`,
    join: "报名转化",
    joinDescription: "组队详情是否能促成真实报名。",
    linksCopied: "链接复制",
    messages: "消息发送",
    newReports: "新增举报",
    noSources: "暂无足够来源数据。",
    pendingReports: "待处理",
    posters: "宣传图",
    productSignals: "产品信号",
    publicEventSources: "公共活动来源",
    publicEventSourcesDescription: "对比来源的导入量、点击量和转组队结果。",
    qr: "二维码",
    reportActivity: "组队",
    reportComment: "评论",
    reportPublicEvent: "活动",
    reportTargets: "举报对象",
    reportUser: "用户",
    reviewTime: "平均处理",
    reviewTimeEmpty: "暂无数据",
    reviewedReports: "已处理",
    sectionCommunity: "社区反馈",
    sectionJourney: "用户路径",
    sectionLatency: "体感耗时",
    sectionOverview: "总览",
    sectionSources: "来源价值",
    seeReports: "处理举报",
    seeScraper: "管理导入",
    shareTitle: "分享传播",
    sourceClicks: "来源点击",
    sourceSurfaceTitle: "组队入口来源",
    sourceSurfaceDescription: "用户从哪里进入组队详情。",
    subtitle: "数据后台",
    title: "运营数据看台",
    topDecision: "运营总览",
    totalSamples: "记录样本",
    trendCommunication: "沟通",
    trendDiscovery: "发现",
    trendJoin: "报名",
    trendTeam: "组队",
    trendTitle: "使用趋势",
    trendDescription: "快速观察发现、组队、报名和沟通在不同日期的变化。",
    viewCount: "浏览",
    clickCount: "点击",
    openRate: "打开率",
  };
}

function getSourceSurfaceLabel(locale: string, sourceSurface: string) {
  const zh: Record<string, string> = {
    activity_detail: "组队详情",
    activity_list: "活动发现",
    friend_activity: "好友动态",
    global_search: "全站搜索",
    home_recent: "首页",
    messages: "消息",
    notification: "通知",
    profile: "个人空间",
    public_event_detail: "活动",
    share_link: "分享链接",
  };
  const en: Record<string, string> = {
    activity_detail: "Crew detail",
    activity_list: "Activities",
    friend_activity: "Friend activity",
    global_search: "Search",
    home_recent: "Home",
    messages: "Messages",
    notification: "Notification",
    profile: "Profile",
    public_event_detail: "Activity info",
    share_link: "Shared link",
  };
  const fr: Record<string, string> = {
    activity_detail: "Détail groupe",
    activity_list: "Activités",
    friend_activity: "Amis",
    global_search: "Recherche",
    home_recent: "Accueil",
    messages: "Messages",
    notification: "Notification",
    profile: "Profil",
    public_event_detail: "Activité",
    share_link: "Lien partagé",
  };
  const labels = locale === "fr" ? fr : locale === "en" ? en : zh;

  return labels[sourceSurface] ?? sourceSurface;
}

function getSourceLabel(locale: string, source: string) {
  if (source === "manual") {
    return locale === "fr" ? "Manuel" : locale === "en" ? "Manual" : "手动维护";
  }

  if (source === "unknown") {
    return locale === "fr"
      ? "Inconnu"
      : locale === "en"
        ? "Unknown"
        : "未知来源";
  }

  return source;
}

type FocusItem = {
  body: string;
  href?: string;
  severity: "good" | "watch";
  title: string;
};

function getFocusCopy(locale: string) {
  if (locale === "fr") {
    return {
      discoveryBody: "Les cartes sont vues, mais peu ouvertes.",
      discoveryTitle: "À revoir : découverte",
      joinBody:
        "Les pages groupe sont ouvertes, mais peu d'inscriptions suivent.",
      joinTitle: "À revoir : inscription",
      noIntentBody:
        "Surveillez d'abord les créations, inscriptions et messages.",
      noIntentTitle: "Interactions à développer",
      noSourcesBody:
        "Les imports sont en place. Les premiers clics aideront à comparer les sources.",
      noSourcesTitle: "Sources en cours d'évaluation",
      publicEventBody:
        "Les activités sont consultées, mais créent peu de groupes.",
      publicEventTitle: "À revoir : création de groupe",
      reportsBody: "Des signalements attendent une décision.",
      reportsTitle: (count: number) => `${count} signalement(s) à traiter`,
      stableBody: "Les principaux indicateurs n'ont pas d'alerte immédiate.",
      stableTitle: "Vue stable",
    };
  }

  if (locale === "en") {
    return {
      discoveryBody: "Cards are seen, but not opened often enough.",
      discoveryTitle: "Review discovery",
      joinBody: "Crew pages are viewed, but joins are still weak.",
      joinTitle: "Review joins",
      noIntentBody:
        "Watch creations, joins, comments, contacts and messages first.",
      noIntentTitle: "Interactions are still building",
      noSourcesBody:
        "Imports are ready. First clicks will make source value clearer.",
      noSourcesTitle: "Sources under review",
      publicEventBody: "Activity info gets views, but creates few crews.",
      publicEventTitle: "Review crew creation",
      reportsBody: "Reports are waiting for a decision.",
      reportsTitle: (count: number) => `${count} report(s) pending`,
      stableBody: "No urgent issue in the main signals right now.",
      stableTitle: "Signals look stable",
    };
  }

  return {
    discoveryBody: "活动卡片有曝光，但点开比例偏低。",
    discoveryTitle: "关注活动发现",
    joinBody: "组队详情有人看，但报名转化偏弱。",
    joinTitle: "关注报名转化",
    noIntentBody: "优先观察发起组队、报名、评论、联系和私聊。",
    noIntentTitle: "互动正在积累",
    noSourcesBody: "导入已经就绪，后续点击和组队数据会帮助判断来源价值。",
    noSourcesTitle: "来源价值待观察",
    publicEventBody: "活动有人看，但转成组队还不明显。",
    publicEventTitle: "关注组队发起",
    reportsBody: "有举报等待处理，先保证社区反馈闭环。",
    reportsTitle: (count: number) => `${count} 条举报待处理`,
    stableBody: "核心指标暂时没有明显异常。",
    stableTitle: "当前信号稳定",
  };
}

function getFocusItems(
  dashboard: AdminAnalyticsDashboard,
  locale: string,
): FocusItem[] {
  const copy = getFocusCopy(locale);
  const items: FocusItem[] = [];

  if (dashboard.operations.reports.pendingCount > 0) {
    items.push({
      body: copy.reportsBody,
      href: "/admin/reports",
      severity: "watch",
      title: copy.reportsTitle(dashboard.operations.reports.pendingCount),
    });
  }

  if (
    dashboard.discovery.listViews >= 20 &&
    dashboard.discovery.clickRate < 15
  ) {
    items.push({
      body: copy.discoveryBody,
      href: "/activities",
      severity: "watch",
      title: copy.discoveryTitle,
    });
  }

  if (
    dashboard.publicEventConversion.detailViews >= 10 &&
    dashboard.publicEventConversion.conversionRate < 5
  ) {
    items.push({
      body: copy.publicEventBody,
      href: "/admin/data-scraper",
      severity: "watch",
      title: copy.publicEventTitle,
    });
  }

  if (dashboard.teamJoin.detailViews >= 10 && dashboard.teamJoin.joinRate < 8) {
    items.push({
      body: copy.joinBody,
      href: "/activities",
      severity: "watch",
      title: copy.joinTitle,
    });
  }

  if (
    dashboard.northStar.activeIntentUsers === 0 &&
    dashboard.northStar.intentActionCount === 0
  ) {
    items.push({
      body: copy.noIntentBody,
      severity: "watch",
      title: copy.noIntentTitle,
    });
  }

  if (dashboard.publicEventSources.length === 0) {
    items.push({
      body: copy.noSourcesBody,
      href: "/admin/data-scraper",
      severity: "watch",
      title: copy.noSourcesTitle,
    });
  }

  if (items.length === 0) {
    items.push({
      body: copy.stableBody,
      severity: "good",
      title: copy.stableTitle,
    });
  }

  return items.slice(0, 4);
}

function MetricTile({
  icon: Icon,
  label,
  tone = "bg-white text-ink ring-black/10",
  value,
}: {
  icon: LucideIcon;
  label: string;
  tone?: string;
  value: string | number;
}) {
  return (
    <div className="min-w-0 rounded-2xl bg-white/65 p-2.5 ring-1 ring-black/5 sm:border-l sm:border-black/10 sm:bg-transparent sm:p-0 sm:pl-4 sm:ring-0">
      <span
        className={`inline-flex h-7 w-7 items-center justify-center rounded-full ring-1 sm:h-9 sm:w-9 ${tone}`}
      >
        <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
      </span>
      <p className="mt-1.5 truncate text-xl font-semibold tracking-normal text-ink sm:mt-3 sm:text-2xl">
        {value}
      </p>
      <p className="mt-1 line-clamp-2 text-xs leading-4 text-zinc-500 sm:text-sm">
        {label}
      </p>
    </div>
  );
}

function FocusList({ items, locale }: { items: FocusItem[]; locale: string }) {
  return (
    <ul className="space-y-3">
      {items.map((item) => {
        const icon =
          item.severity === "good" ? (
            <CheckCircle2 className="h-4 w-4 text-moss" />
          ) : (
            <AlertCircle className="h-4 w-4 text-clay" />
          );
        const content = (
          <>
            <span
              className={`mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                item.severity === "good" ? "bg-[#eef5ea]" : "bg-[#f8eadf]"
              }`}
            >
              {icon}
            </span>
            <span className="min-w-0">
              <span className="block font-semibold text-ink">{item.title}</span>
              <span className="mt-0.5 block text-sm leading-6 text-zinc-500">
                {item.body}
              </span>
            </span>
          </>
        );

        return (
          <li key={`${item.title}-${item.body}`}>
            {item.href ? (
              <Link
                className="flex gap-3 rounded-2xl px-1 py-1.5 transition hover:bg-white/70"
                href={withLocale(locale, item.href)}
              >
                {content}
              </Link>
            ) : (
              <div className="flex gap-3 px-1 py-1.5">{content}</div>
            )}
          </li>
        );
      })}
    </ul>
  );
}

function FunnelPanel({
  description,
  metrics,
  title,
}: {
  description: string;
  metrics: Array<{ label: string; value: number | string }>;
  title: string;
}) {
  return (
    <section className="min-w-0 rounded-[1.25rem] border border-black/10 bg-white/82 p-3 shadow-sm sm:p-4">
      <h2 className="text-lg font-semibold text-ink">{title}</h2>
      <p className="mt-1 text-sm leading-6 text-zinc-500">{description}</p>
      <div className="mt-3 grid grid-cols-3 gap-2 border-t border-black/10 pt-3 sm:mt-4 sm:gap-3 sm:pt-4">
        {metrics.map((metric) => (
          <div key={metric.label} className="min-w-0">
            <p className="truncate text-lg font-semibold text-ink sm:text-xl">
              {metric.value}
            </p>
            <p className="mt-1 text-xs leading-4 text-zinc-500">
              {metric.label}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

function DataBar({
  label,
  max,
  value,
}: {
  label: string;
  max: number;
  value: number;
}) {
  const width = max > 0 ? Math.max(4, Math.round((value / max) * 100)) : 0;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="font-medium text-ink">{label}</span>
        <span className="text-zinc-500">{value}</span>
      </div>
      <div className="h-2 rounded-full bg-zinc-100">
        <div
          className="h-full rounded-full bg-moss"
          style={{ width: `${width}%` }}
        />
      </div>
    </div>
  );
}

function SmallStat({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="min-w-0 rounded-2xl bg-paper/70 px-3 py-2.5 ring-1 ring-black/5 sm:px-4 sm:py-3">
      <p className="truncate text-xl font-semibold tracking-normal text-ink sm:text-2xl">
        {value}
      </p>
      <p className="mt-1 line-clamp-2 text-xs leading-4 text-zinc-500 sm:text-sm">
        {label}
      </p>
    </div>
  );
}

function formatReviewTime(
  locale: string,
  hours: number | null,
  fallback: string,
) {
  if (hours === null) {
    return fallback;
  }

  if (hours < 24) {
    return locale === "fr"
      ? `${hours} h`
      : locale === "en"
        ? `${hours}h`
        : `${hours} 小时`;
  }

  const days = Math.round(hours / 24);
  return locale === "fr"
    ? `${days} j`
    : locale === "en"
      ? `${days}d`
      : `${days} 天`;
}

function getReportTargetLabel(
  locale: string,
  targetType: string,
  labels: {
    reportActivity: string;
    reportComment: string;
    reportPublicEvent: string;
    reportUser: string;
  },
) {
  const targetLabels: Record<string, string> = {
    ACTIVITY: labels.reportActivity,
    COMMENT: labels.reportComment,
    PUBLIC_EVENT: labels.reportPublicEvent,
    USER_PROFILE: labels.reportUser,
  };

  return targetLabels[targetType] ?? targetType;
}

type AdminAnalyticsCopy = ReturnType<typeof getCopy>;

function buildAnalyticsHref({
  locale,
  section,
  windowDays,
}: {
  locale: string;
  section: AdminAnalyticsSection;
  windowDays: AdminAnalyticsWindowDays;
}) {
  return `${withLocale(
    locale,
    "/admin/analytics",
  )}?window=${windowDays}&section=${section}`;
}

function DashboardControls({
  activeSection,
  locale,
  t,
  windowDays,
}: {
  activeSection: AdminAnalyticsSection;
  locale: string;
  t: AdminAnalyticsCopy;
  windowDays: AdminAnalyticsWindowDays;
}) {
  const sectionLabels: Record<AdminAnalyticsSection, string> = {
    community: t.sectionCommunity,
    journey: t.sectionJourney,
    latency: t.sectionLatency,
    overview: t.sectionOverview,
    sources: t.sectionSources,
  };
  const windowLabels: Record<AdminAnalyticsWindowDays, string> = {
    7: t.range7,
    30: t.range30,
    90: t.range90,
  };

  return (
    <section className="min-w-0 overflow-hidden rounded-[1.25rem] border border-black/10 bg-white/82 p-3 shadow-sm sm:p-4">
      <div className="grid min-w-0 gap-3 lg:grid-cols-[minmax(17rem,0.62fr)_minmax(0,1.38fr)] lg:items-center">
        <div className="flex items-center gap-2 text-sm font-semibold text-ink">
          <CalendarDays className="h-4 w-4 text-moss" />
          {t.rangeLabel}
        </div>
        <div className="grid min-w-0 grid-cols-3 gap-2 sm:flex sm:flex-wrap">
          {adminAnalyticsWindowOptions.map((option) => (
            <Link
              key={option}
              className={`inline-flex h-9 min-w-0 items-center justify-center rounded-full px-3 text-sm font-medium ring-1 transition ${
                option === windowDays
                  ? "bg-ink text-white ring-ink"
                  : "bg-paper text-zinc-600 ring-black/10 hover:bg-white"
              }`}
              href={buildAnalyticsHref({
                locale,
                section: activeSection,
                windowDays: option,
              })}
            >
              <span className="truncate">{windowLabels[option]}</span>
            </Link>
          ))}
        </div>
      </div>
      <div className="mt-3 grid min-w-0 gap-3 border-t border-black/10 pt-3 lg:grid-cols-[minmax(17rem,0.62fr)_minmax(0,1.38fr)] lg:items-center">
        <div className="flex items-center gap-2 text-sm font-semibold text-ink">
          <SlidersHorizontal className="h-4 w-4 text-clay" />
          {t.productSignals}
        </div>
        <div className="grid min-w-0 grid-cols-2 gap-2 sm:flex sm:flex-wrap">
          {adminAnalyticsSections.map((section) => (
            <Link
              key={section}
              className={`inline-flex h-9 min-w-0 items-center justify-center rounded-full px-3 text-sm font-medium ring-1 transition ${
                section === activeSection
                  ? "bg-[#eef5ea] text-moss ring-[#c1d2ba]"
                  : "bg-paper text-zinc-600 ring-black/10 hover:bg-white"
              }`}
              href={buildAnalyticsHref({
                locale,
                section,
                windowDays,
              })}
            >
              <span className="truncate">{sectionLabels[section]}</span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

function TrendPanel({
  dashboard,
  t,
}: {
  dashboard: AdminAnalyticsDashboard;
  t: AdminAnalyticsCopy;
}) {
  const max = Math.max(1, ...dashboard.trend.map((item) => item.total));
  const step =
    dashboard.trend.length > 45 ? 3 : dashboard.trend.length > 30 ? 2 : 1;
  const visibleTrend = dashboard.trend.filter((_, index) => index % step === 0);
  const legend = [
    { color: "bg-moss", label: t.trendDiscovery },
    { color: "bg-clay", label: t.trendTeam },
    { color: "bg-sky-500", label: t.trendJoin },
    { color: "bg-zinc-500", label: t.trendCommunication },
  ];

  return (
    <section className="min-w-0 overflow-hidden rounded-[1.25rem] border border-black/10 bg-white/82 p-3 shadow-sm sm:p-5">
      <div className="grid min-w-0 gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
        <div className="min-w-0">
          <h2 className="text-lg font-semibold text-ink">{t.trendTitle}</h2>
          <p className="mt-1 text-sm leading-6 text-zinc-500">
            {t.trendDescription}
          </p>
        </div>
        <div className="grid grid-cols-4 gap-2 text-xs text-zinc-500 sm:flex sm:flex-wrap sm:gap-x-3 sm:gap-y-2">
          {legend.map((item) => (
            <span
              key={item.label}
              className="inline-flex min-w-0 items-center gap-1.5"
            >
              <span className={`h-2 w-2 shrink-0 rounded-full ${item.color}`} />
              <span className="truncate">{item.label}</span>
            </span>
          ))}
        </div>
      </div>

      <div className="mt-4 flex h-40 min-w-0 items-end gap-1 overflow-hidden rounded-2xl bg-paper/70 px-2 pb-3 pt-4 ring-1 ring-black/5 sm:mt-5 sm:h-44 sm:gap-1.5 sm:px-3 sm:pt-5">
        {visibleTrend.map((item) => {
          const height =
            item.total > 0
              ? Math.max(6, Math.round((item.total / max) * 136))
              : 6;
          const discoveryHeight =
            item.total > 0
              ? Math.round((item.discovery / item.total) * height)
              : 0;
          const teamHeight =
            item.total > 0 ? Math.round((item.team / item.total) * height) : 0;
          const joinHeight =
            item.total > 0 ? Math.round((item.join / item.total) * height) : 0;
          const communicationHeight =
            item.total > 0
              ? Math.max(2, height - discoveryHeight - teamHeight - joinHeight)
              : 0;

          return (
            <div
              key={item.dateKey}
              className="flex min-w-0 flex-1 flex-col items-center justify-end gap-1"
              title={`${item.label}: ${item.total}`}
            >
              <div
                className="flex w-full max-w-5 flex-col justify-end overflow-hidden rounded-full bg-white shadow-sm ring-1 ring-black/5"
                style={{ height }}
              >
                {communicationHeight > 0 ? (
                  <span
                    className="block bg-zinc-500"
                    style={{ height: communicationHeight }}
                  />
                ) : null}
                {joinHeight > 0 ? (
                  <span
                    className="block bg-sky-500"
                    style={{ height: joinHeight }}
                  />
                ) : null}
                {teamHeight > 0 ? (
                  <span
                    className="block bg-clay"
                    style={{ height: teamHeight }}
                  />
                ) : null}
                {discoveryHeight > 0 ? (
                  <span
                    className="block bg-moss"
                    style={{ height: discoveryHeight }}
                  />
                ) : null}
              </div>
              {visibleTrend.length <= 16 ? (
                <span className="truncate text-[0.68rem] text-zinc-400">
                  {item.label}
                </span>
              ) : null}
            </div>
          );
        })}
      </div>
    </section>
  );
}

function getPopularItemTypeLabel(
  itemType: AdminAnalyticsDashboard["popularItems"][number]["type"],
  t: AdminAnalyticsCopy,
) {
  if (itemType === "public_event") {
    return t.activityRankPublicEvent;
  }

  if (itemType === "team") {
    return t.activityRankTeam;
  }

  return t.activityRankActivity;
}

function PopularItemsPanel({
  dashboard,
  t,
}: {
  dashboard: AdminAnalyticsDashboard;
  t: AdminAnalyticsCopy;
}) {
  const maxScore = Math.max(
    1,
    ...dashboard.popularItems.map((item) => item.score),
  );

  return (
    <section className="min-w-0 overflow-hidden rounded-[1.25rem] border border-black/10 bg-white/82 p-3 shadow-sm sm:p-5">
      <div className="flex min-w-0 items-start gap-3">
        <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#f8eadf] text-clay ring-1 ring-[#f1c6ae] sm:h-10 sm:w-10">
          <Flame className="h-4 w-4 sm:h-5 sm:w-5" />
        </span>
        <div className="min-w-0">
          <h2 className="text-lg font-semibold text-ink">
            {t.activityRankTitle}
          </h2>
          <p className="mt-1 text-sm leading-6 text-zinc-500">
            {t.activityRankDescription}
          </p>
        </div>
      </div>

      {dashboard.popularItems.length > 0 ? (
        <ol className="mt-4 space-y-3 sm:mt-5">
          {dashboard.popularItems.map((item, index) => {
            const width = Math.max(
              8,
              Math.round((item.score / maxScore) * 100),
            );

            return (
              <li
                key={`${item.type}-${item.id}`}
                className="min-w-0 overflow-hidden rounded-2xl bg-paper/70 p-3 ring-1 ring-black/5"
              >
                <div className="flex min-w-0 items-start gap-3">
                  <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-sm font-semibold text-ink ring-1 ring-black/10">
                    {index + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="grid min-w-0 gap-1 sm:flex sm:items-center sm:gap-2">
                      <p className="min-w-0 truncate font-semibold text-ink sm:flex-1">
                        {item.title}
                      </p>
                      <span className="inline-flex h-6 w-fit max-w-full items-center rounded-full bg-white px-2 text-xs font-medium text-zinc-600 ring-1 ring-black/10">
                        {getPopularItemTypeLabel(item.type, t)}
                      </span>
                    </div>
                    <p className="mt-1 truncate text-xs text-zinc-500">
                      {item.city} · {t.viewCount} {item.viewCount} ·{" "}
                      {t.intentActions} {item.actionCount}
                    </p>
                    <div className="mt-2 h-2 min-w-0 overflow-hidden rounded-full bg-white">
                      <div
                        className="h-full rounded-full bg-clay"
                        style={{ width: `${width}%` }}
                      />
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      ) : (
        <p className="mt-5 rounded-2xl border border-dashed border-zinc-200 bg-paper/70 p-4 text-sm text-zinc-500">
          {t.activityRankEmpty}
        </p>
      )}
    </section>
  );
}

function formatLatencyMs(value: number) {
  if (value >= 1000) {
    return `${(value / 1000).toFixed(value >= 10000 ? 0 : 1)}s`;
  }

  return `${value}ms`;
}

function getLatencyKindLabel(
  kind: AdminAnalyticsDashboard["latency"]["slowest"][number]["kind"],
  t: AdminAnalyticsCopy,
) {
  return kind === "page" ? t.latencyKindPage : t.latencyKindOperation;
}

function LatencyPanel({
  dashboard,
  t,
}: {
  dashboard: AdminAnalyticsDashboard;
  t: AdminAnalyticsCopy;
}) {
  const maxP95 = Math.max(
    1,
    ...dashboard.latency.slowest.map((item) => item.p95Ms),
  );
  const summary = dashboard.latency.summary;

  return (
    <section className="min-w-0 rounded-[1.25rem] border border-black/10 bg-white/82 p-3 shadow-sm sm:p-5">
      <div className="grid min-w-0 gap-5 xl:grid-cols-[minmax(18rem,0.72fr)_minmax(0,1.28fr)]">
        <div className="xl:border-r xl:border-black/10 xl:pr-5">
          <div className="flex items-start gap-3">
            <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-sky-50 text-sky-700 ring-1 ring-sky-200">
              <TimerReset className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <h2 className="text-lg font-semibold text-ink">
                {t.latencyTitle}
              </h2>
              <p className="mt-1 text-sm leading-6 text-zinc-500">
                {t.latencyDescription}
              </p>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2 sm:mt-5 sm:gap-3">
            <SmallStat label={t.totalSamples} value={summary.totalSamples} />
            <SmallStat
              label={t.latencyP95}
              value={formatLatencyMs(summary.p95Ms)}
            />
            <SmallStat label={t.latencyKindPage} value={summary.pageSamples} />
            <SmallStat
              label={t.latencyKindOperation}
              value={summary.operationSamples}
            />
          </div>

          <div className="mt-4 rounded-2xl bg-paper/70 p-3 ring-1 ring-black/5">
            <div className="flex items-center justify-between gap-3 text-sm">
              <span className="font-medium text-ink">{t.latencySlow}</span>
              <span className="font-semibold text-clay">
                {summary.slowSamples}
              </span>
            </div>
            <p className="mt-1 text-xs leading-5 text-zinc-500">
              {t.latencyAverage}: {formatLatencyMs(summary.averageMs)}
            </p>
          </div>

          <div className="mt-5">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-ink">
              <Gauge className="h-4 w-4 text-moss" />
              {t.environmentBreakdown}
            </h3>
            <div className="mt-3 space-y-2">
              {dashboard.latency.environmentSummaries.length > 0 ? (
                dashboard.latency.environmentSummaries.map((item) => (
                  <div
                    key={item.environment}
                    className="rounded-2xl bg-paper/70 px-3 py-2.5 ring-1 ring-black/5"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="truncate text-sm font-semibold text-ink">
                        {item.environment}
                      </span>
                      <span className="text-sm font-semibold text-moss">
                        {formatLatencyMs(item.p95Ms)}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-zinc-500">
                      {t.latencyAverage}: {formatLatencyMs(item.averageMs)} ·{" "}
                      {t.latencyCount}: {item.count}
                    </p>
                  </div>
                ))
              ) : (
                <p className="rounded-2xl border border-dashed border-zinc-200 bg-paper/70 p-4 text-sm text-zinc-500">
                  {t.latencyNoData}
                </p>
              )}
            </div>
          </div>
        </div>

        <div>
          {dashboard.latency.slowest.length > 0 ? (
            <div className="space-y-3">
              {dashboard.latency.slowest.map((item) => {
                const width = Math.max(
                  8,
                  Math.round((item.p95Ms / maxP95) * 100),
                );

                return (
                  <div
                    key={`${item.kind}-${item.environment}-${item.key}`}
                    className="rounded-2xl bg-paper/70 p-3 ring-1 ring-black/5"
                  >
                    <div className="flex flex-wrap items-start gap-2">
                      <span className="inline-flex h-6 shrink-0 items-center rounded-full bg-white px-2 text-xs font-medium text-zinc-600 ring-1 ring-black/10">
                        {getLatencyKindLabel(item.kind, t)}
                      </span>
                      <span className="inline-flex h-6 shrink-0 items-center rounded-full bg-[#eef5ea] px-2 text-xs font-medium text-moss ring-1 ring-[#c1d2ba]">
                        {item.environment}
                      </span>
                      <p className="min-w-0 flex-1 break-words text-sm font-semibold text-ink">
                        {item.key}
                      </p>
                    </div>

                    <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-zinc-500 sm:grid-cols-5">
                      <span>
                        {t.latencyP95}:{" "}
                        <strong className="text-ink">
                          {formatLatencyMs(item.p95Ms)}
                        </strong>
                      </span>
                      <span>
                        {t.latencyAverage}: {formatLatencyMs(item.averageMs)}
                      </span>
                      <span>
                        {t.latencyMax}: {formatLatencyMs(item.maxMs)}
                      </span>
                      <span>
                        {t.latencySlow}: {item.slowCount}
                      </span>
                      <span>
                        {t.latencyFailed}: {item.failedCount}
                      </span>
                    </div>

                    {item.phaseLabel ? (
                      <p className="mt-2 text-xs leading-5 text-zinc-500">
                        {t.latencyPhase}: {item.phaseLabel}
                      </p>
                    ) : null}

                    <div className="mt-3 h-2 rounded-full bg-white">
                      <div
                        className="h-full rounded-full bg-sky-500"
                        style={{ width: `${width}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="rounded-2xl border border-dashed border-zinc-200 bg-paper/70 p-4 text-sm text-zinc-500">
              {t.latencyNoData}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}

export default async function AdminAnalyticsPage({
  params,
  searchParams,
}: AdminAnalyticsPageProps) {
  const { locale } = await params;
  const search = await searchParams;
  await requireAdminPageAccess(locale);
  const t = getCopy(locale);
  const windowDays = getAdminAnalyticsWindowDays(search.window);
  const activeSection = getAdminAnalyticsSection(search.section);
  const dashboard = await getAdminAnalyticsDashboard(windowDays);
  const maxSourceSurfaceCount = Math.max(
    0,
    ...dashboard.sourceSurfaces.map((source) => source.count),
  );
  const reportTargets = Object.entries(
    dashboard.operations.reports.byTargetType,
  );
  const maxReportTargetCount = Math.max(
    0,
    ...reportTargets.map(([, count]) => count),
  );
  const focusItems = getFocusItems(dashboard, locale);

  return (
    <PageContainer className="max-w-full space-y-5 overflow-x-hidden pb-32 md:space-y-6 md:pb-10 lg:!max-w-[92rem]">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">
            {t.subtitle} · {t.dataWindow(dashboard.windowDays)}
          </p>
          <h1 className="text-3xl font-semibold tracking-normal text-ink md:text-4xl">
            {t.title}
          </h1>
          <p className="max-w-4xl text-sm leading-6 text-zinc-600">
            {t.description}
          </p>
        </div>
        <div className="inline-flex h-10 items-center justify-center gap-2 rounded-full bg-white/82 px-4 text-sm font-medium text-zinc-600 ring-1 ring-black/10">
          <span className="h-2 w-2 rounded-full bg-moss" />
          {t.environment}: {dashboard.environment}
        </div>
      </div>

      <DashboardControls
        activeSection={activeSection}
        locale={locale}
        t={t}
        windowDays={windowDays}
      />

      <section className="min-w-0 overflow-hidden rounded-[1.5rem] border border-black/10 bg-white/82 shadow-sm">
        <div className="grid min-w-0 lg:grid-cols-[minmax(0,1.2fr)_minmax(22rem,0.8fr)]">
          <div className="min-w-0 bg-[#f8f4ea] p-3 sm:p-5 md:p-6">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-clay" />
              <h2 className="text-lg font-semibold text-ink">
                {t.topDecision}
              </h2>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2 sm:mt-5 sm:gap-4 xl:grid-cols-4">
              <MetricTile
                icon={UsersRound}
                label={`${t.actionUsers} · ${t.intentWindow(
                  dashboard.intentWindowDays,
                )}`}
                tone="bg-[#eef5ea] text-moss ring-[#c1d2ba]"
                value={dashboard.northStar.activeIntentUsers}
              />
              <MetricTile
                icon={TrendingUp}
                label={t.intentActions}
                tone="bg-white text-clay ring-[#f1c6ae]"
                value={dashboard.northStar.intentActionCount}
              />
              <MetricTile
                icon={BarChart3}
                label={t.conversion}
                tone="bg-sky-50 text-sky-800 ring-sky-200"
                value={`${dashboard.teamJoin.joinRate}%`}
              />
              <MetricTile
                icon={ShieldQuestion}
                label={t.pendingReports}
                tone="bg-amber-50 text-amber-800 ring-amber-200"
                value={dashboard.operations.reports.pendingCount}
              />
            </div>
          </div>
          <div className="min-w-0 border-t border-black/10 p-3 sm:p-5 md:p-6 lg:border-l lg:border-t-0">
            <FocusList items={focusItems} locale={locale} />
          </div>
        </div>
      </section>

      {activeSection === "overview" ? (
        <div className="grid min-w-0 gap-3 xl:grid-cols-[minmax(0,1.35fr)_minmax(22rem,0.65fr)]">
          <TrendPanel dashboard={dashboard} t={t} />
          <PopularItemsPanel dashboard={dashboard} t={t} />
        </div>
      ) : null}

      {activeSection === "journey" ? (
        <>
          <div className="grid min-w-0 gap-3 lg:grid-cols-3">
            <FunnelPanel
              description={t.activityDiscoveryDescription}
              metrics={[
                { label: t.viewCount, value: dashboard.discovery.listViews },
                { label: t.clickCount, value: dashboard.discovery.cardClicks },
                {
                  label: t.openRate,
                  value: `${dashboard.discovery.clickRate}%`,
                },
              ]}
              title={t.activityDiscovery}
            />
            <FunnelPanel
              description={t.activityInfoDescription}
              metrics={[
                {
                  label: t.viewCount,
                  value: dashboard.publicEventConversion.detailViews,
                },
                {
                  label: t.createdTeams,
                  value: dashboard.publicEventConversion.createdTeams,
                },
                {
                  label: t.conversion,
                  value: `${dashboard.publicEventConversion.conversionRate}%`,
                },
              ]}
              title={t.activityInfo}
            />
            <FunnelPanel
              description={t.joinDescription}
              metrics={[
                { label: t.viewCount, value: dashboard.teamJoin.detailViews },
                { label: t.clickCount, value: dashboard.teamJoin.joinClicks },
                {
                  label: t.conversion,
                  value: `${dashboard.teamJoin.joinRate}%`,
                },
              ]}
              title={t.join}
            />
          </div>

          <div className="grid min-w-0 gap-3 lg:grid-cols-2">
            <section className="min-w-0 rounded-[1.25rem] border border-black/10 bg-white/82 p-3 shadow-sm sm:p-5">
              <div className="flex items-center gap-2">
                <MessageCircle className="h-5 w-5 text-moss" />
                <h2 className="text-lg font-semibold text-ink">
                  {t.productSignals}
                </h2>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2 sm:gap-3 xl:grid-cols-4">
                <SmallStat
                  label={t.comments}
                  value={dashboard.communication.comments}
                />
                <SmallStat
                  label={t.contact}
                  value={dashboard.communication.contactClicks}
                />
                <SmallStat
                  label={t.conversations}
                  value={dashboard.communication.conversationsOpened}
                />
                <SmallStat
                  label={t.messages}
                  value={dashboard.communication.messagesSent}
                />
              </div>
              <div className="mt-5 border-t border-black/10 pt-4">
                <h3 className="font-semibold text-ink">{t.friendsTitle}</h3>
                <div className="mt-3 grid grid-cols-3 gap-2 sm:gap-3">
                  <SmallStat
                    label={t.friendSent}
                    value={dashboard.friends.sent}
                  />
                  <SmallStat
                    label={t.friendAccepted}
                    value={dashboard.friends.accepted}
                  />
                  <SmallStat
                    label={t.friendRate}
                    value={`${dashboard.friends.acceptanceRate}%`}
                  />
                </div>
              </div>
            </section>

            <section className="min-w-0 rounded-[1.25rem] border border-black/10 bg-white/82 p-3 shadow-sm sm:p-5">
              <div className="flex items-center gap-2">
                <Share2 className="h-5 w-5 text-moss" />
                <h2 className="text-lg font-semibold text-ink">
                  {t.shareTitle}
                </h2>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2 sm:gap-3 xl:grid-cols-4">
                <SmallStat
                  label={t.linksCopied}
                  value={dashboard.sharing.linksCopied}
                />
                <SmallStat
                  label={t.fieldsCopied}
                  value={dashboard.sharing.fieldsCopied}
                />
                <SmallStat
                  label={t.posters}
                  value={dashboard.sharing.postersDownloaded}
                />
                <SmallStat label={t.qr} value={dashboard.sharing.qrShared} />
              </div>
            </section>
          </div>
        </>
      ) : null}

      {activeSection === "latency" ? (
        <LatencyPanel dashboard={dashboard} t={t} />
      ) : null}

      {activeSection === "sources" ? (
        <section className="min-w-0 rounded-[1.25rem] border border-black/10 bg-white/82 p-3 shadow-sm sm:p-5">
          <div className="grid min-w-0 gap-5 lg:grid-cols-[minmax(18rem,0.75fr)_minmax(0,1.25fr)] lg:gap-6">
            <div className="lg:border-r lg:border-black/10 lg:pr-5">
              <h2 className="text-lg font-semibold text-ink">
                {t.sourceSurfaceTitle}
              </h2>
              <p className="mt-1 text-sm leading-6 text-zinc-500">
                {t.sourceSurfaceDescription}
              </p>
              <div className="mt-4 space-y-3">
                {dashboard.sourceSurfaces.length > 0 ? (
                  dashboard.sourceSurfaces.map((source) => (
                    <DataBar
                      key={source.sourceSurface}
                      label={getSourceSurfaceLabel(
                        locale,
                        source.sourceSurface,
                      )}
                      max={maxSourceSurfaceCount}
                      value={source.count}
                    />
                  ))
                ) : (
                  <p className="text-sm text-zinc-500">{t.noSources}</p>
                )}
              </div>
            </div>

            <div>
              <div className="grid min-w-0 gap-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-start">
                <div>
                  <h2 className="text-lg font-semibold text-ink">
                    {t.publicEventSources}
                  </h2>
                  <p className="mt-1 text-sm leading-6 text-zinc-500">
                    {t.publicEventSourcesDescription}
                  </p>
                </div>
                <Link
                  className="inline-flex h-10 min-w-0 items-center justify-center gap-2 rounded-full bg-white px-4 text-sm font-medium text-ink ring-1 ring-black/10 transition hover:bg-zinc-50"
                  href={withLocale(locale, "/admin/data-scraper")}
                >
                  <span className="truncate">{t.seeScraper}</span>
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>

              {dashboard.publicEventSources.length > 0 ? (
                <>
                  <div className="mt-4 grid min-w-0 gap-3 md:hidden">
                    {dashboard.publicEventSources.map((source) => (
                      <div
                        key={source.source}
                        className="min-w-0 rounded-2xl bg-paper/70 p-3 ring-1 ring-black/10"
                      >
                        <p className="truncate font-medium text-ink">
                          {getSourceLabel(locale, source.source)}
                        </p>
                        <div className="mt-2 grid grid-cols-3 gap-2 text-sm">
                          <SmallStat
                            label={t.imported}
                            value={source.importedCount}
                          />
                          <SmallStat
                            label={t.sourceClicks}
                            value={source.sourceClickCount}
                          />
                          <SmallStat
                            label={t.createdTeams}
                            value={source.convertedToTeamCount}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 hidden rounded-2xl ring-1 ring-black/10 md:block">
                    <table className="min-w-full divide-y divide-black/10 text-left text-sm">
                      <thead className="bg-paper/80 text-xs font-semibold uppercase tracking-[0.12em] text-zinc-500">
                        <tr>
                          <th className="px-4 py-3">{t.importSource}</th>
                          <th className="px-4 py-3">{t.imported}</th>
                          <th className="px-4 py-3">{t.sourceClicks}</th>
                          <th className="px-4 py-3">{t.createdTeams}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-black/5 bg-white">
                        {dashboard.publicEventSources.map((source) => (
                          <tr key={source.source}>
                            <td className="px-4 py-3 font-medium text-ink">
                              {getSourceLabel(locale, source.source)}
                            </td>
                            <td className="px-4 py-3 text-zinc-600">
                              {source.importedCount}
                            </td>
                            <td className="px-4 py-3 text-zinc-600">
                              {source.sourceClickCount}
                            </td>
                            <td className="px-4 py-3 text-zinc-600">
                              {source.convertedToTeamCount}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              ) : (
                <p className="mt-4 rounded-2xl border border-dashed border-zinc-200 bg-paper/70 p-4 text-sm text-zinc-500">
                  {t.noSources}
                </p>
              )}
            </div>
          </div>
        </section>
      ) : null}

      {activeSection === "community" ? (
        <section className="min-w-0 rounded-[1.25rem] border border-black/10 bg-white/82 p-3 shadow-sm sm:p-5">
          <div className="grid min-w-0 gap-5 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
            <div className="min-w-0">
              <div className="grid min-w-0 gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
                <div>
                  <div className="flex items-center gap-2">
                    <ShieldQuestion className="h-5 w-5 text-clay" />
                    <h2 className="text-lg font-semibold text-ink">
                      {t.communityRiskTitle}
                    </h2>
                  </div>
                  <p className="mt-1 text-sm leading-6 text-zinc-500">
                    {t.communityRiskDescription}
                  </p>
                </div>
                <Link
                  className="inline-flex h-10 min-w-0 items-center justify-center gap-2 rounded-full bg-ink px-4 text-sm font-medium text-white transition hover:bg-zinc-800"
                  href={withLocale(locale, "/admin/reports")}
                >
                  <span className="truncate">{t.seeReports}</span>
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2 sm:gap-3 xl:grid-cols-4">
                <SmallStat
                  label={t.newReports}
                  value={dashboard.operations.reports.newCount}
                />
                <SmallStat
                  label={t.pendingReports}
                  value={dashboard.operations.reports.pendingCount}
                />
                <SmallStat
                  label={t.reviewedReports}
                  value={dashboard.operations.reports.reviewedCount}
                />
                <SmallStat
                  label={t.reviewTime}
                  value={formatReviewTime(
                    locale,
                    dashboard.operations.reports.averageReviewHours,
                    t.reviewTimeEmpty,
                  )}
                />
              </div>
            </div>

            <div className="border-t border-black/10 pt-4 lg:border-l lg:border-t-0 lg:pl-5 lg:pt-0">
              <h3 className="font-semibold text-ink">{t.reportTargets}</h3>
              <div className="mt-4 space-y-3">
                {reportTargets.map(([targetType, count]) => (
                  <DataBar
                    key={targetType}
                    label={getReportTargetLabel(locale, targetType, t)}
                    max={maxReportTargetCount}
                    value={count}
                  />
                ))}
              </div>
            </div>
          </div>
        </section>
      ) : null}
    </PageContainer>
  );
}

import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  Flag,
  MessageCircle,
  MousePointerClick,
  Share2,
  ShieldQuestion,
  Sparkles,
  TrendingUp,
  UsersRound,
  type LucideIcon,
} from "lucide-react";
import { PageContainer } from "@/components/layout/PageContainer";
import {
  getAdminAnalyticsDashboard,
  type AdminAnalyticsDashboard,
} from "@/features/analytics/queries/getAdminAnalyticsDashboard";
import { requireAdminPageAccess } from "@/lib/admin-auth";
import { withLocale } from "@/lib/routes";

export const dynamic = "force-dynamic";

type AdminAnalyticsPageProps = {
  params: Promise<{
    locale: string;
  }>;
};

function getCopy(locale: string) {
  if (locale === "fr") {
    return {
      actionUsers: "Utilisateurs actifs",
      activityDiscovery: "Découverte",
      activityDiscoveryDescription: "Les cartes donnent-elles envie d'ouvrir ?",
      activityInfo: "Activités",
      activityInfoDescription: "Les activités publiques créent-elles des groupes ?",
      adminShortcuts: "Actions",
      comments: "Commentaires",
      contact: "Contacts",
      conversations: "Discussions ouvertes",
      conversion: "Conversion",
      createdTeams: "Groupes créés",
      dataWindow: (days: number) => `${days} derniers jours`,
      description:
        "Vue courte pour suivre la découverte, les groupes, les inscriptions, la communauté et les sources publiques.",
      environment: "Environnement",
      fieldsCopied: "Champs copiés",
      friendAccepted: "Acceptées",
      friendRate: "Taux d'acceptation",
      friendSent: "Demandes",
      friendsTitle: "Amis",
      importSource: "Source",
      imported: "Importées",
      intentActions: "Actions réelles",
      intentWindow: (days: number) => `${days} jours`,
      join: "Inscriptions",
      joinDescription: "Les pages groupe déclenchent-elles une inscription ?",
      linksCopied: "Liens copiés",
      messages: "Messages",
      noSources: "Pas encore assez de données de source.",
      pendingReports: "À traiter",
      posters: "Affiches",
      productSignals: "Signaux produit",
      publicEventSources: "Sources publiques",
      publicEventSourcesDescription:
        "Comparer les sources par imports, clics et groupes créés.",
      qr: "QR codes",
      reportTargets: "Signalements",
      reviewTime: "Délai moyen",
      seeReports: "Traiter les signalements",
      seeScraper: "Gérer les imports",
      shareTitle: "Partage",
      sourceClicks: "Clics source",
      sourceSurfaceTitle: "Entrées des groupes",
      sourceSurfaceDescription: "D'où viennent les visites de pages groupe.",
      subtitle: "Données",
      title: "Pilotage",
      topDecision: "À suivre maintenant",
      viewCount: "Vues",
      clickCount: "Clics",
      openRate: "Taux d'ouverture",
    };
  }

  if (locale === "en") {
    return {
      actionUsers: "Active intent users",
      activityDiscovery: "Discovery",
      activityDiscoveryDescription: "Do cards make people open details?",
      activityInfo: "Activity info",
      activityInfoDescription: "Do public activities turn into crews?",
      adminShortcuts: "Actions",
      comments: "Comments",
      contact: "Organizer contact",
      conversations: "Chats opened",
      conversion: "Conversion",
      createdTeams: "Crews created",
      dataWindow: (days: number) => `Last ${days} days`,
      description:
        "A focused dashboard for discovery, crews, joins, community signals, and public activity sources.",
      environment: "Environment",
      fieldsCopied: "Fields copied",
      friendAccepted: "Accepted",
      friendRate: "Accept rate",
      friendSent: "Requests",
      friendsTitle: "Friends",
      importSource: "Source",
      imported: "Imported",
      intentActions: "Real actions",
      intentWindow: (days: number) => `${days} days`,
      join: "Join funnel",
      joinDescription: "Do crew pages convert into joins?",
      linksCopied: "Links copied",
      messages: "Messages",
      noSources: "Not enough source data yet.",
      pendingReports: "Pending",
      posters: "Posters",
      productSignals: "Product signals",
      publicEventSources: "Public sources",
      publicEventSourcesDescription:
        "Compare sources by imports, clicks, and crews created.",
      qr: "QR codes",
      reportTargets: "Reports",
      reviewTime: "Avg. review",
      seeReports: "Review reports",
      seeScraper: "Manage imports",
      shareTitle: "Sharing",
      sourceClicks: "Source clicks",
      sourceSurfaceTitle: "Crew entry points",
      sourceSurfaceDescription: "Where crew detail visits came from.",
      subtitle: "Data",
      title: "Operations dashboard",
      topDecision: "Watch now",
      viewCount: "Views",
      clickCount: "Clicks",
      openRate: "Open rate",
    };
  }

  return {
    actionUsers: "真实行动用户",
    activityDiscovery: "活动发现",
    activityDiscoveryDescription: "活动卡片是否吸引用户点开。",
    activityInfo: "活动信息",
    activityInfoDescription: "公共活动是否真的促成组队。",
    adminShortcuts: "快捷处理",
    comments: "评论回复",
    contact: "联系发起人",
    conversations: "打开私聊",
    conversion: "转化率",
    createdTeams: "转成组队",
    dataWindow: (days: number) => `最近 ${days} 天`,
    description:
      "集中查看活动发现、组队、报名、沟通、分享、举报和公共来源表现。",
    environment: "环境",
    fieldsCopied: "字段复制",
    friendAccepted: "通过",
    friendRate: "通过率",
    friendSent: "申请",
    friendsTitle: "好友关系",
    importSource: "来源",
    imported: "导入",
    intentActions: "真实动作",
    intentWindow: (days: number) => `近 ${days} 天`,
    join: "报名转化",
    joinDescription: "组队详情是否能促成真实报名。",
    linksCopied: "链接复制",
    messages: "消息发送",
    noSources: "暂无足够来源数据。",
    pendingReports: "待处理",
    posters: "宣传图",
    productSignals: "产品信号",
    publicEventSources: "公共活动来源",
    publicEventSourcesDescription: "对比来源的导入量、点击量和转组队结果。",
    qr: "二维码",
    reportTargets: "举报对象",
    reviewTime: "平均处理",
    seeReports: "处理举报",
    seeScraper: "管理导入",
    shareTitle: "分享传播",
    sourceClicks: "来源点击",
    sourceSurfaceTitle: "组队入口来源",
    sourceSurfaceDescription: "用户从哪里进入组队详情。",
    subtitle: "数据后台",
    title: "运营看板",
    topDecision: "现在重点",
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
    public_event_detail: "活动信息",
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
    return locale === "fr"
      ? "Manuel"
      : locale === "en"
        ? "Manual"
        : "手动维护";
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
    <div className="rounded-[1rem] bg-white/82 p-4 shadow-sm ring-1 ring-black/10">
      <span
        className={`inline-flex h-9 w-9 items-center justify-center rounded-full ring-1 ${tone}`}
      >
        <Icon className="h-4 w-4" />
      </span>
      <p className="mt-3 text-2xl font-semibold tracking-normal text-ink">
        {value}
      </p>
      <p className="mt-1 text-sm text-zinc-500">{label}</p>
    </div>
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
    <section className="rounded-[1.25rem] border border-black/10 bg-white/82 p-4 shadow-sm">
      <h2 className="text-lg font-semibold text-ink">{title}</h2>
      <p className="mt-1 text-sm leading-6 text-zinc-500">{description}</p>
      <div className="mt-4 grid grid-cols-3 gap-2">
        {metrics.map((metric) => (
          <div key={metric.label} className="rounded-xl bg-paper/70 px-3 py-3">
            <p className="text-xl font-semibold text-ink">{metric.value}</p>
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

export default async function AdminAnalyticsPage({
  params,
}: AdminAnalyticsPageProps) {
  const { locale } = await params;
  await requireAdminPageAccess(locale);
  const t = getCopy(locale);
  const dashboard = await getAdminAnalyticsDashboard();
  const maxSourceSurfaceCount = Math.max(
    0,
    ...dashboard.sourceSurfaces.map((source) => source.count),
  );

  return (
    <PageContainer className="space-y-5 pb-32 md:space-y-6 md:pb-10 lg:!max-w-[92rem]">
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

      <section className="rounded-[1.5rem] border border-black/10 bg-[#f8f4ea] p-4 shadow-sm sm:p-5">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-clay" />
          <h2 className="text-lg font-semibold text-ink">{t.topDecision}</h2>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
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
      </section>

      <div className="grid gap-3 lg:grid-cols-3">
        <FunnelPanel
          description={t.activityDiscoveryDescription}
          metrics={[
            { label: t.viewCount, value: dashboard.discovery.listViews },
            { label: t.clickCount, value: dashboard.discovery.cardClicks },
            { label: t.openRate, value: `${dashboard.discovery.clickRate}%` },
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
            { label: t.conversion, value: `${dashboard.teamJoin.joinRate}%` },
          ]}
          title={t.join}
        />
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <section className="rounded-[1.25rem] border border-black/10 bg-white/82 p-4 shadow-sm sm:p-5">
          <div className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-moss" />
            <h2 className="text-lg font-semibold text-ink">
              {t.productSignals}
            </h2>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <MetricTile icon={MessageCircle} label={t.comments} value={dashboard.communication.comments} />
            <MetricTile icon={UsersRound} label={t.contact} value={dashboard.communication.contactClicks} />
            <MetricTile icon={MessageCircle} label={t.conversations} value={dashboard.communication.conversationsOpened} />
            <MetricTile icon={MessageCircle} label={t.messages} value={dashboard.communication.messagesSent} />
          </div>
          <div className="mt-3 grid grid-cols-3 gap-3">
            <MetricTile icon={UsersRound} label={t.friendSent} value={dashboard.friends.sent} />
            <MetricTile icon={UsersRound} label={t.friendAccepted} value={dashboard.friends.accepted} />
            <MetricTile icon={TrendingUp} label={t.friendRate} value={`${dashboard.friends.acceptanceRate}%`} />
          </div>
        </section>

        <section className="rounded-[1.25rem] border border-black/10 bg-white/82 p-4 shadow-sm sm:p-5">
          <div className="flex items-center gap-2">
            <Share2 className="h-5 w-5 text-moss" />
            <h2 className="text-lg font-semibold text-ink">{t.shareTitle}</h2>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <MetricTile icon={Share2} label={t.linksCopied} value={dashboard.sharing.linksCopied} />
            <MetricTile icon={Share2} label={t.fieldsCopied} value={dashboard.sharing.fieldsCopied} />
            <MetricTile icon={Share2} label={t.posters} value={dashboard.sharing.postersDownloaded} />
            <MetricTile icon={Share2} label={t.qr} value={dashboard.sharing.qrShared} />
          </div>

          <div className="mt-4 rounded-2xl bg-paper/70 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="font-semibold text-ink">
                  {t.sourceSurfaceTitle}
                </h3>
                <p className="mt-1 text-sm leading-6 text-zinc-500">
                  {t.sourceSurfaceDescription}
                </p>
              </div>
            </div>
            <div className="mt-4 space-y-3">
              {dashboard.sourceSurfaces.length > 0 ? (
                dashboard.sourceSurfaces.map((source) => (
                  <DataBar
                    key={source.sourceSurface}
                    label={getSourceSurfaceLabel(locale, source.sourceSurface)}
                    max={maxSourceSurfaceCount}
                    value={source.count}
                  />
                ))
              ) : (
                <p className="text-sm text-zinc-500">{t.noSources}</p>
              )}
            </div>
          </div>
        </section>
      </div>

      <section className="rounded-[1.25rem] border border-black/10 bg-white/82 p-4 shadow-sm sm:p-5">
        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-start">
          <div>
            <h2 className="text-lg font-semibold text-ink">
              {t.publicEventSources}
            </h2>
            <p className="mt-1 text-sm leading-6 text-zinc-500">
              {t.publicEventSourcesDescription}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              className="inline-flex h-10 items-center justify-center gap-2 whitespace-nowrap rounded-full bg-white px-4 text-sm font-medium text-ink ring-1 ring-black/10 transition hover:bg-zinc-50"
              href={withLocale(locale, "/admin/data-scraper")}
            >
              {t.seeScraper}
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              className="inline-flex h-10 items-center justify-center gap-2 whitespace-nowrap rounded-full bg-ink px-4 text-sm font-medium text-white transition hover:bg-zinc-800"
              href={withLocale(locale, "/admin/reports")}
            >
              {t.seeReports}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>

        {dashboard.publicEventSources.length > 0 ? (
          <div className="mt-4 overflow-x-auto rounded-2xl ring-1 ring-black/10">
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
        ) : (
          <p className="mt-4 rounded-2xl border border-dashed border-zinc-200 bg-paper/70 p-4 text-sm text-zinc-500">
            {t.noSources}
          </p>
        )}
      </section>
    </PageContainer>
  );
}

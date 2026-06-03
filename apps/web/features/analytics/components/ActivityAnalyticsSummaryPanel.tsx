import { BarChart3 } from "lucide-react";
import type { ActivityAnalyticsSummary } from "@/features/analytics/queries/getActivityAnalyticsSummary";

type ActivityAnalyticsSummaryPanelProps = {
  locale: string;
  summary: ActivityAnalyticsSummary | null;
};

function getCopy(locale: string) {
  if (locale === "fr") {
    return {
      title: "Performance",
      subtitle: (days: number) => `${days} derniers jours`,
      views: "Vues",
      uniqueViews: "Visiteurs",
      joinStarted: "Clics inscription",
      joinSubmitted: "Inscriptions",
      conversion: "Conversion",
      comments: "Discussions",
      contact: "Contacts",
      share: "Partages",
      source: "Premiere entree",
      sourceFallback: "Pas encore assez de donnees",
    };
  }

  if (locale === "en") {
    return {
      title: "Activity data",
      subtitle: (days: number) => `Last ${days} days`,
      views: "Views",
      uniqueViews: "Visitors",
      joinStarted: "Join clicks",
      joinSubmitted: "Joined",
      conversion: "Conversion",
      comments: "Comments",
      contact: "Contact",
      share: "Shares",
      source: "Top entry",
      sourceFallback: "Not enough data yet",
    };
  }

  return {
    title: "活动数据",
    subtitle: (days: number) => `近 ${days} 天`,
    views: "浏览次数",
    uniqueViews: "浏览人数",
    joinStarted: "报名点击",
    joinSubmitted: "报名成功",
    conversion: "转化率",
    comments: "评论回复",
    contact: "联系发起人",
    share: "分享复制",
    source: "主要入口",
    sourceFallback: "暂无足够数据",
  };
}

function getSourceLabel(locale: string, sourceSurface: string | null) {
  if (!sourceSurface) return null;

  const zh: Record<string, string> = {
    activity_detail: "活动详情",
    activity_list: "活动发现",
    friend_activity: "好友动态",
    global_search: "全站搜索",
    home_recent: "首页推荐",
    messages: "消息",
    notification: "通知",
    profile: "个人空间",
    public_event_detail: "活动信息页",
    share_link: "分享链接",
  };
  const en: Record<string, string> = {
    activity_detail: "Activity detail",
    activity_list: "Activities",
    friend_activity: "Friends",
    global_search: "Search",
    home_recent: "Home",
    messages: "Messages",
    notification: "Notifications",
    profile: "Profile",
    public_event_detail: "Event detail",
    share_link: "Shared link",
  };
  const fr: Record<string, string> = {
    activity_detail: "Detail",
    activity_list: "Activites",
    friend_activity: "Amis",
    global_search: "Recherche",
    home_recent: "Accueil",
    messages: "Messages",
    notification: "Notifications",
    profile: "Profil",
    public_event_detail: "Evenement",
    share_link: "Lien partage",
  };
  const labels = locale === "fr" ? fr : locale === "en" ? en : zh;

  return labels[sourceSurface] ?? sourceSurface;
}

export function ActivityAnalyticsSummaryPanel({
  locale,
  summary,
}: ActivityAnalyticsSummaryPanelProps) {
  if (!summary) {
    return null;
  }

  const t = getCopy(locale);
  const sourceLabel =
    getSourceLabel(locale, summary.topSourceSurface) ?? t.sourceFallback;
  const metrics = [
    { label: t.views, value: summary.viewCount },
    { label: t.uniqueViews, value: summary.uniqueViewCount },
    { label: t.joinStarted, value: summary.joinStartedCount },
    { label: t.joinSubmitted, value: summary.joinSubmittedCount },
    { label: t.comments, value: summary.commentCount },
    { label: t.contact, value: summary.contactCount },
    { label: t.share, value: summary.shareActionCount },
  ];

  return (
    <section className="mb-3 rounded-[1rem] border border-[#d8ccb4] bg-[#fffaf1] p-3">
      <div className="flex items-start gap-2">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-[#8a6a40] ring-1 ring-[#dccba8]">
          <BarChart3 className="h-4 w-4" />
        </span>
        <div className="min-w-0">
          <p className="font-semibold text-ink">{t.title}</p>
          <p className="mt-0.5 text-xs text-zinc-500">
            {t.subtitle(summary.windowDays)}
          </p>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
        {metrics.map((metric) => (
          <div
            className="rounded-xl bg-white/75 px-3 py-2 ring-1 ring-black/5"
            key={metric.label}
          >
            <p className="text-lg font-semibold text-ink">{metric.value}</p>
            <p className="mt-0.5 text-xs text-zinc-500">{metric.label}</p>
          </div>
        ))}
      </div>

      <div className="mt-2 grid gap-2 sm:grid-cols-2">
        <div className="rounded-xl bg-white/75 px-3 py-2 ring-1 ring-black/5">
          <p className="text-lg font-semibold text-ink">
            {summary.conversionRate}%
          </p>
          <p className="mt-0.5 text-xs text-zinc-500">{t.conversion}</p>
        </div>
        <div className="rounded-xl bg-white/75 px-3 py-2 ring-1 ring-black/5">
          <p className="truncate text-sm font-semibold text-ink">
            {sourceLabel}
          </p>
          <p className="mt-0.5 text-xs text-zinc-500">{t.source}</p>
        </div>
      </div>
    </section>
  );
}

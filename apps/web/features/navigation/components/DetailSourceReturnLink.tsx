"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useEffect, useState } from "react";
import {
  type DetailSourceContext,
  getDetailSourceForCurrentTarget,
} from "@/features/navigation/contextualDetailReturn";
import { cn } from "@/lib/utils";

function getFallbackLabel(sourceKey: DetailSourceContext["sourceKey"], locale: string) {
  if (locale === "fr") {
    const labels: Record<DetailSourceContext["sourceKey"], string> = {
      activity_detail: "Retour a la sortie",
      activity_list: "Retour aux activites",
      admin_analytics: "Retour aux statistiques",
      admin_reports: "Retour aux signalements",
      friends: "Retour aux amis",
      home: "Retour a l'accueil",
      lobby: "Retour au hall",
      merchant: "Retour au lieu",
      messages: "Retour au chat",
      notifications: "Retour aux notifications",
      profile: "Retour au profil",
      public_event: "Retour a l'activite",
      search: "Retour aux resultats",
    };

    return labels[sourceKey];
  }

  if (locale === "en") {
    const labels: Record<DetailSourceContext["sourceKey"], string> = {
      activity_detail: "Back to activity",
      activity_list: "Back to activities",
      admin_analytics: "Back to analytics",
      admin_reports: "Back to reports",
      friends: "Back to friends",
      home: "Back to home",
      lobby: "Back to lobby",
      merchant: "Back to place",
      messages: "Back to chat",
      notifications: "Back to notifications",
      profile: "Back to profile",
      public_event: "Back to activity",
      search: "Back to results",
    };

    return labels[sourceKey];
  }

  const labels: Record<DetailSourceContext["sourceKey"], string> = {
    activity_detail: "返回活动详情",
    activity_list: "返回活动大厅",
    admin_analytics: "返回运营看板",
    admin_reports: "返回举报处理",
    friends: "返回好友页",
    home: "返回首页",
    lobby: "返回组队大厅",
    merchant: "返回商家页",
    messages: "返回聊天",
    notifications: "返回通知中心",
    profile: "返回个人空间",
    public_event: "返回活动详情",
    search: "返回搜索结果",
  };

  return labels[sourceKey];
}

export function DetailSourceReturnLink({
  className,
  locale,
}: {
  className?: string;
  locale: string;
}) {
  const [context, setContext] = useState<DetailSourceContext | null>(null);

  useEffect(() => {
    setContext(getDetailSourceForCurrentTarget());
  }, []);

  if (!context) {
    return null;
  }

  const label = context.sourceLabel || getFallbackLabel(context.sourceKey, locale);

  return (
    <Link
      className={cn(
        "inline-flex h-9 max-w-full items-center gap-2 rounded-full border border-[#dfccb2] bg-white/86 px-3.5 text-sm font-semibold text-[#5f5448] shadow-sm transition hover:bg-white hover:text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-[#d88d72]/30",
        className,
      )}
      href={context.sourceHref}
    >
      <ArrowLeft className="h-4 w-4 shrink-0" aria-hidden="true" />
      <span className="truncate">{label}</span>
    </Link>
  );
}


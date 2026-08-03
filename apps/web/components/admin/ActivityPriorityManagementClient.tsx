"use client";

import { useMemo, useState } from "react";
import {
  ArrowUpRight,
  CalendarDays,
  Loader2,
  MoreHorizontal,
  RotateCcw,
  Save,
  Search,
  SlidersHorizontal,
  Sparkles,
  X,
} from "lucide-react";
import { toast, Toaster } from "sonner";
import { Button } from "@chill-club/ui";
import type {
  ActivityPriorityAdminSnapshot,
  AdminActivityPriorityItem,
} from "@/features/activities/priority/adminActivityPriority";
import type { ActivityPriorityTargetTypeValue } from "@/features/activities/priority/activityPriority";
import { cn } from "@/lib/utils";
import { withLocale } from "@/lib/routes";

type ActivityPriorityManagementClientProps = {
  initialItems: AdminActivityPriorityItem[];
  locale: string;
};

type ActivityPriorityAdminMenuProps = {
  initialSnapshot: ActivityPriorityAdminSnapshot;
  locale: string;
  targetId: string;
  targetTitle: string;
  targetType: ActivityPriorityTargetTypeValue;
};

type UpdatePayload = {
  initialBoost: number;
  item?: AdminActivityPriorityItem;
  locale: string;
  note?: string;
  targetId: string;
  targetType: ActivityPriorityTargetTypeValue;
};

const quickBoostOptions = [1, 3, 7, 14];

function getTargetTypeLabel(type: ActivityPriorityTargetTypeValue) {
  return type === "PUBLIC_EVENT" ? "活动" : "聚吧";
}

function getDetailPath(type: ActivityPriorityTargetTypeValue, id: string) {
  return type === "PUBLIC_EVENT" ? `/public-events/${id}` : `/lobby/${id}`;
}

function formatDate(value: string | null | undefined, locale: string) {
  if (!value) {
    return "无";
  }

  return new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "2-digit",
  }).format(new Date(value));
}

function formatScore(value: number) {
  return value.toFixed(2).replace(/\.?0+$/, "");
}

async function updatePriority(payload: UpdatePayload) {
  const response = await fetch("/api/admin/activity-priority", {
    body: JSON.stringify(payload),
    headers: {
      "Content-Type": "application/json",
    },
    method: "PUT",
  });
  const result = (await response.json().catch(() => null)) as {
    error?: string;
    item?: AdminActivityPriorityItem;
  } | null;

  if (!response.ok || !result?.item) {
    throw new Error(result?.error ?? "保存失败");
  }

  return result.item;
}

function PriorityStats({
  activeBoost,
  finalScore,
  timeScore,
}: {
  activeBoost: number;
  finalScore: number;
  timeScore: number;
}) {
  return (
    <div className="grid grid-cols-3 gap-2 text-xs">
      <span className="rounded-full bg-[#F5F5F2] px-2.5 py-1 font-semibold text-zinc-700">
        时间 {formatScore(timeScore)}
      </span>
      <span className="rounded-full bg-[#ECF7EF] px-2.5 py-1 font-semibold text-[#0F6D46]">
        提升 {activeBoost}
      </span>
      <span className="rounded-full bg-[#FFF7E1] px-2.5 py-1 font-semibold text-[#99630A]">
        总分 {formatScore(finalScore)}
      </span>
    </div>
  );
}

export function ActivityPriorityManagementClient({
  initialItems,
  locale,
}: ActivityPriorityManagementClientProps) {
  const [items, setItems] = useState(initialItems);
  const [query, setQuery] = useState("");
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const activeCount = items.filter((item) => item.activeBoost > 0).length;
  const filteredItems = useMemo(() => {
    const keyword = query.trim().toLowerCase();

    if (!keyword) {
      return items;
    }

    return items.filter((item) =>
      [item.title, item.city, item.targetId]
        .join(" ")
        .toLowerCase()
        .includes(keyword),
    );
  }, [items, query]);

  async function saveItem(item: AdminActivityPriorityItem, boost: number) {
    const key = `${item.targetType}:${item.targetId}`;
    setSavingKey(key);

    try {
      const nextItem = await updatePriority({
        initialBoost: boost,
        locale,
        note: item.note ?? undefined,
        targetId: item.targetId,
        targetType: item.targetType,
      });
      setItems((currentItems) => {
        const existingIndex = currentItems.findIndex(
          (currentItem) =>
            currentItem.targetId === nextItem.targetId &&
            currentItem.targetType === nextItem.targetType,
        );

        if (existingIndex < 0) {
          return [nextItem, ...currentItems];
        }

        return currentItems.map((currentItem, index) =>
          index === existingIndex ? nextItem : currentItem,
        );
      });
      toast.success(boost > 0 ? `已提升 ${boost} 天` : "已清除提升");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "保存失败");
    } finally {
      setSavingKey(null);
    }
  }

  return (
    <div className="space-y-5">
      <Toaster position="top-center" richColors closeButton />

      <div className="flex flex-col gap-3 border-b border-[#E7E1CA] pb-4 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-wrap items-center gap-2 text-sm font-semibold text-zinc-700">
          <span>已调整 {items.length}</span>
          <span className="h-1 w-1 rounded-full bg-zinc-300" />
          <span>生效中 {activeCount}</span>
        </div>
        <label className="flex h-10 min-w-0 items-center gap-2 rounded-full bg-white px-3 text-sm ring-1 ring-[#D6D5B2] md:w-80">
          <Search className="h-4 w-4 shrink-0 text-zinc-400" />
          <input
            className="min-w-0 flex-1 bg-transparent font-semibold text-zinc-700 outline-none placeholder:text-zinc-400"
            onChange={(event) => setQuery(event.target.value)}
            placeholder="搜索活动、城市或 ID"
            value={query}
          />
        </label>
      </div>

      {filteredItems.length === 0 ? (
        <div className="rounded-2xl bg-white px-5 py-12 text-center text-sm font-semibold text-zinc-500 ring-1 ring-[#E7E1CA]">
          还没有调整记录。
        </div>
      ) : (
        <div className="space-y-3">
          {filteredItems.map((item) => {
            const key = `${item.targetType}:${item.targetId}`;
            const isSaving = savingKey === key;

            return (
              <article
                className="grid gap-4 rounded-2xl bg-white p-3 ring-1 ring-[#E7E1CA] md:grid-cols-[5.75rem_minmax(0,1fr)_18rem] md:items-center"
                key={key}
              >
                <div className="aspect-[4/3] overflow-hidden rounded-xl bg-[#F5F5F2]">
                  {item.coverImageUrl ? (
                    <div
                      aria-hidden="true"
                      className="h-full w-full bg-cover bg-center"
                      style={{
                        backgroundImage: `url("${item.coverImageUrl}")`,
                      }}
                    />
                  ) : null}
                </div>
                <div className="min-w-0 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-[#ECF7EF] px-2.5 py-1 text-xs font-black text-[#0F6D46]">
                      {getTargetTypeLabel(item.targetType)}
                    </span>
                    <span className="rounded-full bg-[#F5F5F2] px-2.5 py-1 text-xs font-semibold text-zinc-500">
                      {item.city}
                    </span>
                    <span className="text-xs font-semibold text-zinc-400">
                      更新 {formatDate(item.updatedAt, locale)}
                    </span>
                  </div>
                  <h2 className="line-clamp-2 text-base font-black leading-6 text-[#111210]">
                    {item.title}
                  </h2>
                  <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-zinc-500">
                    <CalendarDays className="h-3.5 w-3.5" />
                    <span>{formatDate(item.startAt, locale)}</span>
                    {item.updatedByName ? (
                      <span>由 {item.updatedByName} 调整</span>
                    ) : null}
                  </div>
                  <PriorityStats
                    activeBoost={item.activeBoost}
                    finalScore={item.finalScore}
                    timeScore={item.timeScore}
                  />
                </div>
                <div className="space-y-2">
                  <div className="grid grid-cols-4 gap-2">
                    {quickBoostOptions.map((boost) => (
                      <button
                        className={cn(
                          "h-9 rounded-full text-xs font-black ring-1 transition active:scale-95",
                          item.initialBoost === boost
                            ? "bg-[#0F6D46] text-white ring-[#0F6D46]"
                            : "bg-white text-[#0F6D46] ring-[#D6D5B2] hover:bg-[#F5F5F2]",
                        )}
                        disabled={isSaving}
                        key={boost}
                        onClick={() => void saveItem(item, boost)}
                        type="button"
                      >
                        +{boost}
                      </button>
                    ))}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <a
                      className="inline-flex h-9 items-center justify-center gap-1 rounded-full bg-white text-xs font-black text-[#0F6D46] ring-1 ring-[#D6D5B2] transition hover:bg-[#F5F5F2]"
                      href={withLocale(
                        locale,
                        getDetailPath(item.targetType, item.targetId),
                      )}
                    >
                      查看
                      <ArrowUpRight className="h-3.5 w-3.5" />
                    </a>
                    <button
                      className="inline-flex h-9 items-center justify-center gap-1 rounded-full bg-white text-xs font-black text-[#B5301F] ring-1 ring-[#F09182]/50 transition hover:bg-[#FFF5F0]"
                      disabled={isSaving}
                      onClick={() => void saveItem(item, 0)}
                      type="button"
                    >
                      {isSaving ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <RotateCcw className="h-3.5 w-3.5" />
                      )}
                      清除
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function ActivityPriorityAdminMenu({
  initialSnapshot,
  locale,
  targetId,
  targetTitle,
  targetType,
}: ActivityPriorityAdminMenuProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [boost, setBoost] = useState(initialSnapshot.initialBoost);
  const [note, setNote] = useState(initialSnapshot.note ?? "");
  const [snapshot, setSnapshot] = useState(initialSnapshot);

  async function saveBoost(nextBoost = boost) {
    setIsSaving(true);

    try {
      const item = await updatePriority({
        initialBoost: nextBoost,
        locale,
        note,
        targetId,
        targetType,
      });
      setBoost(item.initialBoost);
      setSnapshot({
        activeBoost: item.activeBoost,
        boostExpiresAt: item.boostExpiresAt,
        boostStartedAt: item.boostStartedAt,
        finalScore: item.finalScore,
        initialBoost: item.initialBoost,
        note: item.note,
        targetId,
        targetType,
        timeScore: item.timeScore,
      });
      toast.success(nextBoost > 0 ? `已提升 ${nextBoost} 天` : "已清除提升");
      setIsEditorOpen(false);
      setIsMenuOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "保存失败");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <>
      <Toaster position="top-center" richColors closeButton />
      <div className="relative">
        <button
          aria-label="活动管理"
          className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/95 text-[#111210] ring-1 ring-[#D6D5B2] transition hover:bg-white active:scale-95"
          onClick={() => setIsMenuOpen((current) => !current)}
          type="button"
        >
          <MoreHorizontal className="h-5 w-5" />
        </button>
        {isMenuOpen ? (
          <div className="absolute right-0 top-12 z-50 w-56 rounded-2xl bg-white p-2 text-sm font-semibold text-[#111210] shadow-[0_18px_44px_rgba(17,18,16,0.14)] ring-1 ring-[#E7E1CA]">
            <button
              className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left transition hover:bg-[#F5F5F2]"
              onClick={() => {
                setIsEditorOpen(true);
                setIsMenuOpen(false);
              }}
              type="button"
            >
              <SlidersHorizontal className="h-4 w-4 text-[#0F6D46]" />
              调整活动权重
            </button>
            <a
              className="flex items-center gap-2 rounded-xl px-3 py-2.5 transition hover:bg-[#F5F5F2]"
              href={withLocale(locale, "/admin/activity-priority")}
            >
              <Sparkles className="h-4 w-4 text-[#0F6D46]" />
              权重总控台
            </a>
          </div>
        ) : null}
      </div>

      {isEditorOpen ? (
        <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/34 p-4 sm:items-center">
          <div className="w-full max-w-md rounded-[1.35rem] bg-white p-4 shadow-[0_24px_70px_rgba(17,18,16,0.2)] ring-1 ring-[#E7E1CA]">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-black uppercase tracking-[0.16em] text-[#0F6D46]">
                  活动权重
                </p>
                <h2 className="mt-1 line-clamp-2 text-lg font-black leading-6 text-[#111210]">
                  {targetTitle}
                </h2>
              </div>
              <button
                aria-label="关闭"
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#F5F5F2] text-zinc-600 transition active:scale-95"
                onClick={() => setIsEditorOpen(false)}
                type="button"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4">
              <PriorityStats
                activeBoost={snapshot.activeBoost}
                finalScore={snapshot.finalScore}
                timeScore={snapshot.timeScore}
              />
              <p className="mt-2 text-xs font-semibold leading-5 text-zinc-500">
                设为 N 天后，每天自动减 1；降到 0 后不再影响排序。
              </p>
            </div>

            <div className="mt-4 grid grid-cols-4 gap-2">
              {quickBoostOptions.map((option) => (
                <button
                  className={cn(
                    "h-10 rounded-full text-sm font-black ring-1 transition active:scale-95",
                    boost === option
                      ? "bg-[#0F6D46] text-white ring-[#0F6D46]"
                      : "bg-white text-[#0F6D46] ring-[#D6D5B2]",
                  )}
                  disabled={isSaving}
                  key={option}
                  onClick={() => setBoost(option)}
                  type="button"
                >
                  +{option}
                </button>
              ))}
            </div>

            <textarea
              className="mt-4 min-h-20 w-full resize-none rounded-2xl bg-white p-3 text-sm font-semibold leading-6 text-zinc-700 outline-none ring-1 ring-[#D6D5B2] placeholder:text-zinc-400 focus:ring-[#0F6D46]"
              maxLength={240}
              onChange={(event) => setNote(event.target.value)}
              placeholder="备注，仅管理员可见"
              value={note}
            />

            <div className="mt-4 grid grid-cols-[0.8fr_1.2fr] gap-2">
              <Button
                className="h-11 rounded-full bg-white text-[#B5301F] ring-1 ring-[#F09182]/56 hover:bg-[#FFF5F0]"
                disabled={isSaving}
                onClick={() => void saveBoost(0)}
                type="button"
              >
                清除
              </Button>
              <Button
                className="h-11 rounded-full bg-[#0F6D46] text-white hover:bg-[#0B5D3B]"
                disabled={isSaving}
                onClick={() => void saveBoost(boost)}
                type="button"
              >
                {isSaving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                保存
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

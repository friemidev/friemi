"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type CSSProperties } from "react";
import { ArrowUpRight, Plus } from "lucide-react";
import { withLocale } from "@/lib/routes";
import { RetainedImage } from "@/components/media/RetainedImage";
import {
  getNowCopy,
  getNowIntentWindowLabel,
  getNowKind,
  getNowKindLabel,
  nowKinds,
} from "./now";
import styles from "./NowBubbleField.module.css";

export type NowBubbleItem = {
  id: string;
  category: string;
  intentWindow: string;
  title: string;
  area: string;
  createdAt: string;
  expiresAt: string;
  interestCount: number;
  size: "small" | "medium" | "large";
  avatars: { name: string; url: string | null }[];
};

const bubbleSlots: Record<number, number[]> = {
  1: [4],
  2: [1, 3],
  3: [1, 4, 3],
  4: [1, 3, 5, 7],
  5: [1, 3, 4, 5, 7],
  6: [1, 2, 3, 4, 5, 7],
  7: [1, 2, 3, 4, 5, 6, 7],
};

function remainingLabel(expiresAt: string, now: number, locale: string) {
  const minutes = Math.max(
    0,
    Math.ceil((Date.parse(expiresAt) - now) / 60_000),
  );
  if (minutes < 60)
    return locale === "zh-CN" ? `${minutes} 分钟` : `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  return locale === "zh-CN"
    ? `${hours}小时 ${minutes % 60}分`
    : `${hours}h ${minutes % 60}m`;
}

function compactRemainingLabel(expiresAt: string, now: number, locale: string) {
  if (locale !== "zh-CN") return remainingLabel(expiresAt, now, locale);
  const minutes = Math.max(
    0,
    Math.ceil((Date.parse(expiresAt) - now) / 60_000),
  );
  if (minutes < 60) return `${minutes}分钟`;
  return `${Math.floor(minutes / 60)}时${minutes % 60}分`;
}

export function NowBubbleField({
  initialNow,
  invites,
  locale,
  preview = false,
}: {
  initialNow: number;
  invites: NowBubbleItem[];
  locale: string;
  preview?: boolean;
}) {
  const copy = getNowCopy(locale);
  const router = useRouter();
  const [now, setNow] = useState(initialNow);
  const [popping, setPopping] = useState<string | null>(null);
  const visible = invites
    .filter((invite) => Date.parse(invite.expiresAt) > now)
    .slice(0, 7);
  const slots = bubbleSlots[visible.length] ?? bubbleSlots[7];

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  function openInvite(id: string) {
    if (popping) return;
    const destination = withLocale(locale, `/now/${id}`);
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      router.push(destination);
      return;
    }
    setPopping(id);
    window.setTimeout(() => router.push(destination), 260);
    // Keep the burst complete while a slower route transition is still loading.
    window.setTimeout(() => setPopping(null), 5_000);
  }

  return (
    <section className={styles.section} aria-labelledby="now-home-heading">
      <div className={styles.headingRow}>
        <div>
          <h2 id="now-home-heading" className={styles.heading}>
            {copy.heading}
          </h2>
          <p className={styles.subtitle}>{copy.subtitle}</p>
        </div>
        <Link
          className={styles.seeAll}
          href={withLocale(locale, preview ? "/now?previewNow=1" : "/now")}
        >
          {copy.seeAll}
          <ArrowUpRight size={15} aria-hidden="true" />
        </Link>
      </div>

      {visible.length ? (
        <div className={styles.field} data-count={visible.length}>
          <div
            className={`${styles.sparkle} ${styles.sparkleOne}`}
            aria-hidden="true"
          />
          <div
            className={`${styles.sparkle} ${styles.sparkleTwo}`}
            aria-hidden="true"
          />
          <div
            className={`${styles.sparkle} ${styles.sparkleThree}`}
            aria-hidden="true"
          />
          {visible.map((invite, index) => {
            const kind = getNowKind(invite.category);
            const total =
              Date.parse(invite.expiresAt) - Date.parse(invite.createdAt);
            const remaining = Math.max(0, Date.parse(invite.expiresAt) - now);
            const progress =
              total > 0
                ? Math.max(0, Math.min(100, (remaining / total) * 100))
                : 0;
            return (
              <button
                key={invite.id}
                type="button"
                className={`${styles.item} ${styles[`slot${slots[index]}`]} ${styles[kind.tone]} ${styles[invite.size]} ${popping === invite.id ? styles.popping : ""}`}
                style={
                  {
                    "--progress": `${progress}%`,
                    "--delay": `${index * 76}ms`,
                  } as CSSProperties
                }
                onClick={() => openInvite(invite.id)}
                aria-label={`${invite.title}，${invite.area}，${remainingLabel(invite.expiresAt, now, locale)} ${copy.remaining}，${invite.interestCount} ${copy.people}`}
              >
                <span className={styles.orbit}>
                  <span className={styles.core}>
                    <span className={styles.emoji} aria-hidden="true">
                      {kind.emoji}
                    </span>
                  </span>
                  <span className={styles.avatars} aria-hidden="true">
                    {invite.avatars.slice(0, 3).map((avatar, avatarIndex) => (
                      <span
                        className={styles.avatar}
                        key={`${avatar.name}-${avatarIndex}`}
                      >
                        {avatar.name.trim().charAt(0).toUpperCase() || "•"}
                        {avatar.url ? (
                          <RetainedImage
                            src={avatar.url}
                            alt=""
                            className={styles.avatarImage}
                            referrerPolicy="no-referrer"
                          />
                        ) : null}
                      </span>
                    ))}
                  </span>
                </span>
                <span className={styles.itemTitle}>{invite.title}</span>
                <span className={styles.meta}>
                  {compactRemainingLabel(invite.expiresAt, now, locale)}
                </span>
                <span className={styles.area}>
                  {getNowIntentWindowLabel(invite.intentWindow, locale)} ·{" "}
                  {invite.area}
                </span>
                <span className={styles.srOnly}>
                  {getNowKindLabel(invite.category, locale)}
                </span>
              </button>
            );
          })}
        </div>
      ) : (
        <div className={styles.empty}>
          <span className={styles.emptyBalloon} aria-hidden="true">
            🎈
          </span>
          <p>{copy.empty}</p>
        </div>
      )}
      <div className={styles.actions}>
        <Link
          href={withLocale(
            locale,
            preview ? "/now/new?previewNow=1" : "/now/new",
          )}
          className={styles.create}
        >
          <Plus size={17} strokeWidth={2.4} aria-hidden="true" />
          {copy.create}
        </Link>
        <Link href={withLocale(locale, "/now/mine")} className={styles.mine}>
          {copy.mine}
        </Link>
        {(
          [
            "OTHER",
            ...nowKinds.filter((kind) => kind !== "OTHER"),
          ] as (typeof nowKinds)[number][]
        ).map((kind) => (
          <Link
            key={kind}
            href={withLocale(
              locale,
              `/now/new?kind=${kind}${preview ? "&previewNow=1" : ""}`,
            )}
            className={styles.quickKind}
          >
            <span aria-hidden="true">{getNowKind(kind).emoji}</span>
            {getNowKindLabel(kind, locale)}
          </Link>
        ))}
      </div>
    </section>
  );
}

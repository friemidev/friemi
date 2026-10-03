"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { Heart, Send } from "lucide-react";
import { changeNowInterestAction, sendNowMessageAction } from "./actions";
import { getNowCopy, getNowStage, getNowStageLabel } from "./now";
import { withLocale } from "@/lib/routes";

function ActionButton({
  children,
  className,
}: {
  children: React.ReactNode;
  className: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className={`${className} disabled:opacity-60`}
    >
      {children}
    </button>
  );
}

export function NowInlineInterestForm({
  inviteId,
  locale,
}: {
  inviteId: string;
  locale: string;
}) {
  const copy = getNowCopy(locale);
  const router = useRouter();
  const [state, action] = useActionState(changeNowInterestAction, {});
  useEffect(() => {
    if (state.ok) router.push(withLocale(locale, `/now/${inviteId}?matched=1`));
  }, [inviteId, locale, state, router]);
  return (
    <form action={action} className="shrink-0">
      <input type="hidden" name="inviteId" value={inviteId} />
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="intent" value="join" />
      <ActionButton className="inline-flex min-h-10 items-center justify-center rounded-full border border-[#FFD2DA] bg-white px-3 text-[11px] font-bold text-[#D6536B] transition active:scale-[.96]">
        {copy.interested}
      </ActionButton>
      {state.error ? (
        <span role="alert" className="sr-only">
          {state.error}
        </span>
      ) : null}
    </form>
  );
}

export function NowInterestForm({
  expiresAt,
  initialNow,
  inviteId,
  isInterested,
  locale,
}: {
  expiresAt: string;
  initialNow: number;
  inviteId: string;
  isInterested: boolean;
  locale: string;
}) {
  const copy = getNowCopy(locale);
  const router = useRouter();
  const [state, action] = useActionState(changeNowInterestAction, {});
  const [note, setNote] = useState("");
  const [now, setNow] = useState(initialNow);
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 10_000);
    return () => window.clearInterval(timer);
  }, []);
  useEffect(() => {
    if (state.ok) router.refresh();
  }, [state, router]);
  if (!isInterested && Date.parse(expiresAt) <= now) {
    return (
      <p className="mt-5 rounded-2xl bg-[#FFF1F2] px-4 py-3 text-center text-[13px] font-semibold text-[#9A6973]">
        {copy.closed}
      </p>
    );
  }
  return (
    <form action={action} className="mt-3">
      <input type="hidden" name="inviteId" value={inviteId} />
      <input type="hidden" name="locale" value={locale} />
      <input
        type="hidden"
        name="intent"
        value={isInterested ? "withdraw" : "join"}
      />
      {!isInterested ? (
        <div className="mb-3">
          <label
            htmlFor="now-interest-note"
            className="mb-1.5 block text-[12px] font-semibold text-[#52715F]"
          >
            {locale === "zh-CN"
              ? "留一句话（选填）"
              : locale === "fr"
                ? "Ajouter un mot (facultatif)"
                : "Add a note (optional)"}
          </label>
          <input
            id="now-interest-note"
            name="note"
            maxLength={50}
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder={
              locale === "zh-CN" ? "我也想一起！" : "I'd love to join!"
            }
            className="min-h-11 w-full rounded-xl border border-[#DDE9E0] bg-white px-3 text-[13px] outline-none focus:border-[#54B581]"
          />
          <span className="mt-1 block text-right text-[10px] text-[#9CAB9F]">
            {note.length}/50
          </span>
        </div>
      ) : null}
      <ActionButton
        className={`flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl px-4 text-[15px] font-bold transition active:scale-[.98] ${isInterested ? "border border-[#DBE7DF] bg-white text-[#436455]" : "bg-[#F66F81] text-white shadow-[0_10px_22px_rgba(246,111,129,.2)]"}`}
      >
        <Heart
          size={17}
          fill={isInterested ? "currentColor" : "none"}
          aria-hidden="true"
        />
        {isInterested ? copy.withdrawn : copy.interested}
      </ActionButton>
      {state.error ? (
        <p role="alert" className="mt-2 text-[12px] text-[#A53955]">
          {state.error}
        </p>
      ) : null}
    </form>
  );
}

export function NowMessageForm({
  inviteId,
  locale,
}: {
  inviteId: string;
  locale: string;
}) {
  const copy = getNowCopy(locale);
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [state, action] = useActionState(sendNowMessageAction, {});
  useEffect(() => {
    if (state.ok) {
      formRef.current?.reset();
      router.refresh();
    }
  }, [state, router]);
  return (
    <form action={action} ref={formRef} className="mt-4 flex items-end gap-2">
      <input type="hidden" name="inviteId" value={inviteId} />
      <input type="hidden" name="locale" value={locale} />
      <label htmlFor="now-message-body" className="sr-only">
        {copy.message}
      </label>
      <textarea
        id="now-message-body"
        name="body"
        required
        maxLength={280}
        rows={2}
        placeholder={copy.message}
        className="min-h-12 min-w-0 flex-1 resize-none rounded-2xl border border-[#DDE9E0] bg-white px-3 py-2.5 text-[13px] outline-none focus:border-[#54B581]"
      />
      <ActionButton className="flex min-h-12 min-w-12 items-center justify-center rounded-2xl bg-[#126A4A] text-white">
        <Send size={18} aria-label={copy.send} />
      </ActionButton>
      {state.error ? (
        <p role="alert" className="text-[12px] text-[#A53955]">
          {state.error}
        </p>
      ) : null}
    </form>
  );
}

export function NowLiveCountdown({
  expiresAt,
  initialNow,
  locale,
}: {
  expiresAt: string;
  initialNow: number;
  locale: string;
}) {
  const [now, setNow] = useState(initialNow);
  const copy = getNowCopy(locale);
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, []);
  const remainingMinutes = Math.max(
    0,
    Math.ceil((Date.parse(expiresAt) - now) / 60_000),
  );
  if (remainingMinutes <= 0)
    return <span className="text-[#9A6973]">{copy.expired}</span>;
  const hours = Math.floor(remainingMinutes / 60);
  const minutes = remainingMinutes % 60;
  return (
    <span>
      {copy.remaining} {hours > 0 ? `${hours}h ` : ""}
      {minutes}m
    </span>
  );
}

export function NowStageBadge({
  expiresAt,
  interestCount,
  initialNow,
  locale,
}: {
  expiresAt: string;
  interestCount: number;
  initialNow: number;
  locale: string;
}) {
  const [now, setNow] = useState(initialNow);
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, []);
  const stage = getNowStage(new Date(expiresAt), interestCount, new Date(now));
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold ${stage === "EXPIRED" ? "bg-[#F2F3F0] text-[#788177]" : stage === "ALMOST_THERE" ? "bg-[#FFF1E0] text-[#A66A2A]" : "bg-[#E8F7ED] text-[#207551]"}`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${stage === "EXPIRED" ? "bg-[#A6AEA6]" : stage === "ALMOST_THERE" ? "bg-[#E7A958]" : "bg-[#48B77B]"}`}
        aria-hidden="true"
      />
      {getNowStageLabel(stage, locale)}
    </span>
  );
}

export function NowCountdownOrb({
  compact = false,
  createdAt,
  emoji,
  expiresAt,
  initialNow,
  locale,
  tone,
}: {
  compact?: boolean;
  createdAt: string;
  emoji: string;
  expiresAt: string;
  initialNow: number;
  locale: string;
  tone: string;
}) {
  const [now, setNow] = useState(initialNow);
  const copy = getNowCopy(locale);
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 10_000);
    return () => window.clearInterval(timer);
  }, []);
  const duration = Math.max(1, Date.parse(expiresAt) - Date.parse(createdAt));
  const remaining = Math.max(0, Date.parse(expiresAt) - now);
  const progress = Math.max(0, Math.min(100, (remaining / duration) * 100));
  const minutes = Math.ceil(remaining / 60_000);
  const timeLabel =
    minutes <= 0
      ? copy.expired
      : locale === "zh-CN"
        ? `${Math.floor(minutes / 60)}小时${minutes % 60}分`
        : `${Math.floor(minutes / 60)}h ${minutes % 60}m ${copy.remaining}`;
  const ringColor =
    (
      {
        amber: "#F5A64C",
        blue: "#75A9EC",
        coral: "#F58B79",
        green: "#62C390",
        rose: "#F56D84",
      } as Record<string, string>
    )[tone] ?? "#F56D84";

  return (
    <div
      className={`relative mx-auto grid shrink-0 place-items-center ${compact ? "h-[4.65rem] w-[4.65rem]" : "h-[9.25rem] w-[9.25rem]"}`}
    >
      {!compact ? (
        <>
          <span
            className="absolute -left-7 top-10 h-2 w-2 rotate-45 rounded-[2px] bg-[#8EDDB3]"
            aria-hidden="true"
          />
          <span
            className="absolute -right-6 top-14 h-2.5 w-2.5 rounded-full bg-[#F8C3CB]"
            aria-hidden="true"
          />
          <span
            className="absolute -right-4 bottom-2 h-1.5 w-1.5 rotate-45 bg-[#FFD98D]"
            aria-hidden="true"
          />
        </>
      ) : null}
      <div
        className={`grid place-items-center rounded-full shadow-[0_16px_36px_rgba(244,111,130,.14)] transition-[background] duration-700 ${compact ? "h-[4.5rem] w-[4.5rem] p-[5px]" : "h-[8.9rem] w-[8.9rem] p-[8px]"}`}
        style={{
          background: `conic-gradient(${ringColor} ${progress}%, #F9E9EC ${progress}% 100%)`,
        }}
        role="timer"
        aria-label={timeLabel}
      >
        <div className="flex h-full w-full flex-col items-center justify-center rounded-full bg-[#FFF5F6] shadow-[inset_0_3px_10px_rgba(255,255,255,.9)]">
          <span
            className={`${compact ? "text-[2rem]" : "text-[3.35rem]"} leading-none drop-shadow-[0_7px_7px_rgba(123,48,63,.16)]`}
            aria-hidden="true"
          >
            {emoji}
          </span>
          {!compact ? (
            <span
              className="mt-1 text-[12px] font-bold text-[#D65D72]"
              aria-hidden="true"
            >
              {timeLabel}
            </span>
          ) : null}
        </div>
      </div>
    </div>
  );
}

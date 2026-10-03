"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { Heart, Send } from "lucide-react";
import { changeNowInterestAction, sendNowMessageAction } from "./actions";
import { getNowCopy } from "./now";

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

export function NowInterestForm({
  inviteId,
  isInterested,
  locale,
}: {
  inviteId: string;
  isInterested: boolean;
  locale: string;
}) {
  const copy = getNowCopy(locale);
  const router = useRouter();
  const [state, action] = useActionState(changeNowInterestAction, {});
  const [note, setNote] = useState("");
  useEffect(() => {
    if (state.ok) router.refresh();
  }, [state, router]);
  return (
    <form action={action} className="mt-5">
      <input type="hidden" name="inviteId" value={inviteId} />
      <input type="hidden" name="locale" value={locale} />
      <input
        type="hidden"
        name="intent"
        value={isInterested ? "withdraw" : "join"}
      />
      {!isInterested ? (
        <input
          name="note"
          maxLength={100}
          value={note}
          onChange={(event) => setNote(event.target.value)}
          placeholder={
            locale === "zh-CN"
              ? "想说一句话？（选填）"
              : "Add a short note (optional)"
          }
          className="mb-3 min-h-11 w-full rounded-xl border border-[#DDE9E0] bg-white px-3 text-[13px] outline-none focus:border-[#54B581]"
        />
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

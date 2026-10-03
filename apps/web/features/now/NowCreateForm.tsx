"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { ArrowRight } from "lucide-react";
import { createNowInviteAction } from "./actions";
import {
  getNowCopy,
  getNowKind,
  getNowKindLabel,
  nowKinds,
  nowVisibilityHours,
  type NowKind,
} from "./now";

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="mt-6 flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#126A4A] px-5 text-[15px] font-bold text-white shadow-[0_12px_25px_rgba(18,106,74,.2)] transition active:scale-[.98] disabled:opacity-60"
    >
      {pending ? "…" : label}
      <ArrowRight size={18} aria-hidden="true" />
    </button>
  );
}

export function NowCreateForm({
  locale,
  initialKind,
}: {
  locale: string;
  initialKind: NowKind;
}) {
  const copy = getNowCopy(locale);
  const [category, setCategory] = useState<NowKind>(initialKind);
  const [title, setTitle] = useState(getNowKindLabel(initialKind, locale));
  const [state, action] = useActionState(createNowInviteAction, {});

  function chooseCategory(kind: NowKind) {
    const previousDefault = getNowKindLabel(category, locale);
    if (!title || title === previousDefault)
      setTitle(getNowKindLabel(kind, locale));
    setCategory(kind);
  }

  return (
    <form action={action} className="space-y-6">
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="category" value={category} />

      <fieldset>
        <legend className="mb-3 text-[15px] font-bold text-[#143D32]">
          {copy.createTitle}
        </legend>
        <div className="grid grid-cols-4 gap-2 min-[390px]:grid-cols-5">
          {nowKinds.map((kind) => {
            const selected = category === kind;
            const detail = getNowKind(kind);
            return (
              <button
                key={kind}
                type="button"
                onClick={() => chooseCategory(kind)}
                aria-pressed={selected}
                className={`flex min-h-[4.5rem] flex-col items-center justify-center gap-1 rounded-2xl border px-1 text-center transition active:scale-[.96] ${selected ? "border-[#60B787] bg-[#E9F7EE] shadow-[0_6px_16px_rgba(18,106,74,.1)]" : "border-[#E2EBE4] bg-white"}`}
              >
                <span className="text-[25px] leading-none" aria-hidden="true">
                  {detail.emoji}
                </span>
                <span className="text-[11px] font-semibold leading-tight text-[#234B3B]">
                  {getNowKindLabel(kind, locale)}
                </span>
              </button>
            );
          })}
        </div>
      </fieldset>

      <div className="space-y-2">
        <label
          htmlFor="now-title"
          className="text-[14px] font-bold text-[#143D32]"
        >
          {copy.title}
        </label>
        <input
          id="now-title"
          name="title"
          required
          maxLength={48}
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          className="min-h-12 w-full rounded-2xl border border-[#D7E5D9] bg-white px-4 text-[15px] text-[#18382C] outline-none focus:border-[#3C9D6B] focus:ring-2 focus:ring-[#3C9D6B]/20"
        />
      </div>
      <div className="space-y-2">
        <label
          htmlFor="now-area"
          className="text-[14px] font-bold text-[#143D32]"
        >
          {copy.area}
        </label>
        <input
          id="now-area"
          name="area"
          required
          minLength={2}
          maxLength={80}
          placeholder={locale === "zh-CN" ? "例如：Le Marais" : "Le Marais"}
          className="min-h-12 w-full rounded-2xl border border-[#D7E5D9] bg-white px-4 text-[15px] text-[#18382C] outline-none focus:border-[#3C9D6B] focus:ring-2 focus:ring-[#3C9D6B]/20"
        />
      </div>
      <fieldset>
        <legend className="mb-2 text-[14px] font-bold text-[#143D32]">
          {copy.duration}
        </legend>
        <div className="grid grid-cols-4 gap-2">
          {nowVisibilityHours.map((hours) => (
            <label key={hours} className="cursor-pointer">
              <input
                className="peer sr-only"
                type="radio"
                name="visibilityHours"
                value={hours}
                defaultChecked={hours === 12}
              />
              <span className="flex min-h-11 items-center justify-center rounded-xl border border-[#D7E5D9] bg-white text-[14px] font-semibold text-[#305346] peer-checked:border-[#F68188] peer-checked:bg-[#FFF0F1] peer-checked:text-[#A13E55] peer-focus-visible:ring-2 peer-focus-visible:ring-[#126A4A]">
                {hours}h
              </span>
            </label>
          ))}
        </div>
        <p className="mt-2 text-[12px] leading-5 text-[#77877B]">
          {locale === "zh-CN"
            ? "到期后退出首页，已有互动仍可在「我的此刻」查看。"
            : locale === "fr"
              ? "Après ce délai, votre invitation quitte l'accueil mais reste accessible aux personnes intéressées."
              : "After this time, your invite leaves home but stays available to everyone who raised a hand."}
        </p>
      </fieldset>
      <div className="space-y-2">
        <label
          htmlFor="now-note"
          className="text-[14px] font-bold text-[#143D32]"
        >
          {copy.note}
        </label>
        <textarea
          id="now-note"
          name="note"
          maxLength={280}
          rows={3}
          placeholder={
            locale === "zh-CN"
              ? "比如：下班后想找个人喝一杯，一起吗？"
              : "A little more about your plan…"
          }
          className="w-full resize-none rounded-2xl border border-[#D7E5D9] bg-white px-4 py-3 text-[14px] leading-6 text-[#18382C] outline-none focus:border-[#3C9D6B] focus:ring-2 focus:ring-[#3C9D6B]/20"
        />
      </div>
      {state.error ? (
        <p role="alert" className="text-[13px] font-semibold text-[#A73955]">
          {state.error}
        </p>
      ) : null}
      <SubmitButton label={copy.publish} />
    </form>
  );
}

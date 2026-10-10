"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { ArrowRight, MapPin } from "lucide-react";
import { createNowInviteAction } from "./actions";
import {
  getNowCopy,
  getNowKind,
  getNowKindLabel,
  getNowIntentWindowLabel,
  getNowPreviewDisabledLabel,
  nowIntentWindows,
  nowKinds,
  nowVisibilityHours,
  type NowKind,
  type NowIntentWindow,
} from "./now";

function StepHeading({
  number,
  children,
}: {
  number: number;
  children: React.ReactNode;
}) {
  return (
    <span className="flex items-center gap-2 text-[15px] font-bold text-[#143D32]">
      <span className="grid h-6 w-6 place-items-center rounded-full bg-[#126A4A] text-[11px] font-bold text-white">
        {number}
      </span>
      {children}
    </span>
  );
}

function SubmitButton({
  label,
  locale,
  preview,
}: {
  label: string;
  locale: string;
  preview: boolean;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending || preview}
      className="mt-4 flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#126A4A] px-5 text-[15px] font-bold text-white shadow-[0_12px_25px_rgba(18,106,74,.2)] transition active:scale-[.98] disabled:opacity-60"
    >
      {preview ? getNowPreviewDisabledLabel(locale) : pending ? "…" : label}
      <ArrowRight size={18} aria-hidden="true" />
    </button>
  );
}

export function NowCreateForm({
  locale,
  initialKind,
  preview = false,
}: {
  locale: string;
  initialKind: NowKind;
  preview?: boolean;
}) {
  const copy = getNowCopy(locale);
  const [category, setCategory] = useState<NowKind>(initialKind);
  const [title, setTitle] = useState(
    initialKind === "OTHER" ? "" : getNowKindLabel(initialKind, locale),
  );
  const initialKindRef = useRef<HTMLButtonElement>(null);
  const [area, setArea] = useState("");
  const [note, setNote] = useState("");
  const [intentWindow, setIntentWindow] = useState<NowIntentWindow>("NOW");
  const [visibilityHours, setVisibilityHours] =
    useState<(typeof nowVisibilityHours)[number]>(12);
  const [state, action] = useActionState(createNowInviteAction, {});
  useEffect(() => {
    initialKindRef.current?.scrollIntoView({
      block: "nearest",
      inline: "center",
    });
  }, []);
  const areaSuggestions = [
    {
      label:
        locale === "zh-CN"
          ? "巴黎市内"
          : locale === "fr"
            ? "Dans Paris"
            : "Across Paris",
      value:
        locale === "zh-CN"
          ? "巴黎市内"
          : locale === "fr"
            ? "Paris intra-muros"
            : "Paris citywide",
    },
    { label: "Le Marais", value: "Le Marais" },
    { label: "Bastille", value: "Bastille" },
    { label: "Canal Saint-Martin", value: "Canal Saint-Martin" },
  ];

  function chooseCategory(kind: NowKind) {
    const previousDefault = getNowKindLabel(category, locale);
    if (!title || title === previousDefault)
      setTitle(kind === "OTHER" ? "" : getNowKindLabel(kind, locale));
    setCategory(kind);
  }

  return (
    <form action={preview ? undefined : action} className="space-y-6">
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="category" value={category} />

      <fieldset className="min-w-0 w-full">
        <legend className="mb-3">
          <StepHeading number={1}>{copy.createTitle}</StepHeading>
        </legend>
        <div className="-mx-5 flex snap-x gap-2 overflow-x-auto px-5 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {nowKinds.map((kind) => {
            const selected = category === kind;
            return (
              <button
                key={kind}
                ref={kind === initialKind ? initialKindRef : null}
                type="button"
                onClick={() => chooseCategory(kind)}
                aria-pressed={selected}
                className={`inline-flex min-h-11 shrink-0 snap-start items-center gap-1.5 rounded-xl border px-3 text-[12px] font-semibold transition active:scale-[.96] ${selected ? "border-[#F2A7B5] bg-[#FFF0F2] text-[#A9475B] shadow-[0_5px_14px_rgba(246,111,129,.1)]" : "border-[#E2EBE4] bg-white text-[#305444]"}`}
              >
                <span className="text-[17px]" aria-hidden="true">
                  {getNowKind(kind).emoji}
                </span>
                {getNowKindLabel(kind, locale)}
              </button>
            );
          })}
        </div>
        <label
          htmlFor="now-title"
          className="mt-3 block text-[12px] font-semibold text-[#5C7667]"
        >
          {copy.title}
        </label>
        <input
          id="now-title"
          name="title"
          required
          maxLength={48}
          placeholder={
            locale === "zh-CN"
              ? "用一句话说说此刻想做什么"
              : locale === "fr"
                ? "Dites votre envie en une phrase"
                : "Say what you feel like doing"
          }
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          className="mt-1.5 min-h-11 w-full rounded-xl border border-[#D7E5D9] bg-white px-3.5 text-[14px] text-[#18382C] outline-none focus:border-[#3C9D6B] focus:ring-2 focus:ring-[#3C9D6B]/20"
        />
      </fieldset>

      <fieldset className="min-w-0 w-full">
        <legend className="mb-3">
          <StepHeading number={2}>
            {locale === "zh-CN"
              ? "什么时候？"
              : locale === "fr"
                ? "Quand ?"
                : "When?"}
          </StepHeading>
        </legend>
        <div
          className={
            locale === "fr"
              ? "grid grid-cols-2 gap-2 min-[430px]:grid-cols-4"
              : "grid grid-cols-4 gap-2"
          }
        >
          {nowIntentWindows.map((window) => {
            const labels = {
              NOW: ["现在", "Now", "Maintenant"],
              LATER: ["稍后", "Soon", "Bientôt"],
              TODAY: ["今天", "Today", "Aujourd'hui"],
              TONIGHT: ["今晚", "Tonight", "Ce soir"],
            }[window];
            const captions = {
              NOW: ["0–1h", "0–1h", "0–1h"],
              LATER: ["1–3h", "1–3h", "1–3h"],
              TODAY: ["今日内", "By midnight", "Avant minuit"],
              TONIGHT: ["今晚", "Evening", "Ce soir"],
            }[window];
            const index = locale === "en" ? 1 : locale === "fr" ? 2 : 0;
            return (
              <label key={window} className="cursor-pointer">
                <input
                  className="peer sr-only"
                  type="radio"
                  name="intentWindow"
                  value={window}
                  checked={intentWindow === window}
                  onChange={() => setIntentWindow(window)}
                />
                <span className="flex min-h-16 flex-col items-center justify-center rounded-2xl border border-[#D7E5D9] bg-white text-[13px] font-bold text-[#305346] peer-checked:border-[#F68188] peer-checked:bg-[#FFF0F1] peer-checked:text-[#A13E55] peer-focus-visible:ring-2 peer-focus-visible:ring-[#126A4A]">
                  {labels[index]}
                  <span className="mt-0.5 text-[10px] font-medium opacity-65">
                    {captions[index]}
                  </span>
                </span>
              </label>
            );
          })}
        </div>
        <p className="mt-2 text-[11px] leading-5 text-[#77877B]">
          {locale === "zh-CN"
            ? "这是想一起做的时间，具体几点可以在同频后聊。"
            : locale === "fr"
              ? "L'heure exacte se décide ensemble après la rencontre."
              : "Choose when you feel like going; agree on an exact time together."}
        </p>
      </fieldset>

      <fieldset className="min-w-0 w-full">
        <legend className="mb-3">
          <StepHeading number={3}>
            {locale === "zh-CN"
              ? "去哪儿？"
              : locale === "fr"
                ? "Où ?"
                : "Where?"}
          </StepHeading>
        </legend>
        <div className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {areaSuggestions.map((suggestion) => (
            <button
              key={suggestion.value}
              type="button"
              onClick={() => setArea(suggestion.value)}
              aria-pressed={area === suggestion.value}
              className={`inline-flex min-h-10 shrink-0 items-center gap-1 rounded-xl border px-3 text-[12px] font-semibold transition active:scale-[.96] ${area === suggestion.value ? "border-[#F2A7B5] bg-[#FFF0F2] text-[#A9475B]" : "border-[#E2EBE4] bg-white text-[#446452]"}`}
            >
              {suggestion.label}
            </button>
          ))}
        </div>
        <label htmlFor="now-area" className="sr-only">
          {copy.area}
        </label>
        <div className="relative mt-2.5">
          <MapPin
            size={16}
            className="pointer-events-none absolute left-3.5 top-3.5 text-[#6D967B]"
            aria-hidden="true"
          />
          <input
            id="now-area"
            name="area"
            required
            minLength={2}
            maxLength={80}
            value={area}
            onChange={(event) => setArea(event.target.value)}
            placeholder={locale === "zh-CN" ? "或输入附近街区" : copy.area}
            className="min-h-11 w-full rounded-xl border border-[#D7E5D9] bg-white pl-10 pr-3 text-[14px] text-[#18382C] outline-none focus:border-[#3C9D6B] focus:ring-2 focus-visible:ring-[#3C9D6B]/20"
          />
        </div>
        <p className="mt-2 text-[11px] leading-5 text-[#77877B]">
          {locale === "zh-CN"
            ? "不会读取你的定位；请选你愿意前往的街区或范围，具体地点可以同频后再定。"
            : locale === "fr"
              ? "Nous n'utilisons pas votre position. Choisissez un quartier ou une zone où vous pourriez aller ; le lieu exact se décide ensemble."
              : "We don't use your location here. Choose an area you'd travel to; agree on the exact place together."}
        </p>
      </fieldset>

      <section>
        <label htmlFor="now-note" className="mb-3 block">
          <StepHeading number={4}>{copy.note}</StepHeading>
        </label>
        <textarea
          id="now-note"
          name="note"
          maxLength={50}
          rows={2}
          value={note}
          onChange={(event) => setNote(event.target.value)}
          placeholder={
            locale === "zh-CN"
              ? "下班后，突然想喝一杯，有人一起吗？"
              : locale === "fr"
                ? "Une envie, un petit mot…"
                : "A little more about your idea…"
          }
          className="w-full resize-none rounded-xl border border-[#D7E5D9] bg-white px-3.5 py-3 text-[14px] leading-6 text-[#18382C] outline-none focus:border-[#3C9D6B] focus:ring-2 focus:ring-[#3C9D6B]/20"
        />
        <span className="mt-1 block text-right text-[11px] text-[#94A99A]">
          {note.length}/50
        </span>
      </section>

      <details className="rounded-2xl border border-[#E2EBE4] bg-white px-4 py-3">
        <summary className="cursor-pointer text-[12px] font-semibold text-[#52715F]">
          {copy.duration} · {visibilityHours}h
        </summary>
        <div className="mt-3 grid grid-cols-4 gap-2">
          {nowVisibilityHours.map((hours) => (
            <label key={hours} className="cursor-pointer">
              <input
                className="peer sr-only"
                type="radio"
                name="visibilityHours"
                value={hours}
                checked={visibilityHours === hours}
                onChange={() => setVisibilityHours(hours)}
              />
              <span className="flex min-h-11 items-center justify-center rounded-xl border border-[#D7E5D9] bg-white text-[13px] font-semibold text-[#305346] peer-checked:border-[#F68188] peer-checked:bg-[#FFF0F1] peer-checked:text-[#A13E55] peer-focus-visible:ring-2 peer-focus-visible:ring-[#126A4A]">
                {hours}h
              </span>
            </label>
          ))}
        </div>
        <p className="mt-2 text-[11px] leading-5 text-[#77877B]">
          {locale === "zh-CN"
            ? "只决定泡泡在首页展示多久；默认 12 小时，到期后仍可在「我的此刻」继续交流。"
            : locale === "fr"
              ? "Ce délai concerne l'accueil. Après, les personnes intéressées peuvent continuer à échanger."
              : "This controls home visibility only. People who raised a hand can keep talking after it ends."}
        </p>
      </details>

      <div className="rounded-2xl border border-[#D8E9DD] bg-[#F0F8F2] px-4 py-3 text-[12px] leading-5 text-[#426A54]">
        <p className="font-bold text-[#176347]">
          {locale === "zh-CN"
            ? `想做的时间：${getNowIntentWindowLabel(intentWindow, locale)} · 首页展示：${visibilityHours} 小时`
            : locale === "fr"
              ? `Quand : ${getNowIntentWindowLabel(intentWindow, locale)} · Visible à l'accueil : ${visibilityHours} h`
              : `When: ${getNowIntentWindowLabel(intentWindow, locale)} · On home for: ${visibilityHours} hours`}
        </p>
        <p className="mt-1">
          {locale === "zh-CN"
            ? "倒计时只控制泡泡的首页曝光；到期后，你和已举手的人仍可继续交流。"
            : locale === "fr"
              ? "Le compte à rebours concerne seulement l'accueil. Vous pourrez encore discuter après."
              : "The countdown only controls home visibility. You can keep talking after it ends."}
        </p>
      </div>

      {state.error ? (
        <p role="alert" className="text-[13px] font-semibold text-[#A73955]">
          {state.error}
        </p>
      ) : null}
      <SubmitButton label={copy.publish} locale={locale} preview={preview} />
    </form>
  );
}

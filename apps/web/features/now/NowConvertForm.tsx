"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { ArrowRight, CalendarClock, MapPin } from "lucide-react";
import { createActivityAction } from "@/features/activities/actions/createActivity";
import { withLocale } from "@/lib/routes";
import {
  getNowActivityDraftFields,
  getNowIntentWindowLabel,
  getNowKind,
  getNowPreviewDisabledLabel,
} from "./now";

type NowConvertFormProps = {
  area: string;
  category: string;
  city: string;
  initialStartAt: string;
  interestCount: number;
  inviteId: string;
  intentWindow: string;
  locale: string;
  note: string | null;
  preview: boolean;
  title: string;
};

function PublishButton({
  preview,
  locale,
}: {
  preview: boolean;
  locale: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={preview || pending}
      className="flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#126A4A] px-5 text-[14px] font-bold text-white shadow-[0_12px_26px_rgba(18,106,74,.18)] disabled:opacity-60"
    >
      {preview
        ? getNowPreviewDisabledLabel(locale)
        : pending
          ? "…"
          : locale === "zh-CN"
            ? "发布聚吧"
            : locale === "fr"
              ? "Publier la sortie"
              : "Publish hangout"}
      <ArrowRight size={17} aria-hidden="true" />
    </button>
  );
}

export function NowConvertForm(props: NowConvertFormProps) {
  const {
    area,
    category,
    city,
    initialStartAt,
    interestCount,
    inviteId,
    intentWindow,
    locale,
    note,
    preview,
    title,
  } = props;
  const [state, action] = useActionState(createActivityAction, {});
  const hidden = getNowActivityDraftFields({
    area,
    category,
    city,
    inviteId,
    locale,
    note,
    title,
  });

  return (
    <div className="space-y-5">
      <div className="rounded-[1.5rem] border border-[#D6EDDD] bg-[linear-gradient(125deg,#F0FAF2,#FFF3F5)] px-4 py-4">
        <p className="text-[11px] font-bold uppercase tracking-[.13em] text-[#58856C]">
          {locale === "zh-CN"
            ? "来自你的此刻"
            : locale === "fr"
              ? "Depuis votre envie"
              : "From your NOW"}
        </p>
        <div className="mt-2 flex items-center gap-3">
          <span
            className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-white text-3xl shadow-[0_8px_22px_rgba(66,119,81,.08)]"
            aria-hidden="true"
          >
            {getNowKind(category).emoji}
          </span>
          <div className="min-w-0">
            <h2 className="text-[18px] font-bold text-[#173D32]">{title}</h2>
            <p className="mt-0.5 text-[12px] text-[#557563]">
              {getNowIntentWindowLabel(intentWindow, locale)} · {area}
            </p>
          </div>
        </div>
        <p className="mt-3 text-[12px] font-semibold text-[#247351]">
          {interestCount}{" "}
          {locale === "zh-CN"
            ? "人已表达兴趣"
            : locale === "fr"
              ? "personnes intéressées"
              : "people interested"}
        </p>
      </div>

      <form action={preview ? undefined : action} className="space-y-4">
        {Object.entries(hidden).map(([name, value]) => (
          <input key={name} type="hidden" name={name} value={value} />
        ))}
        <div>
          <label
            htmlFor="now-hangout-start"
            className="mb-1.5 flex items-center gap-1.5 text-[13px] font-bold text-[#194937]"
          >
            <CalendarClock size={16} />
            {locale === "zh-CN"
              ? "确认具体时间"
              : locale === "fr"
                ? "Confirmer l'heure"
                : "Confirm the exact time"}
          </label>
          <input
            id="now-hangout-start"
            type="datetime-local"
            name="startAt"
            lang={locale}
            required
            defaultValue={initialStartAt}
            className="min-h-12 w-full rounded-xl border border-[#D7E5D9] bg-white px-3 text-[14px] text-[#18382C] outline-none focus:border-[#3C9D6B] focus:ring-2 focus:ring-[#3C9D6B]/20"
          />
          <p className="mt-1 text-[11px] leading-5 text-[#77877B]">
            {locale === "zh-CN"
              ? "已根据此刻的时间段填入建议时间，请与你想同行的人确认。"
              : locale === "fr"
                ? "Un horaire est proposé ; confirmez-le ensemble avant de publier."
                : "A time is suggested; check it together before publishing."}
          </p>
          {state.fieldErrors?.startAt?.[0] ? (
            <p className="mt-1 text-[11px] text-[#B84D62]">
              {state.fieldErrors.startAt[0]}
            </p>
          ) : null}
        </div>
        <div>
          <label
            htmlFor="now-hangout-place"
            className="mb-1.5 flex items-center gap-1.5 text-[13px] font-bold text-[#194937]"
          >
            <MapPin size={16} />
            {locale === "zh-CN"
              ? "确认具体地点"
              : locale === "fr"
                ? "Confirmer le lieu"
                : "Confirm the exact place"}
          </label>
          <input
            id="now-hangout-place"
            type="text"
            name="address"
            required
            maxLength={160}
            placeholder={
              locale === "zh-CN"
                ? "店名或见面地址"
                : locale === "fr"
                  ? "Nom du lieu ou adresse"
                  : "Venue name or meeting address"
            }
            className="min-h-12 w-full rounded-xl border border-[#D7E5D9] bg-white px-3 text-[14px] text-[#18382C] outline-none focus:border-[#3C9D6B] focus:ring-2 focus:ring-[#3C9D6B]/20"
          />
          <p className="mt-1 text-[11px] leading-5 text-[#77877B]">
            {locale === "zh-CN"
              ? `区域仍是 ${area}；这里填写正式聚吧的见面点。`
              : `The area is ${area}; add the exact meeting point here.`}
          </p>
          {state.fieldErrors?.address?.[0] ? (
            <p className="mt-1 text-[11px] text-[#B84D62]">
              {state.fieldErrors.address[0]}
            </p>
          ) : null}
        </div>
        <p className="rounded-xl bg-[#F4F8F4] px-3 py-2 text-[11px] leading-5 text-[#667D6C]">
          {locale === "zh-CN"
            ? "已举手的人不会被自动报名；聚吧发布后，他们仍需确认参加。"
            : locale === "fr"
              ? "Les personnes intéressées devront encore confirmer leur participation."
              : "Interested people will still need to sign up for the hangout."}
        </p>
        {state.formError ? (
          <p role="alert" className="text-[12px] font-semibold text-[#B84D62]">
            {state.formError}
          </p>
        ) : null}
        <PublishButton preview={preview} locale={locale} />
      </form>
      {!preview ? (
        <Link
          href={withLocale(
            locale,
            `/activities/new?mode=form&fromNow=${encodeURIComponent(inviteId)}`,
          )}
          className="block text-center text-[12px] font-semibold text-[#2B7557] underline underline-offset-4"
        >
          {locale === "zh-CN"
            ? "需要更多设置？打开完整聚吧表单"
            : locale === "fr"
              ? "Plus d'options ? Ouvrir le formulaire complet"
              : "Need more options? Open the full form"}
        </Link>
      ) : null}
    </div>
  );
}

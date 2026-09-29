"use client";

import Image from "next/image";
import Link from "next/link";
import { useActionState, useState } from "react";
import {
  ArrowLeft,
  Check,
  CheckCircle2,
  LoaderCircle,
  Store,
  TicketCheck,
} from "lucide-react";
import {
  createCouponCampaignAction,
  type CreateCouponCampaignState,
} from "@/features/coupons/actions/couponActions";
import type { MerchantCouponPublisherViewModel } from "@/features/coupons/queries/getMerchantCouponPublisher";
import { withLocale } from "@/lib/routes";

const initialCampaignState: CreateCouponCampaignState = {};

function getCopy(locale: string) {
  if (locale === "fr") {
    return {
      back: "Boutique",
      campaignCreated: "Le coupon est maintenant en ligne.",
      campaignError: "Vérifiez le contenu, la quantité et les dates.",
      conditions: "Conditions d'utilisation",
      create: "Publier le coupon",
      description: "Contenu de l'offre",
      end: "Fin de validité",
      noTemplate: "Aucun modèle de coupon n'est disponible.",
      quantity: "Quantité disponible",
      returnToStore: "Voir mes coupons",
      selectTemplate: "Produit / visuel",
      start: "Début (facultatif)",
      store: "Boutique",
      title: "Publier un coupon",
      titleField: "Titre du coupon",
    };
  }

  if (locale === "en") {
    return {
      back: "Store",
      campaignCreated: "Your coupon is now published.",
      campaignError: "Check the offer, quantity, and validity dates.",
      conditions: "Conditions",
      create: "Publish coupon",
      description: "Offer details",
      end: "Valid until",
      noTemplate: "No coupon design is available.",
      quantity: "Claim quantity",
      returnToStore: "View my coupons",
      selectTemplate: "Product / design",
      start: "Starts (optional)",
      store: "Store",
      title: "Publish coupon",
      titleField: "Coupon title",
    };
  }

  return {
    back: "门店",
    campaignCreated: "优惠券已成功上架。",
    campaignError: "请检查优惠内容、数量和使用期限。",
    conditions: "使用条件",
    create: "确认发布",
    description: "优惠内容 / 折扣",
    end: "使用截止时间",
    noTemplate: "当前没有可用的优惠券样式。",
    quantity: "可领取数量",
    returnToStore: "查看我的优惠券",
    selectTemplate: "优惠对象 / 图片",
    start: "开始时间（可选）",
    store: "门店",
    title: "发布优惠券",
    titleField: "优惠券标题",
  };
}

export function MerchantCouponPublisher({
  locale,
  publisher,
}: {
  locale: string;
  publisher: MerchantCouponPublisherViewModel;
}) {
  const copy = getCopy(locale);
  const firstTemplate = publisher.templates[0];
  const [selectedTemplateId, setSelectedTemplateId] = useState(
    firstTemplate?.id ?? "",
  );
  const [title, setTitle] = useState(firstTemplate?.title ?? "");
  const [description, setDescription] = useState(
    firstTemplate?.description ?? "",
  );
  const [terms, setTerms] = useState(firstTemplate?.defaultTerms ?? "");
  const [campaignState, campaignAction, campaignPending] = useActionState(
    createCouponCampaignAction,
    initialCampaignState,
  );

  function selectTemplate(templateId: string) {
    const template = publisher.templates.find((item) => item.id === templateId);
    setSelectedTemplateId(templateId);
    if (!template) return;
    setTitle(template.title);
    setDescription(template.description);
    setTerms(template.defaultTerms ?? "");
  }

  return (
    <main className="app-mobile-page-shell min-h-svh bg-[#F7F8F4] pb-12">
      <header className="flex items-center justify-between bg-white px-5 pb-4 pt-5">
        <Link
          aria-label={copy.back}
          className="grid h-10 w-10 place-items-center rounded-full text-[#123D31] ring-1 ring-[#D6D5B2] transition active:scale-95"
          href={withLocale(locale, "/profile/store")}
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-xl font-black text-[#111210]">{copy.title}</h1>
        <span className="grid h-10 w-10 place-items-center rounded-full bg-[#EAF5E8] text-[#156240]">
          <TicketCheck className="h-5 w-5" />
        </span>
      </header>

      <section className="border-t border-[#F0EEE3] bg-white px-5 pb-5 pt-4">
        <p className="text-[10px] font-black uppercase text-[#6C746A]">
          {copy.store}
        </p>
        <div className="mt-1 flex items-center gap-2">
          <Store className="h-4 w-4 shrink-0 text-[#156240]" />
          <p className="truncate text-sm font-black text-[#111210]">
            {publisher.merchant.name}
          </p>
        </div>
      </section>

      {campaignState.status === "CREATED" ? (
        <section className="px-5 py-10">
          <div className="rounded-lg bg-white px-6 py-10 text-center ring-1 ring-[#D6D5B2]">
            <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-[#EAF5E8] text-[#156240]">
              <CheckCircle2 className="h-7 w-7" />
            </span>
            <h2 className="mt-4 text-lg font-black text-[#111210]">
              {copy.campaignCreated}
            </h2>
            <Link
              className="mt-6 inline-flex h-12 w-full items-center justify-center rounded-full bg-[#156240] px-5 text-sm font-black text-white"
              href={withLocale(locale, "/profile/store")}
            >
              {copy.returnToStore}
            </Link>
          </div>
        </section>
      ) : firstTemplate ? (
        <form action={campaignAction} className="px-5 py-6">
          <input name="locale" type="hidden" value={locale} />
          <input name="templateId" type="hidden" value={selectedTemplateId} />

          <fieldset>
            <legend className="text-sm font-black text-[#111210]">
              {copy.selectTemplate}
            </legend>
            <div className="mt-3 grid grid-cols-2 gap-3">
              {publisher.templates.map((template) => {
                const selected = template.id === selectedTemplateId;
                return (
                  <button
                    aria-pressed={selected}
                    className={`relative min-w-0 overflow-hidden rounded-lg bg-white text-left ring-1 transition active:scale-[0.98] ${
                      selected ? "ring-2 ring-[#156240]" : "ring-[#E3E1D3]"
                    }`}
                    key={template.id}
                    onClick={() => selectTemplate(template.id)}
                    type="button"
                  >
                    <div className="relative aspect-[4/3] bg-[#EEF1EA]">
                      {template.imageUrl ? (
                        <Image
                          alt={template.title}
                          className="object-cover"
                          fill
                          sizes="(max-width: 640px) 44vw, 17rem"
                          src={template.imageUrl}
                        />
                      ) : (
                        <Store className="absolute left-1/2 top-1/2 h-6 w-6 -translate-x-1/2 -translate-y-1/2 text-[#156240]" />
                      )}
                    </div>
                    <p className="line-clamp-2 min-h-12 px-3 py-2 text-xs font-black leading-4 text-[#111210]">
                      {template.title}
                    </p>
                    {selected ? (
                      <span className="absolute right-2 top-2 grid h-6 w-6 place-items-center rounded-full bg-[#156240] text-white shadow-sm">
                        <Check className="h-3.5 w-3.5" />
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          </fieldset>

          <div className="mt-7 grid gap-5">
            <Field label={copy.titleField}>
              <input
                className="h-12 rounded-lg bg-white px-4 text-sm font-bold outline-none ring-1 ring-[#D6D5B2] focus:ring-2 focus:ring-[#8AB68E]"
                maxLength={120}
                name="title"
                onChange={(event) => setTitle(event.target.value)}
                required
                value={title}
              />
            </Field>
            <Field label={copy.description}>
              <textarea
                className="min-h-24 resize-y rounded-lg bg-white px-4 py-3 text-sm font-semibold leading-6 outline-none ring-1 ring-[#D6D5B2] focus:ring-2 focus:ring-[#8AB68E]"
                maxLength={1200}
                name="description"
                onChange={(event) => setDescription(event.target.value)}
                required
                value={description}
              />
            </Field>
            <Field label={copy.conditions}>
              <textarea
                className="min-h-20 resize-y rounded-lg bg-white px-4 py-3 text-sm font-semibold leading-6 outline-none ring-1 ring-[#D6D5B2] focus:ring-2 focus:ring-[#8AB68E]"
                maxLength={1200}
                name="terms"
                onChange={(event) => setTerms(event.target.value)}
                value={terms}
              />
            </Field>
            <div className="grid gap-5 sm:grid-cols-2 sm:gap-3">
              <Field label={copy.start}>
                <input
                  className="h-12 min-w-0 rounded-lg bg-white px-3 text-sm font-bold outline-none ring-1 ring-[#D6D5B2] focus:ring-2 focus:ring-[#8AB68E]"
                  name="validFrom"
                  type="datetime-local"
                />
              </Field>
              <Field label={copy.end}>
                <input
                  className="h-12 min-w-0 rounded-lg bg-white px-3 text-sm font-bold outline-none ring-1 ring-[#D6D5B2] focus:ring-2 focus:ring-[#8AB68E]"
                  name="expiresAt"
                  required
                  type="datetime-local"
                />
              </Field>
            </div>
            <Field label={copy.quantity}>
              <input
                className="h-12 rounded-lg bg-white px-4 text-sm font-bold outline-none ring-1 ring-[#D6D5B2] focus:ring-2 focus:ring-[#8AB68E]"
                defaultValue={100}
                inputMode="numeric"
                max={100000}
                min={1}
                name="quantityLimit"
                required
                type="number"
              />
            </Field>

            {campaignState.status ? (
              <p className="text-sm font-bold text-[#A62834]" role="alert">
                {copy.campaignError}
              </p>
            ) : null}

            <button
              className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-[#156240] px-5 text-sm font-black text-white shadow-[0_14px_28px_rgba(21,98,64,0.18)] disabled:opacity-55"
              disabled={campaignPending}
              type="submit"
            >
              {campaignPending ? (
                <LoaderCircle className="h-4 w-4 animate-spin" />
              ) : (
                <TicketCheck className="h-4 w-4" />
              )}
              {copy.create}
            </button>
          </div>
        </form>
      ) : (
        <p className="px-5 py-12 text-center text-sm font-bold text-[#6C746A]">
          {copy.noTemplate}
        </p>
      )}
    </main>
  );
}

function Field({
  children,
  label,
}: {
  children: React.ReactNode;
  label: string;
}) {
  return (
    <label className="grid min-w-0 gap-2 text-xs font-black text-[#4F574F]">
      {label}
      {children}
    </label>
  );
}

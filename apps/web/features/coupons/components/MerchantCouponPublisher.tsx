"use client";

import Image from "next/image";
import Link from "next/link";
import { useActionState, useState } from "react";
import {
  ArrowLeft,
  ArrowUpRight,
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
      campaignCreated: "Le coupon est en ligne",
      campaignError: "Vérifiez le contenu, la quantité et les dates.",
      conditions: "Conditions d'utilisation",
      create: "Publier le coupon",
      description: "Contenu de l'offre",
      end: "Fin de validité",
      noTemplate: "Aucun modèle de coupon n'est disponible.",
      offerSection: "L'offre",
      quantity: "Quantité disponible",
      returnToStore: "Voir mes coupons",
      rulesSection: "Distribution et validité",
      selectTemplate: "Modèle de coupon",
      start: "Début (facultatif)",
      store: "Boutique",
      title: "Publier un coupon",
      titleField: "Titre du coupon",
    };
  }

  if (locale === "en") {
    return {
      back: "Store",
      campaignCreated: "Coupon published",
      campaignError: "Check the offer, quantity, and validity dates.",
      conditions: "Conditions",
      create: "Publish coupon",
      description: "Offer details",
      end: "Valid until",
      noTemplate: "No coupon design is available.",
      offerSection: "The offer",
      quantity: "Claim quantity",
      returnToStore: "View my coupons",
      rulesSection: "Quantity and validity",
      selectTemplate: "Coupon design",
      start: "Starts (optional)",
      store: "Store",
      title: "Publish coupon",
      titleField: "Coupon title",
    };
  }

  return {
    back: "门店",
    campaignCreated: "优惠券已上架",
    campaignError: "请检查优惠内容、数量和使用期限。",
    conditions: "使用条件",
    create: "确认发布",
    description: "优惠内容 / 折扣",
    end: "使用截止时间",
    noTemplate: "当前没有可用的优惠券样式。",
    offerSection: "优惠内容",
    quantity: "可领取数量",
    returnToStore: "查看我的优惠券",
    rulesSection: "领取与有效期",
    selectTemplate: "选择券面",
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
    <main className="app-mobile-page-shell min-h-svh bg-paper text-ink">
      <div className="mx-auto max-w-3xl px-4 pb-12 sm:px-6">
        <header className="flex h-14 items-center gap-3">
          <Link
            aria-label={copy.back}
            className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-fog text-forest transition active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest"
            href={withLocale(locale, "/profile/store")}
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-base font-bold">{copy.title}</h1>
        </header>

        <div className="mb-5 mt-3 flex items-center gap-2 text-sm text-ink/70">
          <Store className="h-4 w-4 shrink-0 text-forest" />
          <span className="truncate">{publisher.merchant.name}</span>
        </div>

        {campaignState.status === "CREATED" ? (
          <section
            className="rounded-[1.5rem] bg-fog px-6 py-12 text-center"
            role="status"
          >
            <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-forest text-white">
              <CheckCircle2 className="h-7 w-7" />
            </span>
            <h2 className="mt-5 text-xl font-bold">{copy.campaignCreated}</h2>
            <Link
              className="mt-6 inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-forest px-6 text-sm font-bold text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest"
              href={withLocale(locale, "/profile/store")}
            >
              {copy.returnToStore}
              <ArrowUpRight className="h-4 w-4" />
            </Link>
          </section>
        ) : firstTemplate ? (
          <form action={campaignAction} className="space-y-8">
            <input name="locale" type="hidden" value={locale} />
            <input name="templateId" type="hidden" value={selectedTemplateId} />

            <fieldset>
              <legend className="flex items-center gap-3 text-base font-bold">
                <StepNumber value="1" />
                {copy.selectTemplate}
              </legend>
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                {publisher.templates.map((template) => {
                  const selected = template.id === selectedTemplateId;
                  return (
                    <button
                      aria-label={template.title}
                      aria-pressed={selected}
                      className={`relative min-w-0 overflow-hidden rounded-[1.125rem] bg-fog text-left transition active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest ${selected ? "ring-2 ring-forest" : "hover:ring-1 hover:ring-sand"}`}
                      key={template.id}
                      onClick={() => selectTemplate(template.id)}
                      type="button"
                    >
                      <div className="relative aspect-[4/3] bg-fog">
                        {template.imageUrl ? (
                          <Image
                            alt=""
                            className="object-cover"
                            fill
                            sizes="(max-width: 640px) 44vw, 14rem"
                            src={template.imageUrl}
                          />
                        ) : (
                          <Store className="absolute left-1/2 top-1/2 h-6 w-6 -translate-x-1/2 -translate-y-1/2 text-forest" />
                        )}
                      </div>
                      <p className="line-clamp-2 min-h-12 px-3 py-2 text-xs font-semibold leading-4">
                        {template.title}
                      </p>
                      {selected ? (
                        <span className="absolute right-2 top-2 grid h-7 w-7 place-items-center rounded-full bg-forest text-white">
                          <Check className="h-4 w-4" />
                        </span>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            </fieldset>

            <fieldset className="grid gap-4 border-t border-sand/40 pt-6">
              <legend className="flex items-center gap-3 pt-6 text-base font-bold">
                <StepNumber value="2" />
                {copy.offerSection}
              </legend>
              <Field label={copy.titleField}>
                <input
                  className={inputClassName}
                  maxLength={120}
                  name="title"
                  onChange={(event) => setTitle(event.target.value)}
                  required
                  value={title}
                />
              </Field>
              <Field label={copy.description}>
                <textarea
                  className={`${textareaClassName} min-h-28`}
                  maxLength={1200}
                  name="description"
                  onChange={(event) => setDescription(event.target.value)}
                  required
                  value={description}
                />
              </Field>
              <Field label={copy.conditions}>
                <textarea
                  className={`${textareaClassName} min-h-24`}
                  maxLength={1200}
                  name="terms"
                  onChange={(event) => setTerms(event.target.value)}
                  value={terms}
                />
              </Field>
            </fieldset>

            <fieldset className="grid gap-4 border-t border-sand/40 pt-6">
              <legend className="flex items-center gap-3 pt-6 text-base font-bold">
                <StepNumber value="3" />
                {copy.rulesSection}
              </legend>
              <Field label={copy.quantity}>
                <input
                  className={inputClassName}
                  defaultValue={100}
                  inputMode="numeric"
                  max={100000}
                  min={1}
                  name="quantityLimit"
                  required
                  type="number"
                />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label={copy.start}>
                  <input
                    className={inputClassName}
                    name="validFrom"
                    type="datetime-local"
                  />
                </Field>
                <Field label={copy.end}>
                  <input
                    className={inputClassName}
                    name="expiresAt"
                    required
                    type="datetime-local"
                  />
                </Field>
              </div>
            </fieldset>

            {campaignState.status ? (
              <p className="text-sm font-semibold text-danger" role="alert">
                {copy.campaignError}
              </p>
            ) : null}
            <button
              className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-forest px-5 text-sm font-bold text-white disabled:opacity-55 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest"
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
          </form>
        ) : (
          <p className="rounded-[1.25rem] bg-fog px-5 py-12 text-center text-sm text-ink/70">
            {copy.noTemplate}
          </p>
        )}
      </div>
    </main>
  );
}

const inputClassName =
  "h-12 min-w-0 w-full rounded-xl bg-fog px-4 text-base font-medium outline-none focus:ring-2 focus:ring-forest";
const textareaClassName =
  "w-full resize-y rounded-xl bg-fog px-4 py-3 text-base leading-6 outline-none focus:ring-2 focus:ring-forest";

function Field({
  children,
  label,
}: {
  children: React.ReactNode;
  label: string;
}) {
  return (
    <label className="grid min-w-0 gap-2 text-sm font-semibold text-ink/75">
      {label}
      {children}
    </label>
  );
}

function StepNumber({ value }: { value: string }) {
  return (
    <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-forest text-xs font-bold text-white">
      {value}
    </span>
  );
}

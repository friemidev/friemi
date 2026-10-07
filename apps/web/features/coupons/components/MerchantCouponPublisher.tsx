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
import { CouponQrCode } from "./CouponQrCode";

const initialCampaignState: CreateCouponCampaignState = {};

function getCopy(locale: string) {
  if (locale === "fr") {
    return {
      back: "Gérer les coupons",
      backToStore: "Retour aux coupons",
      campaignCreated: "Coupon publié",
      campaignError:
        "Vérifiez l'offre, la quantité et la date de fin. Elle doit être future et postérieure au début.",
      campaignUnavailable:
        "Ce modèle n'est plus disponible. Revenez à la boutique et réessayez.",
      conditions: "Conditions d'utilisation (facultatif)",
      copied: "Lien copié",
      copyLink: "Copier le lien",
      create: "Publier le coupon",
      description: "Contenu de l'offre",
      end: "Fin de validité",
      noTemplate:
        "Aucun modèle n'est disponible. Demandez à l'administrateur du site d'en configurer un.",
      offerSection: "L'offre",
      quantity: "Nombre total de coupons à recevoir",
      returnToStore: "Voir mes coupons",
      rulesSection: "Distribution et validité",
      selectTemplate: "Modèle de coupon",
      shareHint: "Montrez ce QR aux clients ou envoyez-leur le lien.",
      shareTitle: "Partager avec les clients",
      start: "Début (facultatif)",
      startsLater:
        "Les clients pourront le recevoir à partir de la date choisie.",
      store: "Boutique",
      title: "Publier un coupon",
      titleField: "Titre du coupon",
      templateHint:
        "Le modèle remplit l'offre. Vos modifications restent en place si vous en changez.",
    };
  }

  if (locale === "en") {
    return {
      back: "Manage coupons",
      backToStore: "Back to coupons",
      campaignCreated: "Coupon published",
      campaignError:
        "Check the offer, quantity, and end date. The end must be in the future and after the start.",
      campaignUnavailable:
        "This design is no longer available. Return to your store and try again.",
      conditions: "Conditions (optional)",
      copied: "Link copied",
      copyLink: "Copy claim link",
      create: "Publish coupon",
      description: "Offer details",
      end: "Valid until",
      noTemplate:
        "No coupon design is available. Ask a site administrator to configure one.",
      offerSection: "The offer",
      quantity: "Total number customers can claim",
      returnToStore: "View my coupons",
      rulesSection: "Quantity and validity",
      selectTemplate: "Coupon design",
      shareHint: "Show customers this QR code or send them the link.",
      shareTitle: "Share with customers",
      start: "Starts (optional)",
      startsLater: "Customers can claim it when the start time arrives.",
      store: "Store",
      title: "Publish coupon",
      titleField: "Coupon title",
      templateHint:
        "The design fills in the offer. Your edits stay when you switch designs.",
    };
  }

  return {
    back: "优惠券管理",
    backToStore: "返回优惠券管理",
    campaignCreated: "优惠券发布成功",
    campaignError:
      "请检查内容、数量和截止时间。截止时间须在未来且晚于开始时间。",
    campaignUnavailable: "该券面已不可用，请返回门店后重试。",
    conditions: "使用条件（可选）",
    copied: "链接已复制",
    copyLink: "复制领券链接",
    create: "确认发布",
    description: "优惠内容 / 折扣",
    end: "使用截止时间",
    noTemplate: "暂无可用券面，请联系网站管理员配置。",
    offerSection: "优惠内容",
    quantity: "最多可领取张数",
    returnToStore: "查看我的优惠券",
    rulesSection: "领取与有效期",
    selectTemplate: "选择优惠券模板",
    shareHint: "向顾客出示这个二维码，或把链接发给顾客。",
    shareTitle: "分享给顾客领券",
    start: "开始时间（可选）",
    startsLater: "顾客要等到开始时间才能领取。",
    store: "门店",
    title: "发布优惠券",
    titleField: "优惠券标题",
    templateHint: "模板会填入示例文案；修改后切换模板，不会覆盖已填内容。",
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
  const [contentEdited, setContentEdited] = useState(false);
  const [validFrom, setValidFrom] = useState("");
  const [campaignState, campaignAction, campaignPending] = useActionState(
    createCouponCampaignAction,
    initialCampaignState,
  );

  function selectTemplate(templateId: string) {
    const template = publisher.templates.find((item) => item.id === templateId);
    setSelectedTemplateId(templateId);
    if (!template || contentEdited) return;
    setTitle(template.title);
    setDescription(template.description);
    setTerms(template.defaultTerms ?? "");
  }

  return (
    <main className="app-mobile-page-shell min-h-svh bg-white text-ink">
      <div className="mx-auto max-w-3xl px-4 pb-12 sm:px-6">
        <header className="flex h-14 items-center gap-3">
          <Link
            aria-label={copy.back}
            className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-fog text-forest transition active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest"
            href={withLocale(locale, "/profile/store/coupons")}
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
          <MerchantCouponPublished
            locale={locale}
            path={campaignState.path}
            validFrom={validFrom}
          />
        ) : firstTemplate ? (
          <form action={campaignAction} className="space-y-8">
            <input name="locale" type="hidden" value={locale} />
            <input name="templateId" type="hidden" value={selectedTemplateId} />

            <fieldset>
              <legend className="flex items-center gap-3 text-base font-bold">
                <StepNumber value="1" />
                {copy.selectTemplate}
              </legend>
              <p className="mt-2 text-sm leading-6 text-ink/70">
                {copy.templateHint}
              </p>
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
                  onChange={(event) => {
                    setTitle(event.target.value);
                    setContentEdited(true);
                  }}
                  required
                  value={title}
                />
              </Field>
              <Field label={copy.description}>
                <textarea
                  className={`${textareaClassName} min-h-28`}
                  maxLength={1200}
                  name="description"
                  onChange={(event) => {
                    setDescription(event.target.value);
                    setContentEdited(true);
                  }}
                  required
                  value={description}
                />
              </Field>
              <Field label={copy.conditions}>
                <textarea
                  className={`${textareaClassName} min-h-24`}
                  maxLength={1200}
                  name="terms"
                  onChange={(event) => {
                    setTerms(event.target.value);
                    setContentEdited(true);
                  }}
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
                    onChange={(event) => setValidFrom(event.target.value)}
                    type="datetime-local"
                    value={validFrom}
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
                {campaignState.status === "FORBIDDEN"
                  ? copy.campaignUnavailable
                  : copy.campaignError}
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
          <section className="rounded-[1.25rem] bg-fog px-5 py-10 text-center">
            <p className="text-sm leading-6 text-ink/75">{copy.noTemplate}</p>
            <Link
              className="mt-5 inline-flex min-h-11 items-center justify-center rounded-full bg-forest px-5 text-sm font-semibold text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest"
              href={withLocale(locale, "/profile/store/coupons")}
            >
              {copy.backToStore}
            </Link>
          </section>
        )}
      </div>
    </main>
  );
}

export function MerchantCouponPublished({
  locale,
  path,
  validFrom,
}: {
  locale: string;
  path?: string;
  validFrom: string;
}) {
  const copy = getCopy(locale);

  return (
    <section
      className="rounded-[1.5rem] bg-fog px-6 py-12 text-center"
      role="status"
    >
      <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-forest text-white">
        <CheckCircle2 className="h-7 w-7" />
      </span>
      <h2 className="mt-5 text-xl font-bold">{copy.campaignCreated}</h2>
      {path ? (
        <div className="mt-6 rounded-[1.25rem] bg-paper px-4 py-5">
          <h3 className="text-base font-bold text-forest">{copy.shareTitle}</h3>
          <p className="mb-4 mt-1 text-sm leading-6 text-ink/75">
            {copy.shareHint}
          </p>
          <CouponQrCode
            copiedLabel={copy.copied}
            copyLabel={copy.copyLink}
            path={path}
          />
          {validFrom && new Date(validFrom).getTime() > Date.now() ? (
            <p className="mt-3 text-sm leading-6 text-ink/75">
              {copy.startsLater}
            </p>
          ) : null}
        </div>
      ) : null}
      <Link
        className="mt-6 inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-forest px-6 text-sm font-bold text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest"
        href={withLocale(locale, "/profile/store/coupons")}
      >
        {copy.returnToStore}
        <ArrowUpRight className="h-4 w-4" />
      </Link>
    </section>
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

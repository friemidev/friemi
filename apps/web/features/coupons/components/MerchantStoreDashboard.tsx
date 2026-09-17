"use client";

import Image from "next/image";
import Link from "next/link";
import { useActionState, useState } from "react";
import {
  ArrowLeft,
  CalendarDays,
  LoaderCircle,
  PencilLine,
  Store,
  Ticket,
  TicketCheck,
  UsersRound,
} from "lucide-react";
import {
  createCouponCampaignAction,
  unlistCouponCampaignAction,
  updateMerchantStoreAction,
  type CreateCouponCampaignState,
  type UnlistCouponCampaignState,
  type UpdateMerchantStoreState,
} from "@/features/coupons/actions/couponActions";
import type { MerchantStoreDashboardViewModel } from "@/features/coupons/queries/getMerchantStoreDashboard";
import { withLocale } from "@/lib/routes";
import { CouponQrCode } from "./CouponQrCode";
import { CouponRedemptionScanner } from "./CouponRedemptionScanner";

const initialUpdateState: UpdateMerchantStoreState = {};
const initialCampaignState: CreateCouponCampaignState = {};
const initialUnlistState: UnlistCouponCampaignState = {};

function getCopy(locale: string) {
  if (locale === "fr") {
    return {
      available: "Disponibles",
      back: "Profil",
      campaignCreated:
        "Coupon publié. Le QR reste valable pendant la campagne.",
      campaignError: "Vérifiez le contenu, la quantité et les dates.",
      campaigns: "Coupons publiés",
      claimed: "Reçus",
      claimedAt: "Reçu",
      conditions: "Conditions d'utilisation",
      copied: "Lien copié",
      copyLink: "Copier le lien",
      create: "Publier le coupon",
      createCampaign: "Nouveau coupon",
      description: "Présentation",
      edit: "Informations de la boutique",
      end: "Fin de validité",
      error: "Vérifiez le nom et la présentation.",
      fixedQr: "Ce QR peut être partagé avec tous les clients.",
      name: "Nom de la boutique",
      noCampaign: "Aucun coupon publié.",
      offer: "Contenu de l'offre",
      quantity: "Quantité disponible",
      recent: "Activité récente",
      redeemed: "Utilisés",
      redeemedAt: "Utilisé",
      save: "Enregistrer",
      saved: "Boutique mise à jour",
      selectTemplate: "Produit / visuel",
      start: "Début (facultatif)",
      statusPublished: "En ligne",
      statusExpired: "Expiré",
      statusNotStarted: "À venir",
      statusSoldOut: "Épuisé",
      statusUnlisted: "Retiré",
      title: "Boutique",
      titleField: "Titre du coupon",
      unlist: "Retirer",
    };
  }
  if (locale === "en") {
    return {
      available: "Available",
      back: "Profile",
      campaignCreated:
        "Coupon published. Its QR remains valid for this campaign.",
      campaignError: "Check the offer, quantity, and validity dates.",
      campaigns: "Published coupons",
      claimed: "Claimed",
      claimedAt: "Claimed",
      conditions: "Conditions",
      copied: "Link copied",
      copyLink: "Copy link",
      create: "Publish coupon",
      createCampaign: "New coupon",
      description: "Description",
      edit: "Store details",
      end: "Valid until",
      error: "Check the store name and description.",
      fixedQr: "Share this QR with any customer during the campaign.",
      name: "Store name",
      noCampaign: "No coupon campaigns yet.",
      offer: "Offer details",
      quantity: "Claim quantity",
      recent: "Recent activity",
      redeemed: "Redeemed",
      redeemedAt: "Redeemed",
      save: "Save",
      saved: "Store updated",
      selectTemplate: "Product / design",
      start: "Starts (optional)",
      statusPublished: "Published",
      statusExpired: "Expired",
      statusNotStarted: "Upcoming",
      statusSoldOut: "Claimed out",
      statusUnlisted: "Unlisted",
      title: "Store",
      titleField: "Coupon title",
      unlist: "Unlist",
    };
  }
  return {
    available: "待使用",
    back: "个人主页",
    campaignCreated: "优惠券已上架，同一期固定使用这个领券二维码。",
    campaignError: "请检查优惠内容、数量和使用期限。",
    campaigns: "优惠券批次",
    claimed: "已领取",
    claimedAt: "领取于",
    conditions: "使用条件",
    copied: "链接已复制",
    copyLink: "复制领券链接",
    create: "上架优惠券",
    createCampaign: "发布优惠券",
    description: "门店介绍",
    edit: "门店资料",
    end: "使用截止时间",
    error: "请检查门店名称和介绍。",
    fixedQr: "同一期优惠券共用此二维码，可在线上或线下持续展示。",
    name: "店铺名称",
    noCampaign: "还没有发布优惠券。",
    offer: "优惠内容 / 折扣",
    quantity: "可领取数量",
    recent: "最近领取",
    redeemed: "已核销",
    redeemedAt: "核销于",
    save: "保存资料",
    saved: "门店资料已更新",
    selectTemplate: "优惠对象 / 图片",
    start: "开始时间（可选）",
    statusPublished: "上架中",
    statusExpired: "已过期",
    statusNotStarted: "未开始",
    statusSoldOut: "已领完",
    statusUnlisted: "已下架",
    title: "门店",
    titleField: "优惠券标题",
    unlist: "下架",
  };
}

export function MerchantStoreDashboard({
  dashboard,
  locale,
}: {
  dashboard: MerchantStoreDashboardViewModel;
  locale: string;
}) {
  const copy = getCopy(locale);
  const firstTemplate = dashboard.templates[0];
  const [selectedTemplateId, setSelectedTemplateId] = useState(
    firstTemplate?.id ?? "",
  );
  const [title, setTitle] = useState(firstTemplate?.title ?? "");
  const [description, setDescription] = useState(
    firstTemplate?.description ?? "",
  );
  const [terms, setTerms] = useState(firstTemplate?.defaultTerms ?? "");
  const selectedTemplate =
    dashboard.templates.find(
      (template) => template.id === selectedTemplateId,
    ) ?? firstTemplate;
  const [storeState, storeAction, storePending] = useActionState(
    updateMerchantStoreAction,
    initialUpdateState,
  );
  const [campaignState, campaignAction, campaignPending] = useActionState(
    createCouponCampaignAction,
    initialCampaignState,
  );
  const [unlistState, unlistAction, unlistPending] = useActionState(
    unlistCouponCampaignAction,
    initialUnlistState,
  );

  function selectTemplate(templateId: string) {
    const template = dashboard.templates.find((item) => item.id === templateId);
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
          className="grid h-10 w-10 place-items-center rounded-full text-[#123D31] ring-1 ring-[#D6D5B2]"
          href={withLocale(locale, "/profile")}
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-xl font-black text-[#111210]">{copy.title}</h1>
        <span className="grid h-10 w-10 place-items-center rounded-full bg-[#EAF5E8] text-[#156240]">
          <Store className="h-5 w-5" />
        </span>
      </header>

      <section className="bg-white px-5 pb-7 pt-2">
        <p className="text-[11px] font-black uppercase text-[#6C746A]">
          Friemi Partner
        </p>
        <h2 className="mt-2 text-3xl font-black leading-tight text-[#111210]">
          {dashboard.merchant.name}
        </h2>
        <p className="mt-3 text-sm font-semibold leading-6 text-[#6C746A]">
          {dashboard.merchant.description}
        </p>
        <div className="mt-5 grid grid-cols-3 gap-2 border-t border-[#EFEAD7] pt-5 text-center">
          <StoreMetric
            label={copy.claimed}
            value={dashboard.stats.claimedCount}
          />
          <StoreMetric
            label={copy.available}
            value={dashboard.stats.availableCount}
          />
          <StoreMetric
            label={copy.redeemed}
            value={dashboard.stats.redeemedCount}
          />
        </div>
      </section>

      <section className="px-5 py-7">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-base font-black text-[#111210]">
            {copy.createCampaign}
          </h2>
          <Ticket className="h-5 w-5 text-[#156240]" />
        </div>
        {selectedTemplate ? (
          <form action={campaignAction} className="mt-4 grid gap-4">
            <input name="locale" type="hidden" value={locale} />
            <label className="grid gap-2 text-xs font-black text-[#4F574F]">
              {copy.selectTemplate}
              <select
                className="h-12 rounded-lg bg-white px-4 text-sm font-bold outline-none ring-1 ring-[#D6D5B2] focus:ring-2 focus:ring-[#8AB68E]"
                name="templateId"
                onChange={(event) => selectTemplate(event.target.value)}
                value={selectedTemplateId}
              >
                {dashboard.templates.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.title}
                  </option>
                ))}
              </select>
            </label>
            {selectedTemplate.imageUrl ? (
              <div className="overflow-hidden rounded-lg bg-white ring-1 ring-[#D6D5B2]">
                <Image
                  alt={selectedTemplate.title}
                  className="aspect-[4/3] h-auto w-full object-cover"
                  height={1086}
                  sizes="(max-width: 640px) calc(100vw - 2.5rem), 36rem"
                  src={selectedTemplate.imageUrl}
                  width={1448}
                />
              </div>
            ) : null}
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
            <Field label={copy.offer}>
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
            <div className="grid grid-cols-2 gap-3">
              <Field label={copy.start}>
                <input
                  className="h-12 min-w-0 rounded-lg bg-white px-3 text-xs font-bold outline-none ring-1 ring-[#D6D5B2]"
                  name="validFrom"
                  type="datetime-local"
                />
              </Field>
              <Field label={copy.end}>
                <input
                  className="h-12 min-w-0 rounded-lg bg-white px-3 text-xs font-bold outline-none ring-1 ring-[#D6D5B2]"
                  name="expiresAt"
                  required
                  type="datetime-local"
                />
              </Field>
            </div>
            <Field label={copy.quantity}>
              <input
                className="h-12 rounded-lg bg-white px-4 text-sm font-bold outline-none ring-1 ring-[#D6D5B2]"
                defaultValue={100}
                inputMode="numeric"
                max={100000}
                min={1}
                name="quantityLimit"
                required
                type="number"
              />
            </Field>
            {campaignState.status === "CREATED" ? (
              <p className="text-sm font-bold text-[#156240]">
                {copy.campaignCreated}
              </p>
            ) : campaignState.status ? (
              <p className="text-sm font-bold text-[#A62834]">
                {copy.campaignError}
              </p>
            ) : null}
            <button
              className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-[#156240] px-5 text-sm font-black text-white disabled:opacity-55"
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
          <p className="mt-4 text-sm font-semibold text-[#7A8276]">-</p>
        )}
      </section>

      <section className="border-y border-[#EFEAD7] bg-white px-5 py-7">
        <h2 className="text-base font-black text-[#111210]">
          {copy.campaigns}
        </h2>
        <div className="mt-4 grid gap-5">
          {dashboard.campaigns.map((campaign) => {
            const isPublished = campaign.campaignStatus === "PUBLISHED";
            const canClaim = campaign.claimAvailability === "AVAILABLE";
            const statusLabel =
              campaign.claimAvailability === "EXPIRED"
                ? copy.statusExpired
                : campaign.claimAvailability === "NOT_STARTED"
                  ? copy.statusNotStarted
                  : campaign.claimAvailability === "SOLD_OUT"
                    ? copy.statusSoldOut
                    : isPublished
                      ? copy.statusPublished
                      : copy.statusUnlisted;
            const path = campaign.claimToken
              ? withLocale(locale, `/coupons/claim/${campaign.claimToken}`)
              : null;
            return (
              <article
                className="overflow-hidden rounded-lg ring-1 ring-[#D6D5B2]"
                key={campaign.id}
              >
                {campaign.imageUrl ? (
                  <Image
                    alt={campaign.title}
                    className="aspect-[4/3] h-auto w-full object-cover"
                    height={600}
                    sizes="(max-width: 640px) calc(100vw - 2.5rem), 36rem"
                    src={campaign.imageUrl}
                    width={800}
                  />
                ) : null}
                <div className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="text-base font-black text-[#111210]">
                        {campaign.title}
                      </h3>
                      <p className="mt-1 text-xs font-semibold leading-5 text-[#6C746A]">
                        {campaign.description}
                      </p>
                    </div>
                    <span
                      className={`shrink-0 text-xs font-black ${canClaim ? "text-[#156240]" : "text-[#7A8276]"}`}
                    >
                      {statusLabel}
                    </span>
                  </div>
                  <p className="mt-3 text-xs font-bold text-[#156240]">
                    {campaign.claimedCount}/{campaign.quantityLimit ?? "∞"}
                  </p>
                  {canClaim && path ? (
                    <div className="mt-4 border-t border-[#EFEAD7] pt-4">
                      <CouponQrCode
                        copiedLabel={copy.copied}
                        copyLabel={copy.copyLink}
                        path={path}
                      />
                      <p className="mt-2 text-center text-xs font-semibold leading-5 text-[#6C746A]">
                        {copy.fixedQr}
                      </p>
                    </div>
                  ) : null}
                  {isPublished ? (
                    <form action={unlistAction} className="mt-4">
                      <input
                        name="couponId"
                        type="hidden"
                        value={campaign.id}
                      />
                      <input name="locale" type="hidden" value={locale} />
                      <button
                        className="h-10 w-full rounded-full text-sm font-black text-[#A62834] ring-1 ring-[#E7B8B1] disabled:opacity-50"
                        disabled={unlistPending}
                        type="submit"
                      >
                        {copy.unlist}
                      </button>
                    </form>
                  ) : null}
                  {unlistState.couponId === campaign.id &&
                  unlistState.status === "UNLISTED" ? (
                    <p className="mt-2 text-center text-xs font-bold text-[#156240]">
                      {copy.statusUnlisted}
                    </p>
                  ) : null}
                </div>
              </article>
            );
          })}
          {dashboard.campaigns.length === 0 ? (
            <p className="py-4 text-center text-sm font-semibold text-[#7A8276]">
              {copy.noCampaign}
            </p>
          ) : null}
        </div>
        <div className="mt-5">
          <CouponRedemptionScanner locale={locale} />
        </div>
      </section>

      <section className="px-5 py-7">
        <div className="flex items-center gap-2">
          <PencilLine className="h-4 w-4 text-[#156240]" />
          <h2 className="text-base font-black text-[#111210]">{copy.edit}</h2>
        </div>
        <form action={storeAction} className="mt-4 grid gap-4">
          <input name="locale" type="hidden" value={locale} />
          <Field label={copy.name}>
            <input
              className="h-12 rounded-lg bg-white px-4 text-sm font-bold outline-none ring-1 ring-[#D6D5B2]"
              defaultValue={dashboard.merchant.name}
              maxLength={80}
              name="name"
              required
            />
          </Field>
          <Field label={copy.description}>
            <textarea
              className="min-h-28 resize-y rounded-lg bg-white px-4 py-3 text-sm font-semibold leading-6 outline-none ring-1 ring-[#D6D5B2]"
              defaultValue={dashboard.merchant.description}
              maxLength={1200}
              name="description"
              required
            />
          </Field>
          {storeState.success ? (
            <p className="text-sm font-bold text-[#156240]">{copy.saved}</p>
          ) : null}
          {storeState.error ? (
            <p className="text-sm font-bold text-[#A62834]">{copy.error}</p>
          ) : null}
          <button
            className="h-11 rounded-full bg-[#111210] px-5 text-sm font-black text-white disabled:opacity-55"
            disabled={storePending}
            type="submit"
          >
            {copy.save}
          </button>
        </form>
      </section>

      <section className="border-t border-[#EFEAD7] bg-white px-5 py-7">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-base font-black text-[#111210]">{copy.recent}</h2>
          <UsersRound className="h-5 w-5 text-[#156240]" />
        </div>
        <div className="mt-3 divide-y divide-[#EFEAD7]">
          {dashboard.recentItems.map((item) => (
            <div className="flex items-center gap-3 py-3.5" key={item.id}>
              <span className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-full bg-[#EAF5E8] text-sm font-black text-[#156240]">
                {item.owner.avatarUrl ? (
                  <img
                    alt=""
                    className="h-full w-full object-cover"
                    src={item.owner.avatarUrl}
                  />
                ) : (
                  item.owner.nickname.slice(0, 1).toUpperCase()
                )}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-black text-[#111210]">
                  {item.owner.nickname}
                </p>
                <p className="mt-1 flex items-center gap-1 text-[11px] font-semibold text-[#7A8276]">
                  <CalendarDays className="h-3.5 w-3.5" />
                  {item.redeemedAt ? copy.redeemedAt : copy.claimedAt} ·{" "}
                  {new Intl.DateTimeFormat(locale, {
                    dateStyle: "short",
                    timeStyle: "short",
                  }).format(new Date(item.redeemedAt ?? item.claimedAt))}
                </p>
                <p className="mt-1 truncate text-[11px] font-bold text-[#156240]">
                  {item.coupon.title}
                </p>
              </div>
              <span className="text-xs font-black text-[#156240]">
                {item.status === "REDEEMED" ? copy.redeemed : copy.available}
              </span>
            </div>
          ))}
          {dashboard.recentItems.length === 0 ? (
            <p className="py-8 text-center text-sm font-semibold text-[#7A8276]">
              -
            </p>
          ) : null}
        </div>
      </section>
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

function StoreMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="min-w-0">
      <p className="text-2xl font-black text-[#111210]">{value}</p>
      <p className="mt-1 truncate text-[11px] font-bold text-[#7A8276]">
        {label}
      </p>
    </div>
  );
}

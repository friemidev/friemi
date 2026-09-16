"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import {
  Building2,
  ChevronDown,
  Globe2,
  Loader2,
  Mail,
  MapPin,
  Palette,
  Plus,
  Store,
  TicketCheck,
  TicketPlus,
  UserRoundCheck,
  type LucideIcon,
} from "lucide-react";
import { toast, Toaster } from "sonner";
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Textarea,
} from "@chill-club/ui";
import { FormField } from "@/components/admin/FormField";
import type {
  AdminMerchantCandidate,
  AdminMerchantListItem,
} from "@/lib/admin-scraper";
import type { AdminCouponTemplate } from "@/features/coupons/adminCoupons";
import { platformCouponTemplates } from "@/features/coupons/platformCouponTemplates";
import { withLocale } from "@/lib/routes";
import { cn } from "@/lib/utils";

type MerchantManagementClientProps = {
  initialCandidates: AdminMerchantCandidate[];
  initialCoupons: AdminCouponTemplate[];
  initialMerchants: AdminMerchantListItem[];
  locale: string;
};

type MerchantFormState = {
  name: string;
  slug: string;
  description: string;
  city: string;
  address: string;
  latitude: string;
  longitude: string;
  websiteUrl: string;
  contactEmail: string;
};

const emptyMerchantForm = (): MerchantFormState => ({
  name: "",
  slug: "",
  description: "",
  city: "Paris",
  address: "",
  latitude: "",
  longitude: "",
  websiteUrl: "",
  contactEmail: "",
});

type CouponFormState = {
  accentColor: string;
  backgroundColor: string;
  description: string;
  expiresAt: string;
  foregroundColor: string;
  terms: string;
  title: string;
};

const emptyCouponForm = (): CouponFormState => ({
  accentColor: "#F1F2E3",
  backgroundColor: "#0F6D46",
  description: "",
  expiresAt: "",
  foregroundColor: "#FFFFFF",
  terms: "",
  title: "",
});

export function MerchantManagementClient({
  initialCandidates,
  initialCoupons,
  initialMerchants,
  locale,
}: MerchantManagementClientProps) {
  const [merchants, setMerchants] = useState(initialMerchants);
  const [coupons, setCoupons] = useState(initialCoupons);
  const [candidates, setCandidates] = useState(initialCandidates);
  const [selectedProfileId, setSelectedProfileId] = useState("");
  const [isAssigning, setIsAssigning] = useState(false);
  const [merchantForm, setMerchantForm] =
    useState<MerchantFormState>(emptyMerchantForm);
  const [isSaving, setIsSaving] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [couponEditorMerchantId, setCouponEditorMerchantId] = useState<
    string | null
  >(null);
  const [couponForm, setCouponForm] =
    useState<CouponFormState>(emptyCouponForm);
  const [isCouponSaving, setIsCouponSaving] = useState(false);
  const [couponTemplateSelections, setCouponTemplateSelections] = useState<
    Record<string, string>
  >({});
  const [bindingTemplateMerchantId, setBindingTemplateMerchantId] = useState<
    string | null
  >(null);
  const canCreateMerchant =
    merchantForm.name.trim().length > 0 &&
    merchantForm.description.trim().length > 0 &&
    !isSaving;

  async function assignMerchantAccount(
    event: React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();
    if (!selectedProfileId || isAssigning) return;
    setIsAssigning(true);

    try {
      const response = await fetch("/api/admin/merchants/assign-owner", {
        body: JSON.stringify({ profileId: selectedProfileId }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      if (!response.ok) {
        toast.error("升级店家失败，请确认账号仍然有效");
        return;
      }

      const json = (await response.json()) as {
        merchant: AdminMerchantListItem;
      };
      setMerchants((current) =>
        [
          ...current.filter((item) => item.id !== json.merchant.id),
          json.merchant,
        ].sort((a, b) => a.name.localeCompare(b.name)),
      );
      setCandidates((current) =>
        current.filter((item) => item.id !== selectedProfileId),
      );
      setSelectedProfileId("");
      toast.success("账号已升级为店家，默认优惠券已启用");
    } catch {
      toast.error("升级店家失败，请稍后重试");
    } finally {
      setIsAssigning(false);
    }
  }

  async function submitMerchantForm(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);

    try {
      const response = await fetch("/api/admin/merchants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: merchantForm.name,
          slug: merchantForm.slug || null,
          description: merchantForm.description,
          city: merchantForm.city,
          address: merchantForm.address || null,
          latitude: merchantForm.latitude || null,
          longitude: merchantForm.longitude || null,
          websiteUrl: merchantForm.websiteUrl || null,
          contactEmail: merchantForm.contactEmail || null,
        }),
      });

      if (response.status === 409) {
        toast.error("商家 URL 标识已存在，请换一个 slug");
        return;
      }

      if (!response.ok) {
        toast.error("商家创建失败，请检查必填信息");
        return;
      }

      const json = await response.json();
      const merchant = json.merchant as AdminMerchantListItem;
      setMerchants((current) =>
        [...current, merchant].sort((a, b) => a.name.localeCompare(b.name)),
      );
      setMerchantForm(emptyMerchantForm());
      setIsCreateOpen(false);
      toast.success("合作商家已创建，可在活动表单中关联");
    } catch {
      toast.error("商家创建失败，请稍后重试");
    } finally {
      setIsSaving(false);
    }
  }

  async function submitCouponForm(
    event: React.FormEvent<HTMLFormElement>,
    merchantId: string,
  ) {
    event.preventDefault();
    if (!couponForm.title.trim() || !couponForm.description.trim()) return;
    setIsCouponSaving(true);

    try {
      const response = await fetch(
        `/api/admin/merchants/${merchantId}/coupons`,
        {
          body: JSON.stringify({
            ...couponForm,
            expiresAt: couponForm.expiresAt
              ? new Date(couponForm.expiresAt).toISOString()
              : null,
            terms: couponForm.terms || null,
          }),
          headers: { "Content-Type": "application/json" },
          method: "POST",
        },
      );

      if (!response.ok) {
        toast.error("优惠券创建失败，请检查内容和样式");
        return;
      }

      const json = (await response.json()) as {
        coupon: AdminCouponTemplate;
      };
      setCoupons((current) => [...current, json.coupon]);
      setCouponForm(emptyCouponForm());
      setCouponEditorMerchantId(null);
      toast.success("优惠券已添加，店家现在可以选择并生成领取码");
    } catch {
      toast.error("优惠券创建失败，请稍后重试");
    } finally {
      setIsCouponSaving(false);
    }
  }

  async function bindPlatformCoupon(merchantId: string) {
    if (bindingTemplateMerchantId) return;
    const platformTemplateKey =
      couponTemplateSelections[merchantId] ??
      platformCouponTemplates[0]?.key ??
      "";
    if (!platformTemplateKey) return;

    setBindingTemplateMerchantId(merchantId);
    try {
      const response = await fetch(
        `/api/admin/merchants/${merchantId}/coupons`,
        {
          body: JSON.stringify({ platformTemplateKey }),
          headers: { "Content-Type": "application/json" },
          method: "POST",
        },
      );

      if (!response.ok) {
        toast.error("平台优惠券绑定失败，请稍后重试");
        return;
      }

      const json = (await response.json()) as {
        coupon: AdminCouponTemplate;
      };
      setCoupons((current) => [
        ...current.filter((coupon) => coupon.id !== json.coupon.id),
        json.coupon,
      ]);
      toast.success("平台优惠券已绑定，店家现在可以选择发放");
    } catch {
      toast.error("平台优惠券绑定失败，请稍后重试");
    } finally {
      setBindingTemplateMerchantId(null);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <Toaster position="top-center" richColors closeButton />

      <Card className="shadow-sm">
        <CardHeader className="p-4 pb-2 sm:p-5 sm:pb-3">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-md bg-emerald-50 text-emerald-700">
              <UserRoundCheck className="h-5 w-5" aria-hidden />
            </span>
            <div>
              <CardTitle>升级账号为店家</CardTitle>
              <p className="mt-1 text-sm text-zinc-500">
                店家身份独立于管理员权限，管理员账号也可以拥有门店。
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-4 pt-2 sm:p-5 sm:pt-2">
          <form
            className="flex flex-col gap-3 sm:flex-row"
            onSubmit={assignMerchantAccount}
          >
            <select
              className="h-11 min-w-0 flex-1 rounded-md border border-zinc-200 bg-white px-3 text-sm text-zinc-900 outline-none focus:border-emerald-600"
              onChange={(event) => setSelectedProfileId(event.target.value)}
              value={selectedProfileId}
            >
              <option value="">选择普通账号</option>
              {candidates.map((candidate) => (
                <option key={candidate.id} value={candidate.id}>
                  {candidate.nickname} ·{" "}
                  {candidate.friendCode ?? candidate.email ?? candidate.id}
                </option>
              ))}
            </select>
            <Button
              className="h-11 whitespace-nowrap"
              disabled={!selectedProfileId || isAssigning}
              type="submit"
            >
              {isAssigning ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
              ) : (
                <Store className="mr-2 h-4 w-4" aria-hidden />
              )}
              升级并开通门店
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="flex flex-col gap-5 lg:flex-row lg:items-start">
        <Card
          className={cn(
            "order-1 shadow-sm",
            isCreateOpen
              ? "lg:fixed lg:inset-0 lg:z-50 lg:flex lg:items-center lg:justify-center lg:rounded-none lg:border-0 lg:bg-black/40 lg:p-6 lg:shadow-none"
              : "lg:hidden",
          )}
        >
          <div
            className={cn(
              isCreateOpen &&
                "lg:max-h-[90vh] lg:w-full lg:max-w-3xl lg:overflow-y-auto lg:rounded-lg lg:border lg:border-zinc-200 lg:bg-white lg:shadow-xl",
            )}
          >
            <CardHeader className="p-4 pb-2 sm:p-5 sm:pb-3">
              <div className="flex items-center justify-between gap-3">
                <CardTitle>新增合作商家</CardTitle>
                <button
                  type="button"
                  aria-expanded={isCreateOpen}
                  onClick={() => setIsCreateOpen((current) => !current)}
                  className="inline-flex h-9 shrink-0 items-center gap-1 rounded-md bg-zinc-950 px-3 text-sm font-medium text-white transition hover:bg-zinc-800"
                >
                  <span className="lg:hidden">
                    {isCreateOpen ? "收起" : "展开"}
                  </span>
                  <span className="hidden lg:inline">关闭</span>
                  <ChevronDown
                    className={
                      isCreateOpen
                        ? "h-4 w-4 rotate-180 transition"
                        : "h-4 w-4 transition"
                    }
                    aria-hidden
                  />
                </button>
              </div>
            </CardHeader>
            <CardContent
              className={
                isCreateOpen
                  ? "space-y-4 p-4 pt-0 sm:p-5 sm:pt-0"
                  : "hidden space-y-4 p-4 pt-0 sm:p-5 sm:pt-0"
              }
            >
              <p className="text-sm leading-6 text-zinc-600">
                合作商家可以是咖啡馆、展馆、餐厅或活动机构。先维护基础资料，再在活动运营页关联到具体活动。
              </p>
              <form
                className="grid gap-3 sm:gap-4"
                onSubmit={submitMerchantForm}
              >
                <div className="space-y-3">
                  <FormSectionTitle title="基本信息" />
                  <div className="grid gap-3 md:grid-cols-2">
                    <FormField label="商家名称 *">
                      <Input
                        className="h-9"
                        value={merchantForm.name}
                        onChange={(e) =>
                          setMerchantForm({
                            ...merchantForm,
                            name: e.target.value,
                          })
                        }
                      />
                    </FormField>
                    <FormField
                      label="URL 标识（可选）"
                      hint="留空时会根据名称自动生成。"
                    >
                      <Input
                        className="h-9"
                        placeholder="paris-community-cafe"
                        value={merchantForm.slug}
                        onChange={(e) =>
                          setMerchantForm({
                            ...merchantForm,
                            slug: e.target.value,
                          })
                        }
                      />
                    </FormField>
                  </div>
                  <FormField label="商家简介 *">
                    <Textarea
                      className="min-h-20"
                      placeholder="一句话说明商家的类型、特色或适合关联的活动。"
                      value={merchantForm.description}
                      onChange={(e) =>
                        setMerchantForm({
                          ...merchantForm,
                          description: e.target.value,
                        })
                      }
                    />
                  </FormField>
                </div>

                <div className="space-y-3 border-t border-black/5 pt-4">
                  <FormSectionTitle title="地址信息" />
                  <div className="grid gap-3 md:grid-cols-2">
                    <FormField label="城市">
                      <Input
                        className="h-9"
                        value={merchantForm.city}
                        onChange={(e) =>
                          setMerchantForm({
                            ...merchantForm,
                            city: e.target.value,
                          })
                        }
                      />
                    </FormField>
                    <FormField label="地址（可选）">
                      <Input
                        className="h-9"
                        value={merchantForm.address}
                        onChange={(e) =>
                          setMerchantForm({
                            ...merchantForm,
                            address: e.target.value,
                          })
                        }
                      />
                    </FormField>
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    <FormField label="纬度（可选）">
                      <Input
                        className="h-9"
                        inputMode="decimal"
                        placeholder="48.8566"
                        value={merchantForm.latitude}
                        onChange={(e) =>
                          setMerchantForm({
                            ...merchantForm,
                            latitude: e.target.value,
                          })
                        }
                      />
                    </FormField>
                    <FormField label="经度（可选）">
                      <Input
                        className="h-9"
                        inputMode="decimal"
                        placeholder="2.3522"
                        value={merchantForm.longitude}
                        onChange={(e) =>
                          setMerchantForm({
                            ...merchantForm,
                            longitude: e.target.value,
                          })
                        }
                      />
                    </FormField>
                  </div>
                </div>

                <div className="space-y-3 border-t border-black/5 pt-4">
                  <FormSectionTitle title="联系信息" />
                  <div className="grid gap-3 md:grid-cols-2">
                    <FormField label="官网（可选）">
                      <Input
                        className="h-9"
                        placeholder="https://"
                        value={merchantForm.websiteUrl}
                        onChange={(e) =>
                          setMerchantForm({
                            ...merchantForm,
                            websiteUrl: e.target.value,
                          })
                        }
                      />
                    </FormField>
                    <FormField label="联系邮箱（可选）">
                      <Input
                        className="h-9"
                        type="email"
                        value={merchantForm.contactEmail}
                        onChange={(e) =>
                          setMerchantForm({
                            ...merchantForm,
                            contactEmail: e.target.value,
                          })
                        }
                      />
                    </FormField>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="submit"
                    disabled={!canCreateMerchant}
                    className="min-w-32 whitespace-nowrap"
                  >
                    {isSaving ? (
                      <>
                        <Loader2
                          className="mr-2 h-4 w-4 animate-spin"
                          aria-hidden
                        />
                        创建中
                      </>
                    ) : (
                      "创建合作商家"
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={isSaving}
                    className="whitespace-nowrap"
                    onClick={() => setMerchantForm(emptyMerchantForm())}
                  >
                    清空
                  </Button>
                </div>
              </form>
            </CardContent>
          </div>
        </Card>

        <Card className="order-2 shadow-sm lg:order-1 lg:min-h-[24rem] lg:flex-1">
          <CardHeader className="p-4 pb-2 sm:p-5 sm:pb-3">
            <div className="flex items-center justify-between gap-3">
              <CardTitle>商家列表</CardTitle>
              <span className="shrink-0 rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-600">
                {merchants.length} 个
              </span>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 p-4 pt-0 sm:p-5 sm:pt-0">
            {merchants.length === 0 ? (
              <div className="rounded-md border border-dashed border-black/15 bg-paper/70 px-4 py-10 text-center sm:py-12 lg:flex lg:min-h-56 lg:flex-col lg:items-center lg:justify-center">
                <p className="text-sm font-medium text-ink">暂无商家</p>
                <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-zinc-500">
                  先维护一个合作商家，之后创建或导入活动时可以直接关联到它的主页。
                </p>
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(true)}
                  className="mt-5 inline-flex h-10 items-center justify-center gap-2 whitespace-nowrap rounded-md bg-zinc-950 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-zinc-800"
                >
                  <Plus className="h-4 w-4" aria-hidden />
                  新增合作商家
                </button>
              </div>
            ) : (
              <div className="grid gap-3 lg:max-h-[calc(100vh-14rem)] lg:overflow-auto lg:pr-1">
                {merchants.map((merchant) => (
                  <article
                    key={merchant.id}
                    className="rounded-md border border-black/10 bg-white p-4 shadow-sm"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0 space-y-2">
                        <div className="flex min-w-0 items-center gap-2">
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-zinc-950 text-white">
                            <Building2 className="h-4 w-4" aria-hidden />
                          </span>
                          <div className="min-w-0">
                            <h2 className="truncate text-base font-semibold text-ink">
                              {merchant.name}
                            </h2>
                            <p className="truncate text-xs text-zinc-500">
                              /merchants/{merchant.slug}
                            </p>
                          </div>
                        </div>
                        <p className="line-clamp-2 text-sm leading-6 text-zinc-600">
                          {merchant.description}
                        </p>
                      </div>
                      <Link
                        className="inline-flex h-9 shrink-0 items-center justify-center whitespace-nowrap rounded-md bg-white px-3 text-sm font-medium text-zinc-950 ring-1 ring-zinc-200 transition hover:bg-zinc-50"
                        href={withLocale(locale, `/merchants/${merchant.slug}`)}
                      >
                        查看主页
                      </Link>
                    </div>

                    <div className="mt-4 grid gap-2 text-sm text-zinc-600 sm:grid-cols-2">
                      <InfoLine
                        icon={MapPin}
                        text={merchant.address || merchant.city}
                      />
                      {merchant.websiteUrl ? (
                        <InfoLine icon={Globe2} text={merchant.websiteUrl} />
                      ) : null}
                      {merchant.contactEmail ? (
                        <InfoLine icon={Mail} text={merchant.contactEmail} />
                      ) : null}
                      <div className="text-sm font-medium text-zinc-700">
                        关联活动：{merchant.activityCount}
                      </div>
                      {merchant.owner ? (
                        <div className="text-sm font-medium text-emerald-700">
                          店家账号：{merchant.owner.nickname}
                        </div>
                      ) : null}
                    </div>

                    <div className="mt-4 border-t border-black/5 pt-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex min-w-0 items-center gap-2">
                          <Palette className="h-4 w-4 shrink-0 text-emerald-700" />
                          <p className="text-sm font-semibold text-zinc-800">
                            优惠券样式
                          </p>
                          <span className="text-xs text-zinc-500">
                            {
                              coupons.filter(
                                (coupon) => coupon.merchantId === merchant.id,
                              ).length
                            }{" "}
                            种
                          </span>
                        </div>
                        <button
                          className="inline-flex h-9 items-center gap-2 rounded-md bg-emerald-700 px-3 text-xs font-semibold text-white transition hover:bg-emerald-800"
                          onClick={() => {
                            setCouponEditorMerchantId((current) =>
                              current === merchant.id ? null : merchant.id,
                            );
                            setCouponForm(emptyCouponForm());
                          }}
                          type="button"
                        >
                          <TicketPlus className="h-4 w-4" />
                          添加优惠券
                        </button>
                      </div>

                      {platformCouponTemplates.length > 0 ? (
                        <div className="mt-3 grid gap-3 rounded-md bg-emerald-50/60 p-3 ring-1 ring-emerald-100 sm:grid-cols-[9rem_minmax(0,1fr)]">
                          {(() => {
                            const selectedTemplate =
                              platformCouponTemplates.find(
                                (template) =>
                                  template.key ===
                                  (couponTemplateSelections[merchant.id] ??
                                    platformCouponTemplates[0]?.key),
                              ) ?? platformCouponTemplates[0];

                            return selectedTemplate ? (
                              <>
                                <div className="overflow-hidden rounded-md bg-white ring-1 ring-black/10">
                                  <Image
                                    alt={selectedTemplate.title}
                                    className="aspect-[4/3] h-full w-full object-cover"
                                    height={1086}
                                    sizes="144px"
                                    src={selectedTemplate.imageUrl}
                                    width={1448}
                                  />
                                </div>
                                <div className="min-w-0">
                                  <p className="text-xs font-semibold text-emerald-800">
                                    平台设计优惠券
                                  </p>
                                  <select
                                    className="mt-2 h-10 w-full rounded-md border border-emerald-200 bg-white px-3 text-sm font-semibold text-zinc-900 outline-none focus:border-emerald-600"
                                    onChange={(event) =>
                                      setCouponTemplateSelections((current) => ({
                                        ...current,
                                        [merchant.id]: event.target.value,
                                      }))
                                    }
                                    value={selectedTemplate.key}
                                  >
                                    {platformCouponTemplates.map((template) => (
                                      <option
                                        key={template.key}
                                        value={template.key}
                                      >
                                        {template.title}
                                      </option>
                                    ))}
                                  </select>
                                  <button
                                    className="mt-2 inline-flex h-9 w-full items-center justify-center gap-2 rounded-md bg-emerald-700 px-3 text-xs font-semibold text-white transition hover:bg-emerald-800 disabled:opacity-55"
                                    disabled={
                                      bindingTemplateMerchantId === merchant.id
                                    }
                                    onClick={() =>
                                      void bindPlatformCoupon(merchant.id)
                                    }
                                    type="button"
                                  >
                                    {bindingTemplateMerchantId === merchant.id ? (
                                      <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                      <TicketCheck className="h-4 w-4" />
                                    )}
                                    绑定到此门店
                                  </button>
                                </div>
                              </>
                            ) : null;
                          })()}
                        </div>
                      ) : null}

                      <div className="mt-3 flex flex-wrap gap-2">
                        {coupons
                          .filter((coupon) => coupon.merchantId === merchant.id)
                          .map((coupon) => (
                            <span
                              className="inline-flex h-8 items-center gap-2 rounded-full px-3 text-xs font-semibold ring-1 ring-black/10"
                              key={coupon.id}
                              style={{
                                backgroundColor: coupon.backgroundColor,
                                color: coupon.foregroundColor,
                              }}
                            >
                              {coupon.imageUrl ? (
                                <Image
                                  alt=""
                                  className="h-5 w-7 rounded-sm object-cover"
                                  height={21}
                                  src={coupon.imageUrl}
                                  width={28}
                                />
                              ) : (
                                <span
                                  className="h-2.5 w-2.5 rounded-full ring-1 ring-black/10"
                                  style={{
                                    backgroundColor: coupon.accentColor,
                                  }}
                                />
                              )}
                              {coupon.title}
                            </span>
                          ))}
                      </div>

                      {couponEditorMerchantId === merchant.id ? (
                        <form
                          className="mt-4 grid gap-3 border-t border-dashed border-black/10 pt-4"
                          onSubmit={(event) =>
                            submitCouponForm(event, merchant.id)
                          }
                        >
                          <div className="grid gap-3 sm:grid-cols-2">
                            <FormField label="优惠券名称 *">
                              <Input
                                className="h-10"
                                maxLength={120}
                                onChange={(event) =>
                                  setCouponForm({
                                    ...couponForm,
                                    title: event.target.value,
                                  })
                                }
                                value={couponForm.title}
                              />
                            </FormField>
                            <FormField label="有效期（可选）">
                              <Input
                                className="h-10"
                                onChange={(event) =>
                                  setCouponForm({
                                    ...couponForm,
                                    expiresAt: event.target.value,
                                  })
                                }
                                type="date"
                                value={couponForm.expiresAt}
                              />
                            </FormField>
                          </div>
                          <FormField label="优惠内容 *">
                            <Textarea
                              className="min-h-20"
                              maxLength={1200}
                              onChange={(event) =>
                                setCouponForm({
                                  ...couponForm,
                                  description: event.target.value,
                                })
                              }
                              value={couponForm.description}
                            />
                          </FormField>
                          <FormField label="使用规则（可选）">
                            <Textarea
                              className="min-h-16"
                              maxLength={1200}
                              onChange={(event) =>
                                setCouponForm({
                                  ...couponForm,
                                  terms: event.target.value,
                                })
                              }
                              value={couponForm.terms}
                            />
                          </FormField>
                          <div className="grid grid-cols-3 gap-3">
                            <ColorField
                              label="底色"
                              onChange={(backgroundColor) =>
                                setCouponForm({
                                  ...couponForm,
                                  backgroundColor,
                                })
                              }
                              value={couponForm.backgroundColor}
                            />
                            <ColorField
                              label="文字"
                              onChange={(foregroundColor) =>
                                setCouponForm({
                                  ...couponForm,
                                  foregroundColor,
                                })
                              }
                              value={couponForm.foregroundColor}
                            />
                            <ColorField
                              label="强调"
                              onChange={(accentColor) =>
                                setCouponForm({
                                  ...couponForm,
                                  accentColor,
                                })
                              }
                              value={couponForm.accentColor}
                            />
                          </div>
                          <div
                            className="rounded-md px-4 py-4 shadow-sm"
                            style={{
                              backgroundColor: couponForm.backgroundColor,
                              color: couponForm.foregroundColor,
                            }}
                          >
                            <p className="text-xs font-semibold opacity-75">
                              Friemi Coupon
                            </p>
                            <p className="mt-1 text-lg font-bold">
                              {couponForm.title || "优惠券预览"}
                            </p>
                            <span
                              className="mt-3 block h-1 w-12 rounded-full"
                              style={{
                                backgroundColor: couponForm.accentColor,
                              }}
                            />
                          </div>
                          <Button
                            className="h-10 w-fit min-w-32"
                            disabled={
                              isCouponSaving ||
                              !couponForm.title.trim() ||
                              !couponForm.description.trim()
                            }
                            type="submit"
                          >
                            {isCouponSaving ? (
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                              <TicketPlus className="mr-2 h-4 w-4" />
                            )}
                            保存优惠券
                          </Button>
                        </form>
                      ) : null}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <aside className="order-3 hidden lg:sticky lg:top-24 lg:order-2 lg:block lg:w-72 lg:shrink-0">
          <div className="rounded-lg border border-black/10 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-semibold text-ink">商家维护</p>
              <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-600">
                {merchants.length} 个
              </span>
            </div>
            <p className="mt-3 text-sm leading-6 text-zinc-600">
              商家资料只维护一次，后续在活动运营页选择关联，避免每次重复填写地点和联系方式。
            </p>
            <div className="mt-5 space-y-3 border-t border-black/5 pt-5">
              <OperationStep number="1" text="新增合作商家的基础资料" />
              <OperationStep number="2" text="在活动运营页关联到活动" />
              <OperationStep number="3" text="前台商家主页自动展示相关活动" />
            </div>
            <button
              type="button"
              onClick={() => setIsCreateOpen(true)}
              className="mt-5 inline-flex h-12 w-full items-center justify-center gap-2 whitespace-nowrap rounded-md bg-zinc-950 px-5 text-sm font-semibold text-white shadow-lg shadow-black/10 transition hover:bg-zinc-800"
            >
              <Plus className="h-4 w-4" aria-hidden />
              新增合作商家
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
}

function OperationStep({ number, text }: { number: string; text: string }) {
  return (
    <div className="flex gap-3 text-sm text-zinc-600">
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-xs font-semibold text-zinc-700">
        {number}
      </span>
      <span className="leading-6">{text}</span>
    </div>
  );
}

function InfoLine({ icon: Icon, text }: { icon: LucideIcon; text: string }) {
  return (
    <div className="flex min-w-0 items-center gap-2">
      <Icon className="h-4 w-4 shrink-0 text-zinc-400" aria-hidden />
      <span className="truncate">{text}</span>
    </div>
  );
}

function FormSectionTitle({ title }: { title: string }) {
  return (
    <p className="text-xs font-semibold uppercase tracking-normal text-zinc-500">
      {title}
    </p>
  );
}

function ColorField({
  label,
  onChange,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  value: string;
}) {
  return (
    <label className="grid min-w-0 gap-1.5 text-xs font-semibold text-zinc-600">
      {label}
      <span className="flex h-10 min-w-0 items-center gap-2 rounded-md border border-zinc-200 bg-white px-2">
        <input
          aria-label={label}
          className="h-6 w-7 shrink-0 cursor-pointer border-0 bg-transparent p-0"
          onChange={(event) => onChange(event.target.value.toUpperCase())}
          type="color"
          value={value}
        />
        <span className="min-w-0 truncate font-mono text-[10px] text-zinc-500">
          {value}
        </span>
      </span>
    </label>
  );
}

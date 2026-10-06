"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Building2,
  ExternalLink,
  Globe2,
  Loader2,
  Mail,
  MapPin,
  Plus,
  Search,
  Store,
  TicketCheck,
  TicketPlus,
  UserRoundCheck,
  type LucideIcon,
} from "lucide-react";
import { toast, Toaster } from "sonner";
import { Button, Input, Textarea } from "@chill-club/ui";
import { FormField } from "@/components/admin/FormField";
import type {
  AdminMerchantCandidate,
  AdminMerchantListItem,
} from "@/lib/admin-scraper";
import type { AdminCouponTemplate } from "@/features/coupons/adminCoupons";
import { platformCouponTemplates } from "@/features/coupons/platformCouponTemplates";
import { withLocale } from "@/lib/routes";

type MerchantListProps = {
  initialMerchants: AdminMerchantListItem[];
  locale: string;
};

export function MerchantManagementClient({
  initialMerchants,
  locale,
}: MerchantListProps) {
  const [query, setQuery] = useState("");
  const merchants = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase();
    if (!normalized) return initialMerchants;

    return initialMerchants.filter((merchant) =>
      [
        merchant.name,
        merchant.slug,
        merchant.city,
        merchant.address,
        merchant.owner?.nickname,
        merchant.owner?.friendCode,
      ].some((value) => value?.toLocaleLowerCase().includes(normalized)),
    );
  }, [initialMerchants, query]);

  return (
    <section aria-labelledby="merchant-list-title" className="space-y-4">
      <div className="flex flex-col gap-4 rounded-2xl border border-[#DFE8DA] bg-white p-4 shadow-[0_12px_30px_-26px_rgba(29,65,44,0.5)] sm:flex-row sm:items-center sm:justify-between sm:p-5">
        <div>
          <h2 className="text-lg font-bold text-[#1D3024]" id="merchant-list-title">
            店铺列表
          </h2>
          <p className="mt-1 text-sm text-[#617063]">
            找到店铺后，可进入详情管理优惠券。
          </p>
        </div>
        <label className="relative block w-full sm:w-80">
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#63816D]"
          />
          <Input
            aria-label="搜索店铺"
            className="h-12 rounded-xl border-[#D7E2D5] bg-[#FAFCF9] pl-11 focus-visible:ring-[#176B49]"
            onChange={(event) => setQuery(event.target.value)}
            placeholder="搜索店名、城市或店家账号"
            value={query}
          />
        </label>
      </div>

      {merchants.length > 0 ? (
        <div className="grid gap-3">
          {merchants.map((merchant) => (
            <article
              className="grid gap-4 rounded-2xl border border-[#DFE8DA] bg-white p-4 shadow-[0_12px_30px_-26px_rgba(29,65,44,0.45)] transition hover:border-[#BFD7C5] hover:shadow-[0_16px_32px_-26px_rgba(29,65,44,0.5)] sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:p-5"
              key={merchant.id}
            >
              <div className="flex min-w-0 gap-3">
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-[#E7F2E9] text-[#176B49]">
                  <Building2 aria-hidden="true" className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                  <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                    <h3 className="max-w-full truncate text-base font-bold text-[#1D3024]">
                      {merchant.name}
                    </h3>
                    {merchant.owner ? (
                      <span className="rounded-full bg-[#E7F2E9] px-2.5 py-1 text-[11px] font-semibold text-[#176B49]">
                        已绑定店家
                      </span>
                    ) : (
                      <span className="rounded-full bg-[#F3F4F1] px-2.5 py-1 text-[11px] font-semibold text-[#617063]">
                        未绑定账号
                      </span>
                    )}
                  </div>
                  <p className="mt-1 line-clamp-2 text-sm leading-6 text-[#58675B]">
                    {merchant.description}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs font-medium text-[#718074]">
                    <span>{merchant.address || merchant.city}</span>
                    <span>{merchant.activityCount} 个关联活动</span>
                    {merchant.owner ? (
                      <span>
                        {merchant.owner.nickname}
                        {merchant.owner.friendCode
                          ? ` · ${merchant.owner.friendCode}`
                          : ""}
                      </span>
                    ) : null}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 pl-[3.75rem] sm:pl-0">
                <Link
                  aria-label={`查看 ${merchant.name} 的公开主页`}
                  className="grid h-11 w-11 place-items-center rounded-xl border border-[#D7E2D5] text-[#58675B] transition hover:bg-[#F3F8F2] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#176B49]"
                  href={withLocale(locale, `/merchants/${merchant.slug}`)}
                  title="查看公开主页"
                >
                  <ExternalLink aria-hidden="true" className="h-4 w-4" />
                </Link>
                <Link
                  className="inline-flex h-11 items-center gap-2 rounded-xl bg-[#176B49] px-4 text-sm font-semibold text-white transition hover:bg-[#105838] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#176B49]"
                  href={withLocale(locale, `/admin/merchants/${merchant.id}`)}
                >
                  管理店铺
                  <ArrowRight aria-hidden="true" className="h-4 w-4" />
                </Link>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-[#C9DBCB] bg-white px-5 py-14 text-center">
          <Building2
            aria-hidden="true"
            className="mx-auto h-8 w-8 text-[#84A58C]"
          />
          <p className="mt-3 text-sm font-semibold text-ink">
            {initialMerchants.length === 0 ? "还没有店铺" : "没有匹配的店铺"}
          </p>
          <p className="mt-1 text-sm text-zinc-500">
            {initialMerchants.length === 0
              ? "可以添加合作店铺，或将 Friemi 账号升级为店家。"
              : "请更换店名、城市或店家账号关键词。"}
          </p>
        </div>
      )}
    </section>
  );
}

type MerchantUpgradeClientProps = {
  candidates: AdminMerchantCandidate[];
  locale: string;
  query: string;
};

export function MerchantUpgradeClient({
  candidates,
  locale,
  query,
}: MerchantUpgradeClientProps) {
  const router = useRouter();
  const [assigningProfileId, setAssigningProfileId] = useState<string | null>(
    null,
  );

  async function assignMerchantAccount(profileId: string) {
    if (assigningProfileId) return;
    setAssigningProfileId(profileId);

    try {
      const response = await fetch("/api/admin/merchants/assign-owner", {
        body: JSON.stringify({ profileId }),
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
      toast.success("账号已升级为店家");
      router.push(withLocale(locale, `/admin/merchants/${json.merchant.id}`));
      router.refresh();
    } catch {
      toast.error("升级店家失败，请稍后重试");
    } finally {
      setAssigningProfileId(null);
    }
  }

  if (!query) {
    return (
      <div className="rounded-2xl border border-dashed border-[#C9DBCB] bg-white px-5 py-14 text-center">
        <Search aria-hidden="true" className="mx-auto h-8 w-8 text-[#84A58C]" />
        <p className="mt-3 text-sm font-semibold text-ink">
          先查找 Friemi 用户
        </p>
        <p className="mx-auto mt-1 max-w-md text-sm leading-6 text-zinc-500">
          可以搜索昵称或邮箱，也可以直接输入用户的 6 位 Friemi 个人号。
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <Toaster closeButton position="top-center" richColors />
      <p className="text-sm font-semibold text-zinc-600">
        找到 {candidates.length} 个可升级账号
      </p>
      {candidates.length > 0 ? (
        <div className="grid gap-3">
          {candidates.map((candidate) => (
            <div
              className="flex flex-col gap-3 rounded-2xl border border-[#DFE8DA] bg-white p-4 shadow-[0_12px_30px_-26px_rgba(29,65,44,0.45)] sm:flex-row sm:items-center sm:justify-between sm:p-5"
              key={candidate.id}
            >
              <div className="flex min-w-0 items-center gap-3">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[#E7F2E9] text-sm font-bold text-[#176B49]">
                  {candidate.nickname.slice(0, 1).toUpperCase()}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-ink">
                    {candidate.nickname}
                  </p>
                  <p className="mt-1 truncate text-xs text-zinc-500">
                    Friemi 个人号：{candidate.friendCode ?? "未生成"}
                    {candidate.email ? ` · ${candidate.email}` : ""}
                  </p>
                </div>
              </div>
              <Button
                className="h-11 shrink-0 rounded-xl bg-[#176B49] hover:bg-[#105838]"
                disabled={Boolean(assigningProfileId)}
                onClick={() => void assignMerchantAccount(candidate.id)}
                type="button"
              >
                {assigningProfileId === candidate.id ? (
                  <Loader2
                    aria-hidden="true"
                    className="mr-2 h-4 w-4 animate-spin"
                  />
                ) : (
                  <Store aria-hidden="true" className="mr-2 h-4 w-4" />
                )}
                升级并开通店铺
              </Button>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-[#C9DBCB] bg-white px-5 py-12 text-center">
          <p className="text-sm font-semibold text-ink">没有找到可升级账号</p>
          <p className="mt-1 text-sm text-zinc-500">
            请检查昵称、邮箱或 6 位 Friemi 个人号；已有店铺的账号不会重复显示。
          </p>
        </div>
      )}
    </div>
  );
}

type MerchantFormState = {
  address: string;
  city: string;
  contactEmail: string;
  description: string;
  latitude: string;
  longitude: string;
  name: string;
  slug: string;
  websiteUrl: string;
};

const emptyMerchantForm = (): MerchantFormState => ({
  address: "",
  city: "Paris",
  contactEmail: "",
  description: "",
  latitude: "",
  longitude: "",
  name: "",
  slug: "",
  websiteUrl: "",
});

export function MerchantCreateClient({ locale }: { locale: string }) {
  const router = useRouter();
  const [form, setForm] = useState<MerchantFormState>(emptyMerchantForm);
  const [isSaving, setIsSaving] = useState(false);
  const canSave =
    form.name.trim().length > 0 &&
    form.description.trim().length > 0 &&
    !isSaving;

  async function submitMerchant(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSave) return;
    setIsSaving(true);

    try {
      const response = await fetch("/api/admin/merchants", {
        body: JSON.stringify({
          ...form,
          address: form.address || null,
          contactEmail: form.contactEmail || null,
          latitude: form.latitude || null,
          longitude: form.longitude || null,
          slug: form.slug || null,
          websiteUrl: form.websiteUrl || null,
        }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });

      if (response.status === 409) {
        toast.error("商家 URL 标识已存在，请更换一个标识");
        return;
      }
      if (!response.ok) {
        toast.error("店铺创建失败，请检查必填信息");
        return;
      }

      const json = (await response.json()) as {
        merchant: AdminMerchantListItem;
      };
      toast.success("合作店铺已创建");
      router.push(withLocale(locale, `/admin/merchants/${json.merchant.id}`));
      router.refresh();
    } catch {
      toast.error("店铺创建失败，请稍后重试");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <form className="space-y-7" onSubmit={submitMerchant}>
      <Toaster closeButton position="top-center" richColors />
      <FormSection description="用于店铺列表和公开主页展示。" title="基本信息">
        <div className="grid gap-4 md:grid-cols-2">
          <FormField label="店铺名称 *">
            <Input
              className="h-11"
              onChange={(event) =>
                setForm({ ...form, name: event.target.value })
              }
              value={form.name}
            />
          </FormField>
          <FormField hint="留空时会根据店铺名称自动生成。" label="URL 标识">
            <Input
              className="h-11"
              onChange={(event) =>
                setForm({ ...form, slug: event.target.value })
              }
              placeholder="paris-community-cafe"
              value={form.slug}
            />
          </FormField>
        </div>
        <FormField label="店铺简介 *">
          <Textarea
            className="min-h-28"
            onChange={(event) =>
              setForm({ ...form, description: event.target.value })
            }
            placeholder="说明店铺类型、特色或适合关联的活动。"
            value={form.description}
          />
        </FormField>
      </FormSection>

      <FormSection
        description="地址将显示在店铺资料和活动关联中。"
        title="地址信息"
      >
        <div className="grid gap-4 md:grid-cols-2">
          <FormField label="城市">
            <Input
              className="h-11"
              onChange={(event) =>
                setForm({ ...form, city: event.target.value })
              }
              value={form.city}
            />
          </FormField>
          <FormField label="详细地址">
            <Input
              className="h-11"
              onChange={(event) =>
                setForm({ ...form, address: event.target.value })
              }
              value={form.address}
            />
          </FormField>
          <FormField label="纬度">
            <Input
              className="h-11"
              inputMode="decimal"
              onChange={(event) =>
                setForm({ ...form, latitude: event.target.value })
              }
              placeholder="48.8566"
              value={form.latitude}
            />
          </FormField>
          <FormField label="经度">
            <Input
              className="h-11"
              inputMode="decimal"
              onChange={(event) =>
                setForm({ ...form, longitude: event.target.value })
              }
              placeholder="2.3522"
              value={form.longitude}
            />
          </FormField>
        </div>
      </FormSection>

      <FormSection
        description="方便用户或运营人员进一步联系。"
        title="联系信息"
      >
        <div className="grid gap-4 md:grid-cols-2">
          <FormField label="官网">
            <Input
              className="h-11"
              onChange={(event) =>
                setForm({ ...form, websiteUrl: event.target.value })
              }
              placeholder="https://"
              value={form.websiteUrl}
            />
          </FormField>
          <FormField label="联系邮箱">
            <Input
              className="h-11"
              onChange={(event) =>
                setForm({ ...form, contactEmail: event.target.value })
              }
              type="email"
              value={form.contactEmail}
            />
          </FormField>
        </div>
      </FormSection>

      <div className="flex flex-wrap gap-3 rounded-2xl border border-[#DFE8DA] bg-white p-4 sm:p-5">
        <Button className="h-11 min-w-36 rounded-xl bg-[#176B49] hover:bg-[#105838]" disabled={!canSave} type="submit">
          {isSaving ? (
            <Loader2 aria-hidden="true" className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Plus aria-hidden="true" className="mr-2 h-4 w-4" />
          )}
          创建店铺
        </Button>
        <Button
          className="h-11 rounded-xl"
          disabled={isSaving}
          onClick={() => setForm(emptyMerchantForm())}
          type="button"
          variant="secondary"
        >
          清空
        </Button>
      </div>
    </form>
  );
}

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

export function MerchantCouponManagementClient({
  initialCoupons,
  merchant,
}: {
  initialCoupons: AdminCouponTemplate[];
  merchant: AdminMerchantListItem;
}) {
  const [coupons, setCoupons] = useState(initialCoupons);
  const [selectedTemplateKey, setSelectedTemplateKey] = useState<string>(
    platformCouponTemplates[0]?.key ?? "",
  );
  const [bindingTemplate, setBindingTemplate] = useState(false);
  const [isCustomOpen, setIsCustomOpen] = useState(false);
  const [form, setForm] = useState<CouponFormState>(emptyCouponForm);
  const [isSaving, setIsSaving] = useState(false);
  const selectedTemplate = platformCouponTemplates.find(
    (template) => template.key === selectedTemplateKey,
  );

  async function bindPlatformCoupon() {
    if (!selectedTemplateKey || bindingTemplate) return;
    setBindingTemplate(true);
    try {
      const response = await fetch(
        `/api/admin/merchants/${merchant.id}/coupons`,
        {
          body: JSON.stringify({ platformTemplateKey: selectedTemplateKey }),
          headers: { "Content-Type": "application/json" },
          method: "POST",
        },
      );
      if (!response.ok) {
        toast.error("优惠券样式分配失败，请稍后重试");
        return;
      }
      const json = (await response.json()) as { coupon: AdminCouponTemplate };
      setCoupons((current) => [
        ...current.filter((item) => item.id !== json.coupon.id),
        json.coupon,
      ]);
      toast.success("优惠券样式已分配给此店铺");
    } catch {
      toast.error("优惠券样式分配失败，请稍后重试");
    } finally {
      setBindingTemplate(false);
    }
  }

  async function createCustomCoupon(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form.title.trim() || !form.description.trim() || isSaving) return;
    setIsSaving(true);
    try {
      const response = await fetch(
        `/api/admin/merchants/${merchant.id}/coupons`,
        {
          body: JSON.stringify({
            ...form,
            expiresAt: form.expiresAt
              ? new Date(form.expiresAt).toISOString()
              : null,
            terms: form.terms || null,
          }),
          headers: { "Content-Type": "application/json" },
          method: "POST",
        },
      );
      if (!response.ok) {
        toast.error("自定义优惠券创建失败，请检查内容");
        return;
      }
      const json = (await response.json()) as { coupon: AdminCouponTemplate };
      setCoupons((current) => [...current, json.coupon]);
      setForm(emptyCouponForm());
      setIsCustomOpen(false);
      toast.success("自定义优惠券已添加");
    } catch {
      toast.error("自定义优惠券创建失败，请稍后重试");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <Toaster closeButton position="top-center" richColors />

      <section className="space-y-5 rounded-2xl border border-[#DFE8DA] bg-white p-5 shadow-[0_12px_30px_-26px_rgba(29,65,44,0.45)] sm:p-6" aria-labelledby="assigned-coupons-title">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2
              className="text-lg font-bold text-[#1D3024]"
              id="assigned-coupons-title"
            >
              已分配样式
            </h2>
            <p className="mt-1 text-sm text-[#617063]">
              店家发布优惠券时可以从这些样式中选择。
            </p>
          </div>
          <span className="shrink-0 rounded-full bg-[#E7F2E9] px-3 py-1 text-xs font-bold text-[#176B49]">
            {coupons.length} 种
          </span>
        </div>
        {coupons.length > 0 ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {coupons.map((coupon) => (
              <div
                className="flex min-w-0 items-center gap-3 rounded-xl border border-[#E5EBE1] bg-[#FAFCF9] p-3"
                key={coupon.id}
              >
                {coupon.imageUrl ? (
                  <Image
                    alt=""
                    className="h-14 w-20 shrink-0 rounded-lg object-cover"
                    height={56}
                    src={coupon.imageUrl}
                    width={80}
                  />
                ) : (
                  <span
                    className="grid h-14 w-20 shrink-0 place-items-center rounded-lg text-xs font-bold"
                    style={{
                      backgroundColor: coupon.backgroundColor,
                      color: coupon.foregroundColor,
                    }}
                  >
                    Coupon
                  </span>
                )}
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-[#1D3024]">
                    {coupon.title}
                  </p>
                  <p className="mt-1 line-clamp-2 text-xs leading-5 text-zinc-500">
                    {coupon.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="rounded-xl border border-dashed border-[#D7E2D5] bg-[#FAFCF9] px-4 py-7 text-center text-sm text-[#617063]">暂未分配优惠券样式，可从下方选择平台样式。</p>
        )}
      </section>

      <section aria-labelledby="platform-template-title" className="space-y-5 rounded-2xl border border-[#DFE8DA] bg-white p-5 shadow-[0_12px_30px_-26px_rgba(29,65,44,0.45)] sm:p-6">
        <div>
          <h2
            className="text-lg font-bold text-[#1D3024]"
            id="platform-template-title"
          >
            分配平台样式
          </h2>
          <p className="mt-1 text-sm text-[#617063]">
            选择 Friemi 已设计的优惠券样式并绑定到此店铺。
          </p>
        </div>
        {selectedTemplate ? (
          <div className="grid gap-5 rounded-xl border border-[#E5EBE1] bg-[#FAFCF9] p-4 md:grid-cols-[15rem_minmax(0,1fr)] md:items-start">
            <Image
              alt={selectedTemplate.title}
              className="aspect-[4/3] w-full rounded-xl object-cover ring-1 ring-[#D7E2D5]"
              height={1086}
              sizes="(min-width: 768px) 240px, 100vw"
              src={selectedTemplate.imageUrl}
              width={1448}
            />
            <div className="space-y-3">
              <FormField label="平台优惠券样式">
                <select
                  className="h-11 w-full rounded-xl border border-[#D7E2D5] bg-white px-3 text-sm font-semibold text-[#1D3024] outline-none focus:border-[#176B49] focus:ring-2 focus:ring-[#176B49]/15"
                  onChange={(event) =>
                    setSelectedTemplateKey(event.target.value)
                  }
                  value={selectedTemplateKey}
                >
                  {platformCouponTemplates.map((template) => (
                    <option key={template.key} value={template.key}>
                      {template.title}
                    </option>
                  ))}
                </select>
              </FormField>
              <p className="text-sm leading-6 text-zinc-600">
                {selectedTemplate.description}
              </p>
              <Button
                className="h-11 rounded-xl bg-[#176B49] hover:bg-[#105838]"
                disabled={bindingTemplate}
                onClick={() => void bindPlatformCoupon()}
                type="button"
              >
                {bindingTemplate ? (
                  <Loader2
                    aria-hidden="true"
                    className="mr-2 h-4 w-4 animate-spin"
                  />
                ) : (
                  <TicketCheck aria-hidden="true" className="mr-2 h-4 w-4" />
                )}
                分配给此店铺
              </Button>
            </div>
          </div>
        ) : null}
      </section>

      <section aria-labelledby="custom-coupon-title" className="space-y-5 rounded-2xl border border-[#DFE8DA] bg-white p-5 shadow-[0_12px_30px_-26px_rgba(29,65,44,0.45)] sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-[#1D3024]" id="custom-coupon-title">
              自定义样式
            </h2>
            <p className="mt-1 text-sm text-[#617063]">
              平台样式不适用时，再为该店铺建立专属样式。
            </p>
          </div>
          <Button
            className="h-11 rounded-xl"
            onClick={() => setIsCustomOpen((current) => !current)}
            type="button"
            variant="secondary"
          >
            <TicketPlus aria-hidden="true" className="mr-2 h-4 w-4" />
            {isCustomOpen ? "收起" : "添加自定义样式"}
          </Button>
        </div>

        {isCustomOpen ? (
          <form className="space-y-4 border-t border-[#E5EBE1] pt-5" onSubmit={createCustomCoupon}>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="优惠券名称 *">
                <Input
                  className="h-11"
                  maxLength={120}
                  onChange={(event) =>
                    setForm({ ...form, title: event.target.value })
                  }
                  value={form.title}
                />
              </FormField>
              <FormField label="有效期">
                <Input
                  className="h-11"
                  onChange={(event) =>
                    setForm({ ...form, expiresAt: event.target.value })
                  }
                  type="date"
                  value={form.expiresAt}
                />
              </FormField>
            </div>
            <FormField label="优惠内容 *">
              <Textarea
                className="min-h-24"
                maxLength={1200}
                onChange={(event) =>
                  setForm({ ...form, description: event.target.value })
                }
                value={form.description}
              />
            </FormField>
            <FormField label="使用规则">
              <Textarea
                className="min-h-20"
                maxLength={1200}
                onChange={(event) =>
                  setForm({ ...form, terms: event.target.value })
                }
                value={form.terms}
              />
            </FormField>
            <div className="grid grid-cols-3 gap-2 sm:gap-3">
              <ColorField
                label="底色"
                onChange={(backgroundColor) =>
                  setForm({ ...form, backgroundColor })
                }
                value={form.backgroundColor}
              />
              <ColorField
                label="文字"
                onChange={(foregroundColor) =>
                  setForm({ ...form, foregroundColor })
                }
                value={form.foregroundColor}
              />
              <ColorField
                label="强调"
                onChange={(accentColor) => setForm({ ...form, accentColor })}
                value={form.accentColor}
              />
            </div>
            <div
              className="rounded-xl px-4 py-4"
              style={{
                backgroundColor: form.backgroundColor,
                color: form.foregroundColor,
              }}
            >
              <p className="text-xs font-semibold opacity-75">Friemi Coupon</p>
              <p className="mt-1 text-lg font-bold">
                {form.title || "优惠券预览"}
              </p>
              <span
                className="mt-3 block h-1 w-12 rounded-full"
                style={{ backgroundColor: form.accentColor }}
              />
            </div>
            <Button
              className="h-11 min-w-36 rounded-xl bg-[#176B49] hover:bg-[#105838]"
              disabled={
                isSaving || !form.title.trim() || !form.description.trim()
              }
              type="submit"
            >
              {isSaving ? (
                <Loader2
                  aria-hidden="true"
                  className="mr-2 h-4 w-4 animate-spin"
                />
              ) : (
                <TicketPlus aria-hidden="true" className="mr-2 h-4 w-4" />
              )}
              保存优惠券
            </Button>
          </form>
        ) : null}
      </section>
    </div>
  );
}

function FormSection({
  children,
  description,
  title,
}: {
  children: React.ReactNode;
  description: string;
  title: string;
}) {
  return (
    <section className="space-y-5 rounded-2xl border border-[#DFE8DA] bg-white p-5 shadow-[0_12px_30px_-26px_rgba(29,65,44,0.45)] sm:p-6">
      <div>
        <h2 className="text-lg font-bold text-[#1D3024]">{title}</h2>
        <p className="mt-1 text-sm text-[#617063]">{description}</p>
      </div>
      {children}
    </section>
  );
}

export function MerchantSummary({
  merchant,
}: {
  merchant: AdminMerchantListItem;
}) {
  return (
    <div className="grid gap-3 rounded-2xl border border-[#DFE8DA] bg-white p-5 text-sm text-[#58675B] shadow-[0_12px_30px_-26px_rgba(29,65,44,0.45)] sm:grid-cols-2 lg:grid-cols-4">
      <InfoLine icon={MapPin} text={merchant.address || merchant.city} />
      <InfoLine
        icon={UserRoundCheck}
        text={
          merchant.owner
            ? `${merchant.owner.nickname}${merchant.owner.friendCode ? ` · ${merchant.owner.friendCode}` : ""}`
            : "未绑定店家账号"
        }
      />
      <InfoLine
        icon={Building2}
        text={`${merchant.activityCount} 个关联活动`}
      />
      {merchant.websiteUrl ? (
        <InfoLine icon={Globe2} text={merchant.websiteUrl} />
      ) : merchant.contactEmail ? (
        <InfoLine icon={Mail} text={merchant.contactEmail} />
      ) : (
        <InfoLine icon={Mail} text="未填写联系方式" />
      )}
    </div>
  );
}

function InfoLine({ icon: Icon, text }: { icon: LucideIcon; text: string }) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#E7F2E9] text-[#176B49]">
        <Icon aria-hidden="true" className="h-4 w-4" />
      </span>
      <span className="min-w-0 truncate" title={text}>{text}</span>
    </div>
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
      <span className="flex h-11 min-w-0 items-center gap-2 rounded-md border border-zinc-200 bg-white px-2">
        <input
          aria-label={label}
          className="h-7 w-8 shrink-0 cursor-pointer border-0 bg-transparent p-0"
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

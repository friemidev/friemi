"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Building2,
  ChevronRight,
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
    <section aria-label="店铺列表" className="space-y-3">
      <div className="flex items-center gap-3">
        <label className="relative block min-w-0 flex-1">
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-outline"
          />
          <Input
            aria-label="搜索店铺"
            className="h-12 rounded-xl border-0 bg-fog pl-11 text-base text-ink focus-visible:ring-forest"
            onChange={(event) => setQuery(event.target.value)}
            placeholder="搜索店名、城市或店家账号"
            value={query}
          />
        </label>
      </div>

      {merchants.length > 0 ? (
        <div className="divide-y divide-sand/40">
          {merchants.map((merchant) => (
            <article
              className="flex min-w-0 items-center gap-1 py-1"
              key={merchant.id}
            >
              <Link
                aria-label={`管理店铺 ${merchant.name}`}
                className="group flex min-h-20 min-w-0 flex-1 items-center gap-3 rounded-xl px-2 py-3 transition hover:bg-fog focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest sm:px-3"
                href={withLocale(locale, `/admin/merchants/${merchant.id}`)}
              >
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-fog text-forest">
                  <Building2 aria-hidden="true" className="h-5 w-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-base font-bold text-ink">
                    {merchant.name}
                  </span>
                  <span className="mt-1 block truncate text-xs text-ink/70">
                    {merchant.city || merchant.address || "未填写地址"}
                    {" · "}
                    {merchant.owner
                      ? `店家 ${merchant.owner.nickname}`
                      : "待绑定店家"}
                    {" · "}
                    {merchant.activityCount} 个活动
                  </span>
                </span>
                <ChevronRight
                  aria-hidden="true"
                  className="h-5 w-5 shrink-0 text-outline transition group-hover:translate-x-0.5 group-hover:text-forest"
                />
              </Link>
              <Link
                aria-label={`查看 ${merchant.name} 的公开主页`}
                className="grid h-11 w-11 shrink-0 place-items-center rounded-xl text-outline transition hover:bg-fog hover:text-forest focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest"
                href={withLocale(locale, `/merchants/${merchant.slug}`)}
                title="查看公开主页"
              >
                <ExternalLink aria-hidden="true" className="h-4 w-4" />
              </Link>
            </article>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl bg-fog px-5 py-14 text-center">
          <Building2
            aria-hidden="true"
            className="mx-auto h-8 w-8 text-forest"
          />
          <p className="mt-3 text-sm font-semibold text-ink">
            {initialMerchants.length === 0 ? "还没有店铺" : "没有匹配的店铺"}
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
    return null;
  }

  return (
    <div className="space-y-3">
      <Toaster closeButton position="top-center" richColors />
      <p className="text-sm font-semibold text-ink/70">
        搜索结果 · {candidates.length}
      </p>
      {candidates.length > 0 ? (
        <div className="divide-y divide-sand/40">
          {candidates.map((candidate) => (
            <div
              className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between"
              key={candidate.id}
            >
              <div className="flex min-w-0 items-center gap-3">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-fog text-sm font-bold text-forest">
                  {candidate.nickname.slice(0, 1).toUpperCase()}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-ink">
                    {candidate.nickname}
                  </p>
                  <p className="mt-1 truncate text-xs text-ink/70">
                    Friemi 个人号：{candidate.friendCode ?? "未生成"}
                    {candidate.email ? ` · ${candidate.email}` : ""}
                  </p>
                </div>
              </div>
              <Button
                className="h-11 shrink-0 rounded-xl bg-forest hover:bg-forest/90"
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
        <div className="rounded-2xl bg-fog px-5 py-12 text-center">
          <p className="text-sm font-semibold text-ink">没有找到可升级账号</p>
          <p className="mt-1 text-sm text-ink/70">
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
      <FormSection title="店铺资料">
        <FormField label="店铺名称 *">
          <Input
            aria-label="店铺名称"
            className="h-12 rounded-xl text-base"
            onChange={(event) => setForm({ ...form, name: event.target.value })}
            value={form.name}
          />
        </FormField>
        <FormField label="店铺简介 *">
          <Textarea
            aria-label="店铺简介"
            className="min-h-28 rounded-xl text-base"
            onChange={(event) =>
              setForm({ ...form, description: event.target.value })
            }
            placeholder="介绍店铺的类型和特色"
            value={form.description}
          />
        </FormField>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="城市">
            <Input
              aria-label="城市"
              className="h-12 rounded-xl text-base"
              onChange={(event) =>
                setForm({ ...form, city: event.target.value })
              }
              value={form.city}
            />
          </FormField>
          <FormField label="详细地址">
            <Input
              aria-label="详细地址"
              className="h-12 rounded-xl text-base"
              onChange={(event) =>
                setForm({ ...form, address: event.target.value })
              }
              value={form.address}
            />
          </FormField>
        </div>
      </FormSection>

      <details className="group rounded-2xl bg-fog p-4 sm:p-5">
        <summary className="flex min-h-8 cursor-pointer list-none items-center justify-between text-sm font-semibold text-ink [&::-webkit-details-marker]:hidden">
          更多资料{" "}
          <ChevronRight
            aria-hidden="true"
            className="h-4 w-4 transition group-open:rotate-90"
          />
        </summary>
        <div className="grid gap-4 pt-4 sm:grid-cols-2">
          <FormField hint="留空则根据店名自动生成" label="URL 标识">
            <Input
              aria-label="URL 标识"
              className="h-12 rounded-xl text-base"
              onChange={(event) =>
                setForm({ ...form, slug: event.target.value })
              }
              placeholder="paris-community-cafe"
              value={form.slug}
            />
          </FormField>
          <FormField label="联系邮箱">
            <Input
              aria-label="联系邮箱"
              className="h-12 rounded-xl text-base"
              onChange={(event) =>
                setForm({ ...form, contactEmail: event.target.value })
              }
              type="email"
              value={form.contactEmail}
            />
          </FormField>
          <FormField label="官网">
            <Input
              aria-label="官网"
              className="h-12 rounded-xl text-base"
              onChange={(event) =>
                setForm({ ...form, websiteUrl: event.target.value })
              }
              placeholder="https://"
              value={form.websiteUrl}
            />
          </FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="纬度">
              <Input
                aria-label="纬度"
                className="h-12 rounded-xl text-base"
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
                aria-label="经度"
                className="h-12 rounded-xl text-base"
                inputMode="decimal"
                onChange={(event) =>
                  setForm({ ...form, longitude: event.target.value })
                }
                placeholder="2.3522"
                value={form.longitude}
              />
            </FormField>
          </div>
        </div>
      </details>

      <div className="flex flex-wrap gap-3">
        <Button
          className="h-12 min-w-36 rounded-xl bg-forest hover:bg-forest/90"
          disabled={!canSave}
          type="submit"
        >
          {isSaving ? (
            <Loader2 aria-hidden="true" className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Plus aria-hidden="true" className="mr-2 h-4 w-4" />
          )}
          创建店铺
        </Button>
        <Button
          className="h-12 rounded-xl"
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
  const selectedTemplateAssigned = coupons.some(
    (coupon) => coupon.platformTemplateKey === selectedTemplateKey,
  );

  async function bindPlatformCoupon() {
    if (!selectedTemplateKey || bindingTemplate || selectedTemplateAssigned)
      return;
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
    <div className="space-y-8">
      <Toaster closeButton position="top-center" richColors />
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-xl font-bold text-ink">优惠券样式</h2>
        <span className="text-xs font-semibold tabular-nums text-ink/70">
          已分配 {coupons.length}
        </span>
      </div>

      <section className="space-y-3" aria-labelledby="assigned-coupons-title">
        <h3 className="text-sm font-bold text-ink" id="assigned-coupons-title">
          当前样式
        </h3>
        {coupons.length > 0 ? (
          <div className="grid gap-2 sm:grid-cols-2">
            {coupons.map((coupon) => (
              <div
                className="flex min-w-0 items-center gap-3 rounded-xl bg-fog p-3"
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
                  <p className="truncate text-sm font-bold text-ink">
                    {coupon.title}
                  </p>
                  <p className="mt-1 line-clamp-2 text-xs leading-5 text-ink/70">
                    {coupon.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="rounded-xl bg-fog px-4 py-6 text-center text-sm text-ink/70">
            还没有分配优惠券样式
          </p>
        )}
      </section>

      <section aria-labelledby="platform-template-title" className="space-y-3">
        <h3 className="text-sm font-bold text-ink" id="platform-template-title">
          添加平台样式
        </h3>
        {selectedTemplate ? (
          <div className="grid gap-4 rounded-2xl bg-fog p-4 sm:grid-cols-[10rem_minmax(0,1fr)] sm:items-start sm:p-5">
            <Image
              alt={selectedTemplate.title}
              className="aspect-[4/3] w-full rounded-xl object-cover"
              height={1086}
              sizes="(min-width: 640px) 160px, 100vw"
              src={selectedTemplate.imageUrl}
              width={1448}
            />
            <div className="space-y-3">
              {platformCouponTemplates.length > 1 ? (
                <FormField label="选择样式">
                  <select
                    aria-label="选择样式"
                    className="h-12 w-full rounded-xl border border-sand/60 bg-paper px-3 text-base font-semibold text-ink outline-none focus:border-forest focus:ring-2 focus:ring-forest/20"
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
              ) : (
                <p className="text-sm font-bold text-ink">
                  {selectedTemplate.title}
                </p>
              )}
              <p className="text-sm leading-6 text-ink/70">
                {selectedTemplate.description}
              </p>
              <Button
                className="h-12 rounded-xl bg-forest hover:bg-forest/90"
                disabled={bindingTemplate || selectedTemplateAssigned}
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
                {selectedTemplateAssigned ? "已分配" : "分配给店铺"}
              </Button>
            </div>
          </div>
        ) : null}
      </section>

      <section aria-labelledby="custom-coupon-title" className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <h3 className="text-sm font-bold text-ink" id="custom-coupon-title">
            自定义样式
          </h3>
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
          <form
            className="space-y-4 rounded-2xl bg-fog p-4 sm:p-5"
            onSubmit={createCustomCoupon}
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="优惠券名称 *">
                <Input
                  aria-label="优惠券名称"
                  className="h-12 text-base"
                  maxLength={120}
                  onChange={(event) =>
                    setForm({ ...form, title: event.target.value })
                  }
                  value={form.title}
                />
              </FormField>
              <FormField label="有效期">
                <Input
                  aria-label="有效期"
                  className="h-12 text-base"
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
                aria-label="优惠内容"
                className="min-h-24 text-base"
                maxLength={1200}
                onChange={(event) =>
                  setForm({ ...form, description: event.target.value })
                }
                value={form.description}
              />
            </FormField>
            <FormField label="使用规则">
              <Textarea
                aria-label="使用规则"
                className="min-h-20 text-base"
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
              className="h-12 min-w-36 rounded-xl bg-forest hover:bg-forest/90"
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
  title,
}: {
  children: React.ReactNode;
  title: string;
}) {
  return (
    <section className="space-y-4">
      <h2 className="text-lg font-bold text-ink">{title}</h2>
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
    <section
      aria-label={`${merchant.name} 店铺资料`}
      className="rounded-2xl bg-ink p-5 text-paper sm:p-6"
    >
      <div className="flex min-w-0 items-start gap-3">
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-paper/10">
          <Store aria-hidden="true" className="h-6 w-6" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="break-words text-lg font-bold sm:text-xl">
            {merchant.name}
          </h2>
          <p className="mt-1 break-words text-sm leading-5 text-paper/70">
            {merchant.description}
          </p>
        </div>
        <span className="shrink-0 rounded-full bg-paper/10 px-2.5 py-1 text-[11px] font-semibold text-paper/90">
          {merchant.owner ? "已绑定" : "未绑定"}
        </span>
      </div>
      <div className="mt-6 grid gap-x-6 gap-y-3 text-xs text-paper/75 sm:grid-cols-2">
        <InfoLine
          icon={MapPin}
          text={merchant.address || merchant.city || "未填写地址"}
        />
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
    </section>
  );
}

function InfoLine({ icon: Icon, text }: { icon: LucideIcon; text: string }) {
  return (
    <div className="flex min-w-0 items-center gap-2.5">
      <Icon aria-hidden="true" className="h-4 w-4 shrink-0 text-paper/65" />
      <span className="min-w-0 break-words" title={text}>
        {text}
      </span>
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
    <label className="grid min-w-0 gap-1.5 text-xs font-semibold text-ink/70">
      {label}
      <span className="flex h-11 min-w-0 items-center gap-2 rounded-xl border border-sand/60 bg-paper px-2">
        <input
          aria-label={label}
          className="h-7 w-8 shrink-0 cursor-pointer border-0 bg-transparent p-0"
          onChange={(event) => onChange(event.target.value.toUpperCase())}
          type="color"
          value={value}
        />
        <span className="min-w-0 truncate font-mono text-[11px] text-ink/70">
          {value}
        </span>
      </span>
    </label>
  );
}

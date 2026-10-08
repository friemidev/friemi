"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Building2,
  ChevronRight,
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
import { getMerchantAdminCopy } from "@/components/admin/merchantAdminCopy";
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
  const copy = getMerchantAdminCopy(locale);
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
    <section aria-label={copy.list.merchantsTab} className="space-y-3">
      <div className="flex items-center gap-3">
        <label className="relative block min-w-0 flex-1">
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-outline"
          />
          <Input
            aria-label={copy.list.searchAria}
            className="h-12 rounded-xl border-0 bg-fog pl-11 text-base text-ink focus-visible:ring-forest"
            onChange={(event) => setQuery(event.target.value)}
            placeholder={copy.list.searchPlaceholder}
            value={query}
          />
        </label>
      </div>

      {merchants.length > 0 ? (
        <div className="divide-y divide-sand/40">
          {merchants.map((merchant) => (
            <article className="min-w-0 py-1" key={merchant.id}>
              <Link
                aria-label={copy.list.merchantAria(merchant.name)}
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
                    {merchant.city ||
                      merchant.address ||
                      copy.list.missingAddress}
                    {" · "}
                    {merchant.owner
                      ? copy.list.owner(merchant.owner.nickname)
                      : copy.list.pendingOwner}
                    {" · "}
                    {copy.list.activities(merchant.activityCount)}
                  </span>
                </span>
                <ChevronRight
                  aria-hidden="true"
                  className="h-5 w-5 shrink-0 text-outline transition group-hover:translate-x-0.5 group-hover:text-forest"
                />
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
            {initialMerchants.length === 0
              ? copy.list.noMerchants
              : copy.list.noResults}
          </p>
          {initialMerchants.length === 0 ? (
            <p className="mx-auto mt-1 max-w-md text-sm leading-6 text-ink/70">
              {copy.list.noMerchantsHint}
            </p>
          ) : null}
          {initialMerchants.length > 0 ? (
            <button
              className="mt-3 min-h-11 rounded-xl px-4 text-sm font-semibold text-forest underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest"
              onClick={() => setQuery("")}
              type="button"
            >
              {copy.list.clearSearch}
            </button>
          ) : null}
        </div>
      )}
    </section>
  );
}

type MerchantUpgradeClientProps = {
  candidates: AdminMerchantCandidate[];
  locale: string;
  merchant?: AdminMerchantListItem | null;
  query: string;
};

export function MerchantUpgradeClient({
  candidates,
  locale,
  merchant,
  query,
}: MerchantUpgradeClientProps) {
  const copy = getMerchantAdminCopy(locale);
  const router = useRouter();
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(
    null,
  );
  const [assigningProfileId, setAssigningProfileId] = useState<string | null>(
    null,
  );

  async function assignMerchantAccount(profileId: string) {
    if (assigningProfileId) return;
    setAssigningProfileId(profileId);

    try {
      const response = await fetch("/api/admin/merchants/assign-owner", {
        body: JSON.stringify({
          profileId,
          ...(merchant ? { merchantId: merchant.id } : {}),
        }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      if (!response.ok) {
        toast.error(
          response.status === 409
            ? copy.bind.conflict
            : merchant
              ? copy.bind.failed
              : copy.bind.createFailed,
        );
        return;
      }

      const json = (await response.json()) as {
        merchant: AdminMerchantListItem;
      };
      toast.success(merchant ? copy.bind.success : copy.bind.createSuccess);
      router.push(withLocale(locale, `/admin/merchants/${json.merchant.id}`));
      router.refresh();
    } catch {
      toast.error(
        merchant ? copy.bind.networkError : copy.bind.createNetworkError,
      );
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
        {copy.bind.results(candidates.length)}
      </p>
      {candidates.length > 0 ? (
        <div className="divide-y divide-sand/40">
          {candidates.map((candidate) => (
            <div className="py-4" key={candidate.id}>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-fog text-sm font-bold text-forest">
                    {candidate.nickname.slice(0, 1).toUpperCase()}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-ink">
                      {candidate.nickname}
                    </p>
                    <p className="mt-1 break-words text-xs text-ink/70">
                      {copy.bind.friendCode}:{" "}
                      {candidate.friendCode ?? copy.bind.missingCode}
                      {candidate.email ? ` · ${candidate.email}` : ""}
                    </p>
                  </div>
                </div>
                <Button
                  aria-controls={`merchant-account-confirm-${candidate.id}`}
                  aria-expanded={selectedProfileId === candidate.id}
                  className="h-11 shrink-0 rounded-xl"
                  disabled={Boolean(assigningProfileId)}
                  onClick={() =>
                    setSelectedProfileId((current) =>
                      current === candidate.id ? null : candidate.id,
                    )
                  }
                  type="button"
                  variant="secondary"
                >
                  {selectedProfileId === candidate.id
                    ? copy.bind.cancel
                    : copy.bind.select}
                </Button>
              </div>
              {selectedProfileId === candidate.id ? (
                <div
                  className="mt-3 space-y-3 rounded-xl bg-fog p-4"
                  id={`merchant-account-confirm-${candidate.id}`}
                >
                  <p className="text-sm leading-6 text-ink">
                    {merchant
                      ? copy.bind.confirm(candidate.nickname, merchant.name)
                      : copy.bind.confirmCreate(candidate.nickname)}
                  </p>
                  <Button
                    className="h-11 rounded-xl bg-forest hover:bg-forest/90"
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
                    {merchant ? copy.bind.submit : copy.bind.submitCreate}
                  </Button>
                </div>
              ) : null}
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl bg-fog px-5 py-12 text-center">
          <p className="text-sm font-semibold text-ink">
            {merchant ? copy.bind.noResults : copy.bind.noCreateResults}
          </p>
          <p className="mt-1 text-sm text-ink/70">{copy.bind.noResultsHint}</p>
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
  city: "",
  contactEmail: "",
  description: "",
  latitude: "",
  longitude: "",
  name: "",
  slug: "",
  websiteUrl: "",
});

export function MerchantCreateClient({ locale }: { locale: string }) {
  const copy = getMerchantAdminCopy(locale);
  const router = useRouter();
  const [form, setForm] = useState<MerchantFormState>(emptyMerchantForm);
  const [isSaving, setIsSaving] = useState(false);
  const canSave =
    form.name.trim().length > 0 &&
    form.description.trim().length > 0 &&
    form.city.trim().length > 0 &&
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
        toast.error(copy.create.slugConflict);
        return;
      }
      if (!response.ok) {
        toast.error(copy.create.failed);
        return;
      }

      const json = (await response.json()) as {
        merchant: AdminMerchantListItem;
      };
      toast.success(copy.create.success);
      router.push(withLocale(locale, `/admin/merchants/${json.merchant.id}`));
      router.refresh();
    } catch {
      toast.error(copy.create.networkError);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <form className="space-y-7" onSubmit={submitMerchant}>
      <Toaster closeButton position="top-center" richColors />
      <FormSection title={copy.create.sectionTitle}>
        <FormField label={`${copy.create.name} *`}>
          <Input
            aria-label={copy.create.name}
            className="h-12 rounded-xl text-base"
            onChange={(event) => setForm({ ...form, name: event.target.value })}
            required
            value={form.name}
          />
        </FormField>
        <FormField label={`${copy.create.description} *`}>
          <Textarea
            aria-label={copy.create.description}
            className="min-h-28 rounded-xl text-base"
            onChange={(event) =>
              setForm({ ...form, description: event.target.value })
            }
            placeholder={copy.create.descriptionPlaceholder}
            required
            value={form.description}
          />
        </FormField>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label={`${copy.create.city} *`}>
            <Input
              aria-label={copy.create.city}
              className="h-12 rounded-xl text-base"
              onChange={(event) =>
                setForm({ ...form, city: event.target.value })
              }
              placeholder={copy.create.cityPlaceholder}
              required
              value={form.city}
            />
          </FormField>
          <FormField label={copy.create.address}>
            <Input
              aria-label={copy.create.address}
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
          {copy.create.more}{" "}
          <ChevronRight
            aria-hidden="true"
            className="h-4 w-4 transition group-open:rotate-90"
          />
        </summary>
        <div className="grid gap-4 pt-4 sm:grid-cols-2">
          <FormField hint={copy.create.slugHint} label={copy.create.slug}>
            <Input
              aria-label={copy.create.slug}
              className="h-12 rounded-xl text-base"
              onChange={(event) =>
                setForm({ ...form, slug: event.target.value })
              }
              placeholder="paris-community-cafe"
              value={form.slug}
            />
          </FormField>
          <FormField label={copy.create.email}>
            <Input
              aria-label={copy.create.email}
              className="h-12 rounded-xl text-base"
              onChange={(event) =>
                setForm({ ...form, contactEmail: event.target.value })
              }
              type="email"
              value={form.contactEmail}
            />
          </FormField>
          <FormField label={copy.create.website}>
            <Input
              aria-label={copy.create.website}
              className="h-12 rounded-xl text-base"
              onChange={(event) =>
                setForm({ ...form, websiteUrl: event.target.value })
              }
              placeholder="https://"
              value={form.websiteUrl}
            />
          </FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField label={copy.create.latitude}>
              <Input
                aria-label={copy.create.latitude}
                className="h-12 rounded-xl text-base"
                inputMode="decimal"
                onChange={(event) =>
                  setForm({ ...form, latitude: event.target.value })
                }
                placeholder="48.8566"
                value={form.latitude}
              />
            </FormField>
            <FormField label={copy.create.longitude}>
              <Input
                aria-label={copy.create.longitude}
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
          {copy.create.save}
        </Button>
        <Button
          className="h-12 rounded-xl"
          disabled={isSaving}
          onClick={() => setForm(emptyMerchantForm())}
          type="button"
          variant="secondary"
        >
          {copy.create.clear}
        </Button>
      </div>
    </form>
  );
}

type CouponFormState = {
  accentColor: string;
  backgroundColor: string;
  description: string;
  foregroundColor: string;
  terms: string;
  title: string;
};

const emptyCouponForm = (): CouponFormState => ({
  accentColor: "#F1F2E3",
  backgroundColor: "#0F6D46",
  description: "",
  foregroundColor: "#FFFFFF",
  terms: "",
  title: "",
});

export function MerchantCouponManagementClient({
  initialCoupons,
  locale,
  merchant,
}: {
  initialCoupons: AdminCouponTemplate[];
  locale: string;
  merchant: AdminMerchantListItem;
}) {
  const copy = getMerchantAdminCopy(locale);
  const [coupons, setCoupons] = useState(initialCoupons);
  const [selectedTemplateKey, setSelectedTemplateKey] = useState<string>(
    platformCouponTemplates.find(
      (template) =>
        !initialCoupons.some(
          (coupon) =>
            coupon.platformTemplateKey === template.key && coupon.isActive,
        ),
    )?.key ?? "",
  );
  const [bindingTemplate, setBindingTemplate] = useState(false);
  const [isCustomOpen, setIsCustomOpen] = useState(false);
  const [form, setForm] = useState<CouponFormState>(emptyCouponForm);
  const [isSaving, setIsSaving] = useState(false);
  const activeCoupons = coupons.filter((coupon) => coupon.isActive);
  const availableTemplates = platformCouponTemplates.filter(
    (template) =>
      !coupons.some(
        (coupon) =>
          coupon.platformTemplateKey === template.key && coupon.isActive,
      ),
  );
  const selectedTemplate =
    availableTemplates.find(
      (template) => template.key === selectedTemplateKey,
    ) ?? availableTemplates[0];

  async function bindPlatformCoupon() {
    if (!selectedTemplate || bindingTemplate) return;
    setBindingTemplate(true);
    try {
      const response = await fetch(
        `/api/admin/merchants/${merchant.id}/coupons`,
        {
          body: JSON.stringify({ platformTemplateKey: selectedTemplate.key }),
          headers: { "Content-Type": "application/json" },
          method: "POST",
        },
      );
      if (!response.ok) {
        toast.error(copy.coupons.addFailed);
        return;
      }
      const json = (await response.json()) as { coupon: AdminCouponTemplate };
      setCoupons((current) => [
        ...current.filter((item) => item.id !== json.coupon.id),
        json.coupon,
      ]);
      toast.success(copy.coupons.addSuccess);
    } catch {
      toast.error(copy.coupons.addFailed);
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
            terms: form.terms || null,
          }),
          headers: { "Content-Type": "application/json" },
          method: "POST",
        },
      );
      if (!response.ok) {
        toast.error(copy.coupons.saveFailed);
        return;
      }
      const json = (await response.json()) as { coupon: AdminCouponTemplate };
      setCoupons((current) => [...current, json.coupon]);
      setForm(emptyCouponForm());
      setIsCustomOpen(false);
      toast.success(copy.coupons.saveSuccess);
    } catch {
      toast.error(copy.coupons.saveNetworkError);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="space-y-8">
      <Toaster closeButton position="top-center" richColors />
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-xl font-bold text-ink">{copy.coupons.templates}</h2>
        <span className="text-xs font-semibold tabular-nums text-ink/70">
          {copy.coupons.added(activeCoupons.length)}
        </span>
      </div>

      <section aria-label={copy.coupons.availableAria} className="space-y-3">
        {activeCoupons.length > 0 ? (
          <div className="grid gap-2 sm:grid-cols-2">
            {activeCoupons.map((coupon) => (
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
                    {copy.coupons.thumbnailLabel}
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
          <p className="rounded-xl bg-fog px-4 py-6 text-center text-sm leading-6 text-ink/70">
            {copy.coupons.empty}
          </p>
        )}
      </section>

      {selectedTemplate ? (
        <section
          aria-labelledby="platform-template-title"
          className="space-y-3"
        >
          <h3
            className="text-sm font-bold text-ink"
            id="platform-template-title"
          >
            {copy.coupons.platformTitle}
          </h3>
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
              {availableTemplates.length > 1 ? (
                <FormField label={copy.coupons.selectStyle}>
                  <select
                    aria-label={copy.coupons.selectStyle}
                    className="h-12 w-full rounded-xl border border-sand/60 bg-paper px-3 text-base font-semibold text-ink outline-none focus:border-forest focus:ring-2 focus:ring-forest/20"
                    onChange={(event) =>
                      setSelectedTemplateKey(event.target.value)
                    }
                    value={selectedTemplate.key}
                  >
                    {availableTemplates.map((template) => (
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
                {copy.coupons.add}
              </Button>
            </div>
          </div>
        </section>
      ) : null}

      <section aria-labelledby="custom-coupon-title" className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <h3 className="text-sm font-bold text-ink" id="custom-coupon-title">
            {copy.coupons.customTitle}
          </h3>
          <Button
            className="h-11 rounded-xl"
            onClick={() => setIsCustomOpen((current) => !current)}
            type="button"
            variant="secondary"
          >
            <TicketPlus aria-hidden="true" className="mr-2 h-4 w-4" />
            {isCustomOpen ? copy.coupons.hideForm : copy.coupons.showForm}
          </Button>
        </div>

        {isCustomOpen ? (
          <form
            className="space-y-4 rounded-2xl bg-fog p-4 sm:p-5"
            onSubmit={createCustomCoupon}
          >
            <FormField label={`${copy.coupons.name} *`}>
              <Input
                aria-label={copy.coupons.name}
                className="h-12 text-base"
                maxLength={120}
                onChange={(event) =>
                  setForm({ ...form, title: event.target.value })
                }
                value={form.title}
              />
            </FormField>
            <FormField label={`${copy.coupons.description} *`}>
              <Textarea
                aria-label={copy.coupons.description}
                className="min-h-24 text-base"
                maxLength={1200}
                onChange={(event) =>
                  setForm({ ...form, description: event.target.value })
                }
                value={form.description}
              />
            </FormField>
            <FormField label={copy.coupons.terms}>
              <Textarea
                aria-label={copy.coupons.terms}
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
                label={copy.coupons.background}
                onChange={(backgroundColor) =>
                  setForm({ ...form, backgroundColor })
                }
                value={form.backgroundColor}
              />
              <ColorField
                label={copy.coupons.foreground}
                onChange={(foregroundColor) =>
                  setForm({ ...form, foregroundColor })
                }
                value={form.foregroundColor}
              />
              <ColorField
                label={copy.coupons.accent}
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
              <p className="text-xs font-semibold opacity-75">
                {copy.coupons.previewBrandLabel}
              </p>
              <p className="mt-1 text-lg font-bold">
                {form.title || copy.coupons.preview}
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
              {copy.coupons.save}
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
  locale,
  merchant,
}: {
  locale: string;
  merchant: AdminMerchantListItem;
}) {
  const copy = getMerchantAdminCopy(locale);
  return (
    <section
      aria-label={copy.detail.summaryAria(merchant.name)}
      className="rounded-2xl bg-ink p-5 text-paper sm:p-6"
    >
      <div className="flex min-w-0 items-start gap-3">
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-paper/10">
          <Store aria-hidden="true" className="h-6 w-6" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <h2 className="break-words text-lg font-bold sm:text-xl">
              {merchant.name}
            </h2>
            <span className="rounded-full bg-paper/10 px-2.5 py-1 text-xs font-semibold text-paper/90">
              {merchant.owner ? copy.detail.bound : copy.detail.unbound}
            </span>
          </div>
          <p className="mt-1 break-words text-sm leading-5 text-paper/70">
            {merchant.description}
          </p>
        </div>
      </div>
      <div className="mt-6 grid gap-x-6 gap-y-3 text-sm text-paper/80 sm:grid-cols-2">
        <InfoLine
          icon={MapPin}
          text={merchant.address || merchant.city || copy.list.missingAddress}
        />
        <InfoLine
          icon={UserRoundCheck}
          text={
            merchant.owner
              ? `${merchant.owner.nickname}${merchant.owner.friendCode ? ` · ${merchant.owner.friendCode}` : ""}`
              : copy.detail.noOwner
          }
        />
        <InfoLine
          icon={Building2}
          text={copy.list.activities(merchant.activityCount)}
        />
        {merchant.websiteUrl ? (
          <InfoLine icon={Globe2} text={merchant.websiteUrl} />
        ) : merchant.contactEmail ? (
          <InfoLine icon={Mail} text={merchant.contactEmail} />
        ) : (
          <InfoLine icon={Mail} text={copy.detail.noContact} />
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

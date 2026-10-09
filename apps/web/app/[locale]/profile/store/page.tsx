import Link from "next/link";
import { ArrowLeft, ArrowRight, Store } from "lucide-react";
import { MerchantStoreHome } from "@/features/coupons/components/MerchantStoreDashboard";
import { getMerchantStoreInfo } from "@/features/coupons/queries/getMerchantStoreInfo";
import { isCurrentUserAdmin } from "@/lib/admin-auth";
import { ensureCurrentUserProfile } from "@/lib/auth";
import { withLocale } from "@/lib/routes";
import { noIndexMetadata } from "@/lib/seo";

type MerchantStorePageProps = {
  params: Promise<{ locale: string }>;
};

export const dynamic = "force-dynamic";
export const metadata = noIndexMetadata;

function getEmptyCopy(locale: string) {
  if (locale === "fr") {
    return {
      title: "Gestion boutique",
      back: "Profil",
      emptyTitle: "Aucune boutique liée à ce compte",
      description:
        "Une fois votre boutique attribuée par un administrateur, vous pourrez gérer ici vos réservations, coupons et billets.",
      adminAction: "Voir les boutiques dans l'administration",
      profileAction: "Retour au profil",
    };
  }

  if (locale === "en") {
    return {
      title: "Store management",
      back: "Profile",
      emptyTitle: "No store is linked to this account",
      description:
        "Once an admin assigns a store to your account, you can manage booking dates, coupons, and tickets here.",
      adminAction: "View stores in admin",
      profileAction: "Back to profile",
    };
  }

  return {
    title: "门店管理",
    back: "个人主页",
    emptyTitle: "此账号还没有关联门店",
    description:
      "管理员将门店分配给此账号后，就可以在这里开放预约日期并管理优惠券、票券。",
    adminAction: "前往后台查看门店",
    profileAction: "返回我的",
  };
}

function MerchantStoreEmpty({
  isAdmin,
  locale,
}: {
  isAdmin: boolean;
  locale: string;
}) {
  const copy = getEmptyCopy(locale);

  return (
    <main className="app-mobile-page-shell [--app-mobile-page-top-gap:1.5rem] min-h-svh bg-white text-ink">
      <div className="mx-auto max-w-3xl px-4 pb-12 sm:px-6">
        <header className="flex h-14 items-center gap-3">
          <Link
            aria-label={copy.back}
            className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-fog text-forest transition active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest"
            href={withLocale(locale, "/profile")}
          >
            <ArrowLeft aria-hidden="true" className="h-5 w-5" />
          </Link>
          <h1 className="text-base font-bold">{copy.title}</h1>
        </header>

        <section className="mx-auto flex max-w-md flex-col items-center px-3 pb-12 pt-20 text-center sm:pt-28">
          <span className="grid h-16 w-16 place-items-center rounded-2xl bg-fog text-forest">
            <Store aria-hidden="true" className="h-8 w-8" />
          </span>
          <h2 className="mt-6 text-xl font-bold leading-tight">
            {copy.emptyTitle}
          </h2>
          <p className="mt-3 text-sm leading-6 text-ink/70">
            {copy.description}
          </p>
          <Link
            className="mt-7 inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-forest px-6 text-sm font-semibold text-white transition hover:bg-meadow active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest"
            href={withLocale(locale, isAdmin ? "/admin/merchants" : "/profile")}
          >
            {isAdmin ? copy.adminAction : copy.profileAction}
            <ArrowRight aria-hidden="true" className="h-4 w-4" />
          </Link>
        </section>
      </div>
    </main>
  );
}

export default async function MerchantStorePage({
  params,
}: MerchantStorePageProps) {
  const { locale } = await params;
  const profile = await ensureCurrentUserProfile(locale, "/profile/store");
  const merchant = await getMerchantStoreInfo(profile.id);

  if (!merchant) {
    return (
      <MerchantStoreEmpty
        isAdmin={await isCurrentUserAdmin()}
        locale={locale}
      />
    );
  }

  return <MerchantStoreHome dashboard={{ merchant }} locale={locale} />;
}

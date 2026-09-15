import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, BadgeCheck, CalendarDays, Store } from "lucide-react";
import { notFound } from "next/navigation";
import { CouponQrCode } from "@/features/coupons/components/CouponQrCode";
import { ensureCurrentUserProfile } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { withLocale } from "@/lib/routes";
import { noIndexMetadata } from "@/lib/seo";

type CouponWalletDetailPageProps = {
  params: Promise<{
    itemId: string;
    locale: string;
  }>;
};

export const dynamic = "force-dynamic";
export const metadata = noIndexMetadata;

function getCopy(locale: string) {
  if (locale === "fr") {
    return {
      back: "Retour au sac",
      copy: "Copier le lien",
      copied: "Lien copié",
      hint: "Présentez ce QR code à la boutique pour utiliser le coupon.",
      noExpiry: "Sans date limite",
      title: "Coupon",
      unavailable: "Ce coupon ne peut plus être utilisé.",
    };
  }
  if (locale === "en") {
    return {
      back: "Back to bag",
      copy: "Copy link",
      copied: "Link copied",
      hint: "Show this QR code to the store to redeem your coupon.",
      noExpiry: "No expiry date",
      title: "Coupon",
      unavailable: "This coupon can no longer be used.",
    };
  }
  return {
    back: "返回背包",
    copy: "复制核销链接",
    copied: "链接已复制",
    hint: "向店家出示此二维码，由店家扫码确认核销。",
    noExpiry: "长期有效",
    title: "优惠券",
    unavailable: "这张优惠券已无法使用。",
  };
}

export default async function CouponWalletDetailPage({
  params,
}: CouponWalletDetailPageProps) {
  const { itemId, locale } = await params;
  const profile = await ensureCurrentUserProfile(
    locale,
    `/profile/bag/coupons/${itemId}`,
  );
  const item = await prisma.couponWalletItem.findFirst({
    where: {
      id: itemId,
      ownerProfileId: profile.id,
    },
    select: {
      redeemedAt: true,
      redemptionToken: true,
      status: true,
      coupon: {
        select: {
          description: true,
          expiresAt: true,
          terms: true,
          title: true,
          merchant: {
            select: {
              isActive: true,
              name: true,
            },
          },
        },
      },
    },
  });

  if (!item) notFound();

  const copy = getCopy(locale);
  const available =
    item.status === "AVAILABLE" &&
    item.coupon.merchant.isActive &&
    (!item.coupon.expiresAt || item.coupon.expiresAt.getTime() > Date.now());

  return (
    <main className="app-mobile-page-shell min-h-svh bg-[#F6F7F2] px-5 pb-10 pt-5">
      <header className="flex items-center justify-between gap-3">
        <Link
          aria-label={copy.back}
          className="grid h-10 w-10 place-items-center rounded-full bg-white text-[#123D31] ring-1 ring-[#D6D5B2]"
          href={withLocale(locale, "/profile/bag")}
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-xl font-black text-[#111210]">{copy.title}</h1>
        <span className="h-10 w-10" />
      </header>

      <section className="mt-6 overflow-hidden rounded-[1.25rem] bg-[#0F6D46] p-5 text-white shadow-[0_20px_46px_rgba(15,109,70,0.2)]">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <Image
              alt="Friemi"
              className="h-auto w-20 object-contain"
              height={24}
              src="/brand/v2_1/friemi-lockup-horizontal-white.png"
              width={80}
            />
            <h2 className="mt-2 text-2xl font-black leading-8">
              {item.coupon.title}
            </h2>
          </div>
          <BadgeCheck className="h-8 w-8 shrink-0 text-[#F1F2E3]" />
        </div>
        <p className="mt-5 text-sm font-semibold leading-6 text-white/76">
          {item.coupon.description}
        </p>
        <div className="mt-5 grid gap-2 border-t border-dashed border-white/30 pt-4 text-xs font-bold text-white/82">
          <p className="flex items-center gap-2">
            <Store className="h-4 w-4" />
            {item.coupon.merchant.name}
          </p>
          <p className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4" />
            {item.coupon.expiresAt
              ? new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(
                  item.coupon.expiresAt,
                )
              : copy.noExpiry}
          </p>
        </div>
      </section>

      {available ? (
        <section className="mt-6 rounded-[1.25rem] bg-white p-5 ring-1 ring-[#D6D5B2]">
          <CouponQrCode
            copiedLabel={copy.copied}
            copyLabel={copy.copy}
            path={withLocale(locale, `/coupons/redeem/${item.redemptionToken}`)}
          />
          <p className="mx-auto mt-4 max-w-xs text-center text-xs font-semibold leading-5 text-[#6C746A]">
            {copy.hint}
          </p>
        </section>
      ) : (
        <p className="mt-6 rounded-[1rem] bg-white px-4 py-5 text-center text-sm font-bold text-[#7A8276] ring-1 ring-[#D6D5B2]">
          {copy.unavailable}
        </p>
      )}

      {item.coupon.terms ? (
        <p className="mt-5 px-2 text-xs font-semibold leading-5 text-[#7A8276]">
          {item.coupon.terms}
        </p>
      ) : null}
    </main>
  );
}

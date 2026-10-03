import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { ensureCurrentUserProfile } from "@/lib/auth";
import { withLocale } from "@/lib/routes";
import { buildNoIndexMetadata } from "@/lib/seo";
import { getNowInviteDetail } from "@/features/now/queries";
import { getNowPreviewDetail } from "@/features/now/nowPreview";
import { getNowSuggestedStartAt } from "@/features/now/now";
import { NowConvertForm } from "@/features/now/NowConvertForm";

type PageProps = { params: Promise<{ locale: string; inviteId: string }> };

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: PageProps) {
  const { locale, inviteId } = await params;
  return buildNoIndexMetadata({
    canonicalPath: withLocale(locale, `/now/${inviteId}/convert`),
  });
}

export default async function NowConvertPage({ params }: PageProps) {
  const { locale, inviteId } = await params;
  const preview =
    process.env.NODE_ENV === "development" && inviteId.startsWith("preview-");
  const profile = preview
    ? null
    : await ensureCurrentUserProfile(locale, `/now/${inviteId}/convert`);
  const invite = preview
    ? getNowPreviewDetail(inviteId, Date.now(), "host")
    : await getNowInviteDetail(inviteId, profile?.id);
  if (!invite?.isOrganizer || invite.linkedActivity) notFound();

  return (
    <main className="now-flow-page app-mobile-page-shell min-h-svh bg-[#FBFCFA] px-5 pb-28 pt-5 text-[#173D32]">
      <div className="mx-auto max-w-[540px]">
        <Link
          href={withLocale(locale, `/now/${invite.id}`)}
          className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-full bg-white shadow-sm"
          aria-label={locale === "zh-CN" ? "返回此刻" : "Back to NOW"}
        >
          <ArrowLeft size={19} />
        </Link>
        <p className="mt-4 text-[11px] font-bold uppercase tracking-[.14em] text-[#6C9275]">
          NOW → HANGOUT
        </p>
        <h1 className="mt-1 text-[25px] font-bold">
          {locale === "zh-CN"
            ? "聚吧草稿"
            : locale === "fr"
              ? "Brouillon de sortie"
              : "Hangout draft"}
        </h1>
        <p className="mb-5 mt-1 text-[12px] leading-5 text-[#657E6C]">
          {locale === "zh-CN"
            ? "把同频的想法落实为一次见面。只需确认时间和地点。"
            : locale === "fr"
              ? "Transformez cette envie en rencontre. Confirmez l'heure et le lieu."
              : "Turn a shared idea into a plan. Confirm the time and place."}
        </p>
        {preview ? (
          <p className="mb-3 text-[11px] font-semibold text-[#778A7D]">
            开发预览 · 示例内容
          </p>
        ) : null}
        <NowConvertForm
          area={invite.area}
          category={invite.category}
          city={invite.city}
          initialStartAt={getNowSuggestedStartAt(invite.intentWindow)}
          interestCount={invite.interests.length}
          inviteId={invite.id}
          intentWindow={invite.intentWindow}
          locale={locale}
          note={invite.note}
          preview={preview}
          title={invite.title}
        />
      </div>
    </main>
  );
}

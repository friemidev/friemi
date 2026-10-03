import Link from "next/link";
import { ArrowLeft, Plus } from "lucide-react";
import { withLocale } from "@/lib/routes";
import { buildNoIndexMetadata } from "@/lib/seo";
import { getNowCopy, nowOpenCity } from "@/features/now/now";
import { getNowBrowseFeed } from "@/features/now/queries";
import { NowInviteRow } from "@/features/now/NowInviteRow";
import { getNowPreviewRows } from "@/features/now/nowPreview";
import { getOptionalCurrentUserProfileSnapshot } from "@/lib/auth";

type PageProps = {
  params: Promise<{ locale: string }>;
  searchParams?: Promise<{ previewNow?: string }>;
};
export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: PageProps) {
  const { locale } = await params;
  return buildNoIndexMetadata({ canonicalPath: withLocale(locale, "/now") });
}

export default async function NowBrowsePage({
  params,
  searchParams,
}: PageProps) {
  const { locale } = await params;
  const query = (await searchParams) ?? {};
  const preview =
    process.env.NODE_ENV === "development" && query.previewNow === "1";
  const viewer = preview ? null : await getOptionalCurrentUserProfileSnapshot();
  const invites = preview
    ? getNowPreviewRows(Date.now())
    : await getNowBrowseFeed(nowOpenCity, new Date(), viewer?.id);
  const copy = getNowCopy(locale);
  return (
    <main className="now-flow-page app-mobile-page-shell min-h-svh bg-[#FAFCF9] px-5 pb-28 pt-5">
      <div className="mx-auto max-w-[640px]">
        <div className="flex items-center justify-between">
          <Link
            href={withLocale(locale, "/mobile-home")}
            className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-full bg-white text-[#1E6248] shadow-sm"
            aria-label="Back"
          >
            <ArrowLeft size={20} />
          </Link>
          <Link
            href={withLocale(locale, "/now/mine")}
            className="flex min-h-11 items-center text-[13px] font-bold text-[#1E7353]"
          >
            {copy.mine}
          </Link>
        </div>
        <h1 className="mt-4 text-[27px] font-bold text-[#143D32]">
          {copy.heading}
        </h1>
        {preview ? (
          <p className="mt-1 text-[11px] font-semibold text-[#778A7D]">
            开发预览 · 示例内容
          </p>
        ) : null}
        <p className="mt-1 text-[13px] text-[#61736A]">{copy.subtitle}</p>
        {invites.length ? (
          <div className="mt-6 grid gap-3">
            {invites.map((invite) => (
              <NowInviteRow
                invite={invite}
                key={invite.id}
                locale={locale}
                viewerId={viewer?.id}
                showInterestAction
                preview={preview}
              />
            ))}
          </div>
        ) : (
          <div className="mt-8 rounded-[1.5rem] bg-white px-6 py-12 text-center text-[14px] text-[#61736A]">
            🎈<p className="mt-3">{copy.empty}</p>
          </div>
        )}
        <Link
          href={withLocale(locale, "/now/new")}
          className="mt-6 flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-[#126A4A] px-5 text-[14px] font-bold text-white"
        >
          <Plus size={18} />
          {copy.create}
        </Link>
      </div>
    </main>
  );
}

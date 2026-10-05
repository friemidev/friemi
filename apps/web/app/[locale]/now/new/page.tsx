import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { ensureCurrentUserProfile } from "@/lib/auth";
import { withLocale } from "@/lib/routes";
import { buildNoIndexMetadata } from "@/lib/seo";
import { NowCreateForm } from "@/features/now/NowCreateForm";
import { getNowCopy, getNowPreviewLabel, isNowKind } from "@/features/now/now";
import { isNowPreviewEnabled } from "@/features/now/previewAccess";

type PageProps = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ kind?: string; previewNow?: string }>;
};

export async function generateMetadata({ params }: PageProps) {
  const { locale } = await params;
  return buildNoIndexMetadata({
    canonicalPath: withLocale(locale, "/now/new"),
  });
}

export default async function NewNowPage({ params, searchParams }: PageProps) {
  const { locale } = await params;
  const { kind, previewNow } = await searchParams;
  const preview = isNowPreviewEnabled() && previewNow === "1";
  if (!preview) await ensureCurrentUserProfile(locale, "/now/new");
  const copy = getNowCopy(locale);
  return (
    <main className="now-flow-page app-mobile-page-shell min-h-svh bg-[#FAFCF9] px-5 pb-28 pt-5 text-[#143D32]">
      <div className="mx-auto max-w-[540px]">
        <Link
          href={withLocale(locale, "/mobile-home")}
          aria-label={locale === "zh-CN" ? "返回首页" : "Back"}
          className="mb-5 inline-flex min-h-11 min-w-11 items-center justify-center rounded-full bg-white text-[#1E6248] shadow-sm"
        >
          <ArrowLeft size={20} />
        </Link>
        <h1 className="mb-1 text-[27px] font-bold tracking-tight">
          {copy.create}
        </h1>
        {preview ? (
          <p className="mb-1 text-[11px] font-semibold text-[#778A7D]">
            {getNowPreviewLabel(locale)}
          </p>
        ) : null}
        <p className="mb-7 text-[13px] text-[#708276]">
          {locale === "zh-CN"
            ? "把当下的想法放出来，看看谁想一起。"
            : locale === "fr"
              ? "Lancez une idée et voyez qui vous rejoint."
              : "Put an idea out there and see who joins in."}
        </p>
        <NowCreateForm
          locale={locale}
          initialKind={kind && isNowKind(kind) ? kind : "COFFEE"}
          preview={preview}
        />
      </div>
    </main>
  );
}

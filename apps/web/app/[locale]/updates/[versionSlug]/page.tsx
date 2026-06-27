import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  ListChecks,
  Sparkles,
} from "lucide-react";
import { BrandBackdrop } from "@/components/brand/BrandBackdrop";
import { BrandLockup } from "@/components/brand/BrandLockup";
import { getVersionUpdateBySlug } from "@/features/updates/versionUpdates";
import { withLocale } from "@/lib/routes";

export const dynamic = "force-dynamic";

type VersionUpdateDetailPageProps = {
  params: Promise<{
    locale: string;
    versionSlug: string;
  }>;
};

function formatDate(value: string) {
  return value.replaceAll("-", ".");
}

export default async function VersionUpdateDetailPage({
  params,
}: VersionUpdateDetailPageProps) {
  const { locale, versionSlug } = await params;
  const update = getVersionUpdateBySlug(versionSlug);

  if (!update) {
    notFound();
  }

  return (
    <main className="relative isolate overflow-hidden bg-[#f7fff3]">
      <BrandBackdrop
        className="inset-x-0 top-0 z-0 h-[34rem] opacity-[0.42]"
        imageClassName="object-cover"
        priority
        variant="desktop-band"
      />
      <div
        className="pointer-events-none absolute inset-0 z-0 bg-[linear-gradient(180deg,rgba(247,255,243,0.72),#f7fff3_58%,#fffaf2_100%)]"
        aria-hidden="true"
      />

      <div className="relative z-10 mx-auto w-full max-w-7xl px-4 pb-20 pt-8 sm:px-6 sm:pt-12 lg:px-8">
        <Link
          href={withLocale(locale, "/updates")}
          className="inline-flex h-10 items-center gap-2 rounded-full border border-[#cfe4c8] bg-white/[0.78] px-4 text-sm font-semibold text-[#315b48] shadow-sm transition hover:-translate-y-0.5 hover:bg-white hover:text-[#10265c]"
        >
          <ArrowLeft className="h-4 w-4" />
          返回更新列表
        </Link>

        <header className="mt-5 overflow-hidden rounded-[2rem] border border-[#d8e7cf] bg-white/[0.78] p-5 shadow-[0_24px_70px_rgba(10,63,49,0.08)] backdrop-blur sm:p-7">
          <BrandLockup size="sm" />
          <div className="mt-8 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#006e4d] px-3 py-1 text-xs font-semibold text-white shadow-[0_8px_18px_rgba(0,110,77,0.16)]">
              <ListChecks className="h-3.5 w-3.5" />
              {update.version}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#fffaf2] px-3 py-1 text-xs font-medium text-[#315b48] ring-1 ring-[#bfd6b7]">
              <CalendarDays className="h-3.5 w-3.5" />
              {formatDate(update.releasedAt)}
            </span>
          </div>

          <div className="mt-5 max-w-4xl">
            <p className="inline-flex items-center gap-2 rounded-full border border-[#cfe4c8] bg-[#f4fbef] px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#006e4d]">
              <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
              Release Notes
            </p>
            <h1 className="mt-4 font-serif text-[2.35rem] leading-[1.08] text-[#10265c] sm:text-5xl">
              {update.title}
            </h1>
            <p className="mt-4 text-base leading-7 text-[#315b48]">
              {update.description}
            </p>
          </div>
        </header>

        <section className="mt-6 grid gap-4 lg:grid-cols-4">
          {update.highlights.map((highlight) => (
            <div
              key={highlight}
              className="rounded-[1.2rem] border border-[#d8e7cf] bg-white/[0.74] p-4 shadow-[0_14px_34px_rgba(10,63,49,0.055)]"
            >
              <CheckCircle2 className="h-5 w-5 text-[#006e4d]" />
              <p className="mt-3 text-sm leading-6 text-[#315b48]">
                {highlight}
              </p>
            </div>
          ))}
        </section>

        <section className="mt-8 space-y-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#006e4d]">
              本次更新
            </p>
            <h2 className="mt-2 font-serif text-3xl leading-tight text-[#10265c]">
              用户可以直接感受到的变化
            </h2>
          </div>

          <ol className="grid gap-3">
            {update.userUpdates.map((item, index) => (
              <li
                key={item}
                className="grid grid-cols-[2.75rem_minmax(0,1fr)] gap-3 rounded-[1.15rem] border border-[#d8e7cf] bg-white/[0.76] p-4 shadow-[0_12px_30px_rgba(10,63,49,0.05)]"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#10265c] text-sm font-semibold text-white">
                  {index + 1}
                </span>
                <p className="self-center text-sm leading-6 text-[#315b48] sm:text-base">
                  {item}
                </p>
              </li>
            ))}
          </ol>
        </section>
      </div>
    </main>
  );
}

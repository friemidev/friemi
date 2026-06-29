import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  ListChecks,
  Sparkles,
} from "lucide-react";
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
    <main className="relative isolate overflow-hidden bg-[#FEFFF9]">
      <div className="relative z-10 mx-auto w-full max-w-7xl px-4 pb-20 pt-8 sm:px-6 sm:pt-12 lg:px-8">
        <Link
          href={withLocale(locale, "/updates")}
          className="inline-flex h-10 items-center gap-2 rounded-full border border-[#D6D5B2] bg-white/[0.78] px-4 text-sm font-semibold text-[#156240] shadow-sm transition hover:-translate-y-0.5 hover:bg-white hover:text-[#1D1D1B]"
        >
          <ArrowLeft className="h-4 w-4" />
          返回更新列表
        </Link>

        <header className="mt-5 overflow-hidden rounded-[2rem] border border-[#D6D5B2] bg-white/[0.78] p-5 shadow-[0_24px_70px_rgba(21,98,64,0.08)] backdrop-blur sm:p-7">
          <BrandLockup size="sm" />
          <div className="mt-8 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#156240] px-3 py-1 text-xs font-semibold text-white shadow-[0_8px_18px_rgba(21,98,64,0.16)]">
              <ListChecks className="h-3.5 w-3.5" />
              {update.version}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#FFF5E6] px-3 py-1 text-xs font-medium text-[#156240] ring-1 ring-[#8AB68E]">
              <CalendarDays className="h-3.5 w-3.5" />
              {formatDate(update.releasedAt)}
            </span>
          </div>

          <div className="mt-5 max-w-4xl">
            <p className="inline-flex items-center gap-2 rounded-full border border-[#D6D5B2] bg-[#F1F2EC] px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#156240]">
              <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
              Release Notes
            </p>
            <h1 className="mt-4 font-serif text-[2.35rem] leading-[1.08] text-[#1D1D1B] sm:text-5xl">
              {update.title}
            </h1>
            <p className="mt-4 text-base leading-7 text-[#156240]">
              {update.description}
            </p>
          </div>
        </header>

        <section className="mt-6 grid gap-4 lg:grid-cols-4">
          {update.highlights.map((highlight) => (
            <div
              key={highlight}
              className="rounded-[1.2rem] border border-[#D6D5B2] bg-white/[0.74] p-4 shadow-[0_14px_34px_rgba(21,98,64,0.055)]"
            >
              <CheckCircle2 className="h-5 w-5 text-[#156240]" />
              <p className="mt-3 text-sm leading-6 text-[#156240]">
                {highlight}
              </p>
            </div>
          ))}
        </section>

        <section className="mt-8 space-y-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#156240]">
              本次更新
            </p>
            <h2 className="mt-2 font-serif text-3xl leading-tight text-[#1D1D1B]">
              用户可以直接感受到的变化
            </h2>
          </div>

          <ol className="grid gap-3">
            {update.userUpdates.map((item, index) => (
              <li
                key={item}
                className="grid grid-cols-[2.75rem_minmax(0,1fr)] gap-3 rounded-[1.15rem] border border-[#D6D5B2] bg-white/[0.76] p-4 shadow-[0_12px_30px_rgba(21,98,64,0.05)]"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#1D1D1B] text-sm font-semibold text-white">
                  {index + 1}
                </span>
                <p className="self-center text-sm leading-6 text-[#156240] sm:text-base">
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

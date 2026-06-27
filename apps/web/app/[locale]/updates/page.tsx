import Link from "next/link";
import {
  ArrowRight,
  CalendarDays,
  ListChecks,
  Newspaper,
  Sparkles,
} from "lucide-react";
import { BrandBackdrop } from "@/components/brand/BrandBackdrop";
import { BrandLockup } from "@/components/brand/BrandLockup";
import { getVersionUpdatesDescending } from "@/features/updates/versionUpdates";
import { brand } from "@/lib/brand";
import { withLocale } from "@/lib/routes";

type UpdatesPageProps = {
  params: Promise<{
    locale: string;
  }>;
};

function formatDate(value: string) {
  return value.replaceAll("-", ".");
}

export default async function UpdatesPage({ params }: UpdatesPageProps) {
  const { locale } = await params;
  const updates = getVersionUpdatesDescending();
  const latestUpdate = updates[0];

  return (
    <main className="relative isolate overflow-hidden bg-[#FEFFF9]">
      <BrandBackdrop
        className="inset-x-0 top-0 z-0 h-[34rem] opacity-[0.42]"
        imageClassName="object-cover"
        priority
        variant="desktop-band"
      />
      <div
        className="pointer-events-none absolute inset-0 z-0 bg-[linear-gradient(180deg,rgba(247,255,243,0.72),#FEFFF9_56%,#FFF5E6_100%)]"
        aria-hidden="true"
      />

      <div className="relative z-10 mx-auto w-full max-w-7xl px-4 pb-20 pt-8 sm:px-6 sm:pt-12 lg:px-8">
        <header className="grid gap-7 rounded-[2rem] border border-[#D6D5B2] bg-white/[0.78] p-5 shadow-[0_24px_70px_rgba(21,98,64,0.08)] backdrop-blur sm:p-7 lg:grid-cols-[minmax(0,1fr)_18rem] lg:items-end">
          <div className="min-w-0">
            <BrandLockup size="sm" />
            <p className="mt-8 inline-flex items-center gap-2 rounded-full border border-[#D6D5B2] bg-[#F1F2E3] px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#156240]">
              <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
              Product Notes
            </p>
            <h1 className="mt-4 max-w-3xl font-serif text-[2.45rem] leading-[1.08] text-[#1D1D1B] sm:text-5xl">
              {brand.name} 更新记录
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-[#156240]">
              查看最近上线的功能、体验变化和正在被打磨的产品细节。
            </p>
          </div>

          {latestUpdate ? (
            <div className="rounded-[1.35rem] border border-[#8AB68E] bg-[#FFF5E6]/[0.86] p-4 shadow-[0_18px_42px_rgba(29,29,27,0.06)]">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#156240]">
                最新版本
              </p>
              <p className="mt-2 font-serif text-4xl text-[#1D1D1B]">
                {latestUpdate.version}
              </p>
              <p className="mt-2 text-sm leading-6 text-[#156240]">
                {formatDate(latestUpdate.releasedAt)} 发布，包含{" "}
                {latestUpdate.userUpdates.length} 项用户可感知更新。
              </p>
            </div>
          ) : null}
        </header>

        <section aria-label="版本列表" className="mt-6 grid gap-3 sm:mt-8">
          {updates.map((update, index) => (
            <Link
              key={update.slug}
              href={withLocale(locale, `/updates/${update.slug}`)}
              className="group grid gap-4 rounded-[1.35rem] border border-[#D6D5B2] bg-white/[0.76] p-4 shadow-[0_14px_34px_rgba(21,98,64,0.055)] transition duration-200 ease-out hover:-translate-y-0.5 hover:border-[#8AB68E] hover:bg-white hover:shadow-[0_20px_46px_rgba(21,98,64,0.09)] sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:p-5"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-[#156240] px-3 py-1 text-xs font-semibold text-white shadow-[0_8px_18px_rgba(21,98,64,0.16)]">
                    <Newspaper className="h-3.5 w-3.5" />
                    {update.version}
                  </span>
                  {index === 0 ? (
                    <span className="rounded-full bg-[#DEAAB3] px-3 py-1 text-xs font-semibold text-[#B5301F] ring-1 ring-[#DEAAB3]">
                      最新版本
                    </span>
                  ) : null}
                </div>
                <h2 className="mt-3 text-xl font-semibold leading-snug text-[#1D1D1B]">
                  {update.title}
                </h2>
                <p className="mt-2 max-w-4xl text-sm leading-6 text-[#156240]">
                  {update.description}
                </p>
                <div className="mt-4 flex flex-wrap gap-3 text-xs font-medium text-zinc-500">
                  <span className="inline-flex items-center gap-1.5">
                    <CalendarDays className="h-4 w-4 text-[#156240]" />
                    {formatDate(update.releasedAt)}
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <ListChecks className="h-4 w-4 text-[#156240]" />
                    {update.userUpdates.length} 项更新
                  </span>
                </div>
              </div>

              <span className="inline-flex h-10 items-center justify-center gap-2 whitespace-nowrap rounded-full bg-[#1D1D1B] px-4 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(29,29,27,0.16)] transition group-hover:bg-[#156240]">
                查看详情
                <ArrowRight className="h-4 w-4" />
              </span>
            </Link>
          ))}
        </section>
      </div>
    </main>
  );
}

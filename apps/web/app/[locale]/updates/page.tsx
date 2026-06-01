import Link from "next/link";
import { ArrowRight, CalendarDays, ListChecks, Newspaper } from "lucide-react";
import { PageContainer } from "@/components/layout/PageContainer";
import { getVersionUpdatesDescending } from "@/features/updates/versionUpdates";
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

  return (
    <PageContainer className="space-y-8 py-6 sm:py-10">
      <header className="max-w-3xl">
        <p className="text-sm font-medium text-moss">更新公告</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-normal text-ink sm:text-4xl">
          Next Fun Club 更新记录
        </h1>
        <p className="mt-3 text-base leading-7 text-zinc-600">
          查看最近上线的功能和体验变化。
        </p>
      </header>

      <section aria-label="版本列表" className="space-y-3">
        {updates.map((update, index) => (
          <Link
            key={update.slug}
            href={withLocale(locale, `/updates/${update.slug}`)}
            className="group grid gap-4 rounded-lg border border-black/10 bg-white/80 p-4 shadow-sm transition hover:-translate-y-0.5 hover:bg-white hover:shadow-md sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:p-5"
          >
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-ink px-3 py-1 text-xs font-semibold text-white">
                  <Newspaper className="h-3.5 w-3.5" />
                  {update.version}
                </span>
                {index === 0 ? (
                  <span className="rounded-full bg-moss/10 px-3 py-1 text-xs font-semibold text-moss">
                    最新版本
                  </span>
                ) : null}
              </div>
              <h2 className="mt-3 text-xl font-semibold tracking-normal text-ink">
                {update.title}
              </h2>
              <p className="mt-2 max-w-4xl text-sm leading-6 text-zinc-600">
                {update.description}
              </p>
              <div className="mt-4 flex flex-wrap gap-3 text-xs font-medium text-zinc-500">
                <span className="inline-flex items-center gap-1.5">
                  <CalendarDays className="h-4 w-4" />
                  {formatDate(update.releasedAt)}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <ListChecks className="h-4 w-4" />
                  {update.userUpdates.length} 项更新
                </span>
              </div>
            </div>

            <span className="inline-flex h-10 items-center justify-center gap-2 whitespace-nowrap rounded-md bg-zinc-950 px-4 text-sm font-medium text-white transition group-hover:bg-moss">
              查看详情
              <ArrowRight className="h-4 w-4" />
            </span>
          </Link>
        ))}
      </section>
    </PageContainer>
  );
}

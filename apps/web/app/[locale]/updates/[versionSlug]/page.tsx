import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  ListChecks,
} from "lucide-react";
import { PageContainer } from "@/components/layout/PageContainer";
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
    <PageContainer className="space-y-7 py-6 sm:py-10">
      <Link
        href={withLocale(locale, "/updates")}
        className="inline-flex items-center gap-2 text-sm font-medium text-zinc-600 transition hover:text-ink"
      >
        <ArrowLeft className="h-4 w-4" />
        返回更新列表
      </Link>

      <header className="space-y-5 border-b border-black/10 pb-7">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-ink px-3 py-1 text-xs font-semibold text-white">
            <ListChecks className="h-3.5 w-3.5" />
            {update.version}
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-xs font-medium text-zinc-600 ring-1 ring-black/10">
            <CalendarDays className="h-3.5 w-3.5" />
            {formatDate(update.releasedAt)}
          </span>
        </div>

        <div className="max-w-4xl">
          <h1 className="text-3xl font-semibold tracking-normal text-ink sm:text-4xl">
            {update.title}
          </h1>
          <p className="mt-3 text-base leading-7 text-zinc-600">
            {update.description}
          </p>
        </div>
      </header>

      <section className="grid gap-4 lg:grid-cols-4">
        {update.highlights.map((highlight) => (
          <div
            key={highlight}
            className="rounded-lg border border-black/10 bg-white/80 p-4"
          >
            <CheckCircle2 className="h-5 w-5 text-moss" />
            <p className="mt-3 text-sm leading-6 text-zinc-700">{highlight}</p>
          </div>
        ))}
      </section>

      <section className="space-y-4">
        <div>
          <p className="text-sm font-medium text-moss">本次更新</p>
          <h2 className="mt-1 text-2xl font-semibold tracking-normal text-ink">
            用户可以直接感受到的变化
          </h2>
        </div>

        <ol className="grid gap-3">
          {update.userUpdates.map((item, index) => (
            <li
              key={item}
              className="grid grid-cols-[2.5rem_minmax(0,1fr)] gap-3 rounded-lg border border-black/10 bg-white/80 p-4 shadow-sm"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-ink text-sm font-semibold text-white">
                {index + 1}
              </span>
              <p className="self-center text-sm leading-6 text-zinc-700 sm:text-base">
                {item}
              </p>
            </li>
          ))}
        </ol>
      </section>
    </PageContainer>
  );
}

import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@chill-club/ui";
import { getTranslations } from "next-intl/server";
import { PageContainer } from "@/components/layout/PageContainer";
import { ActivityCard } from "@/features/activities/components/ActivityCard";
import { mockActivities } from "@/features/activities/queries/mockActivities";
import { withLocale } from "@/lib/routes";

type HomePageProps = {
  params: Promise<{
    locale: string;
  }>;
};

export default async function HomePage({ params }: HomePageProps) {
  const { locale } = await params;
  const t = await getTranslations("home");

  return (
    <PageContainer className="space-y-12">
      <section className="grid gap-8 py-8 md:grid-cols-[1.05fr_0.95fr] md:items-center md:py-14">
        <div className="space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/70 px-3 py-1 text-sm text-zinc-600 ring-1 ring-black/10">
            <Sparkles className="h-4 w-4 text-clay" />
            Paris first · 中文活动搭子
          </div>
          <div className="space-y-4">
            <h1 className="max-w-2xl text-5xl font-semibold tracking-normal text-ink sm:text-6xl">{t("title")}</h1>
            <p className="text-2xl font-medium text-moss">{t("tagline")}</p>
            <p className="max-w-xl text-base leading-7 text-zinc-650">{t("description")}</p>
          </div>
          <Link href={withLocale(locale, "/activities")}>
            <Button className="gap-2">
              {t("browseActivities")}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>

        <div className="rounded-lg border border-black/10 bg-white/65 p-4 shadow-sm">
          <div className="grid gap-3">
            {mockActivities.slice(0, 2).map((activity) => (
              <div key={activity.id} className="rounded-md bg-paper p-4">
                <p className="font-semibold text-ink">{activity.title}</p>
                <p className="mt-1 text-sm text-zinc-600">{activity.address}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold tracking-normal text-ink">最近活动</h2>
            <p className="mt-1 text-sm text-zinc-600">先用静态数据验证卡片和页面结构。</p>
          </div>
          <Link className="hidden text-sm font-medium text-moss sm:inline" href={withLocale(locale, "/activities")}>
            查看全部
          </Link>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {mockActivities.map((activity) => (
            <ActivityCard key={activity.id} activity={activity} locale={locale} />
          ))}
        </div>
      </section>
    </PageContainer>
  );
}

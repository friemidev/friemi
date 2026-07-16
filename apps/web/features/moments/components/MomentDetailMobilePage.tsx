"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import type { MomentFeedItemViewModel } from "@/features/moments/queries/getMomentFeed";
import { withLocale } from "@/lib/routes";
import { FeedCard, getFootprintsCopy } from "./FootprintsMobilePage";

type MomentDetailMobilePageProps = {
  locale: string;
  moment: MomentFeedItemViewModel;
  profile: {
    id: string;
  };
};

export function MomentDetailMobilePage({
  locale,
  moment,
  profile,
}: MomentDetailMobilePageProps) {
  const copy = getFootprintsCopy(locale);

  return (
    <main className="min-h-screen bg-[#FEFFF9] pb-10 text-[#111210] md:bg-[#EEF4FB]">
      <div className="mx-auto min-h-screen max-w-md bg-[#FEFFF9] px-5 pt-[calc(env(safe-area-inset-top)+1rem)] md:shadow-[0_22px_70px_rgba(15,23,42,0.1)]">
        <header className="flex items-center justify-between pb-5">
          <Link
            href={withLocale(locale, "/footprints?tab=moment")}
            className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-[#D6D5B2] bg-white text-[#1D1D1B] shadow-[0_8px_20px_rgba(21,98,64,0.08)]"
            aria-label="Back"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-[17px] font-black leading-none tracking-normal text-[#111210]">
            {copy.title}
          </h1>
          <span aria-hidden className="h-11 w-11" />
        </header>

        <FeedCard
          deleteRedirectPath="/footprints?tab=moment"
          locale={locale}
          moment={moment}
          copy={copy}
          viewerProfileId={profile.id}
        />
      </div>
    </main>
  );
}

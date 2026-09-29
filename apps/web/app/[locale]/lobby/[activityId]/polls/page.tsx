import Link from "next/link";
import { ArrowLeft, CalendarClock, CirclePlus, Vote } from "lucide-react";
import { notFound } from "next/navigation";
import { PageContainer } from "@/components/layout/PageContainer";
import { MobileNavSectionOverride } from "@/components/navigation/MobileNavSectionOverride";
import { getPollCopy } from "@/features/polls/copy";
import { getActivityPollList } from "@/features/polls/server/pollService";
import { ensureCurrentUserProfileSnapshot } from "@/lib/auth";
import { withLocale } from "@/lib/routes";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ locale: string; activityId: string }>;
};

function formatDate(locale: string, value: string) {
  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export default async function ActivityPollListPage({ params }: PageProps) {
  const { activityId, locale } = await params;
  const profile = await ensureCurrentUserProfileSnapshot(
    locale,
    `/lobby/${activityId}/polls`,
  );
  const data = await getActivityPollList(activityId, profile.id);
  if (!data) notFound();
  const copy = getPollCopy(locale);

  return (
    <PageContainer
      className="max-w-[640px] space-y-6 bg-[#FEFFF9] pb-24 pt-4 sm:py-8"
      mobileSafeBottom
      mobileSafeTop
    >
      <MobileNavSectionOverride section="activities" />
      <header className="grid grid-cols-[42px_minmax(0,1fr)_42px] items-center">
        <Link
          aria-label={copy.back}
          className="flex h-10 w-10 items-center justify-center rounded-full border border-[#E3DFD0] bg-white text-[#156240]"
          href={withLocale(locale, `/lobby/${activityId}`)}
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="min-w-0 text-center">
          <h1 className="text-[18px] font-black text-[#1D1D1B]">
            {copy.polls}
          </h1>
          <p className="truncate text-xs font-semibold text-[#7C827A]">
            {data.activity.title}
          </p>
        </div>
        {data.canCreate ? (
          <Link
            aria-label={copy.create}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-[#156240] text-white shadow-sm"
            href={withLocale(locale, `/lobby/${activityId}/polls/new`)}
          >
            <CirclePlus className="h-5 w-5" />
          </Link>
        ) : (
          <span />
        )}
      </header>

      {data.polls.length > 0 ? (
        <section className="space-y-3">
          {data.polls.map((poll) => {
            const statusLabel =
              poll.effectiveStatus === "OPEN"
                ? copy.open
                : poll.effectiveStatus === "CANCELLED"
                  ? copy.cancelled
                  : copy.closed;
            return (
              <Link
                className="block rounded-lg border border-[#E3DFD0] bg-white p-4 shadow-[0_8px_22px_rgba(21,98,64,0.04)] transition hover:border-[#AFC9B4] active:scale-[0.99]"
                href={withLocale(
                  locale,
                  `/lobby/${activityId}/polls/${poll.id}`,
                )}
                key={poll.id}
              >
                <div className="flex items-start gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#ECF5EF] text-[#156240]">
                    <Vote className="h-5 w-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <h2 className="line-clamp-2 text-sm font-black leading-5 text-[#1D1D1B]">
                        {poll.question}
                      </h2>
                      <span
                        className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-black ${
                          poll.effectiveStatus === "OPEN"
                            ? "bg-[#E4F4E7] text-[#156240]"
                            : "bg-[#F1F1ED] text-[#6E756F]"
                        }`}
                      >
                        {statusLabel}
                      </span>
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-[11px] font-semibold text-[#747B73]">
                      <span>
                        {poll.participantCount} {copy.people}
                      </span>
                      <span>
                        {poll.kind === "SINGLE_CHOICE"
                          ? copy.single
                          : copy.multiple}
                      </span>
                      {poll.closesAt ? (
                        <span className="inline-flex items-center gap-1">
                          <CalendarClock className="h-3.5 w-3.5" />
                          {formatDate(locale, poll.closesAt)}
                        </span>
                      ) : null}
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </section>
      ) : (
        <section className="rounded-lg border border-dashed border-[#CFD8C9] bg-white px-6 py-14 text-center">
          <Vote className="mx-auto h-7 w-7 text-[#5C8A6C]" />
          <h2 className="mt-3 text-base font-black text-[#1D1D1B]">
            {copy.empty}
          </h2>
          <p className="mt-2 text-sm text-[#747B73]">{copy.emptyHint}</p>
          {data.canCreate ? (
            <Link
              className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-full bg-[#156240] px-5 text-sm font-bold text-white"
              href={withLocale(locale, `/lobby/${activityId}/polls/new`)}
            >
              <CirclePlus className="h-4 w-4" />
              {copy.create}
            </Link>
          ) : null}
        </section>
      )}
    </PageContainer>
  );
}

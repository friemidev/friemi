import Link from "next/link";
import { MessageCircleQuestion, UserRound } from "lucide-react";
import { getCopy } from "@/lib/copy";
import { getSignInHref } from "@/lib/auth-redirect";
import type { ActivityCommentViewModel } from "../types";
import { getActivityDetailPath } from "../utils/activityRoutes";
import { ActivityCommentForm } from "./ActivityCommentForm";
import { ActivityCommentThread } from "./ActivityCommentThread";

type ActivityCommentsSectionProps = {
  activityId: string;
  comments: ActivityCommentViewModel[];
  isAuthenticated: boolean;
  locale: string;
  translationAccessToken?: string | null;
  viewerProfileId: string | null;
};

export function ActivityCommentsSection({
  activityId,
  comments,
  isAuthenticated,
  locale,
  translationAccessToken,
  viewerProfileId,
}: ActivityCommentsSectionProps) {
  const t = getCopy(locale).activityComments;

  return (
    <section
      className="rounded-[1.35rem] bg-white/52 px-0 py-1 sm:border sm:border-[#D6D5B2] sm:bg-white/75 sm:p-5"
      id="comments"
    >
      <div className="flex items-start gap-3 px-1 sm:px-0">
        <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-[0.85rem] bg-[#E7F4EA] text-[#156240]">
          <MessageCircleQuestion className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <h2 className="text-[1.35rem] font-black leading-tight text-ink sm:text-lg sm:font-semibold">
            {t.title}
          </h2>
          <p className="mt-1 max-w-[22rem] text-sm font-medium leading-6 text-zinc-500">
            {t.description}
          </p>
        </div>
      </div>

      <div className="mt-4 sm:border-t sm:border-[#D6D5B2] sm:pt-5">
        {isAuthenticated ? (
          <ActivityCommentForm activityId={activityId} locale={locale} />
        ) : (
          <div className="flex flex-col gap-3 rounded-[1rem] bg-[#FEFFF9]/64 px-4 py-3 text-sm sm:rounded-xl sm:border sm:border-[#D6D5B2] sm:bg-[#FEFFF9]/72 sm:p-3 sm:shadow-sm">
            <div className="min-w-0">
              <p className="font-black text-ink sm:font-medium">
                {t.signInTitle}
              </p>
              <p className="mt-1 text-xs leading-5 text-zinc-500 sm:text-sm sm:leading-6">
                {t.signInDescription}
              </p>
            </div>
            <Link
              className="inline-flex h-9 w-fit items-center justify-center whitespace-nowrap rounded-full bg-white px-4 text-sm font-semibold text-[#156240] shadow-sm ring-1 ring-[#8AB68E] transition hover:bg-[#FEFFF9]"
              href={getSignInHref(
                locale,
                `${getActivityDetailPath(activityId)}#comments`,
              )}
            >
              {t.signInTitle}
            </Link>
          </div>
        )}
      </div>

      <div className="mt-4 grid gap-3 sm:mt-6">
        {comments.length > 0 ? (
          comments.map((comment) => (
            <ActivityCommentThread
              key={comment.id}
              activityId={activityId}
              comment={comment}
              isAuthenticated={isAuthenticated}
              locale={locale}
              translationAccessToken={translationAccessToken}
              viewerProfileId={viewerProfileId}
            />
          ))
        ) : (
          <div className="rounded-[1.1rem] bg-[#FEFFF9]/62 px-5 py-6 text-center">
            <UserRound className="mx-auto h-6 w-6 text-[#8AB68E]" />
            <p className="mt-2 font-black text-ink">{t.emptyTitle}</p>
            <p className="mx-auto mt-1 max-w-[18rem] text-sm leading-6 text-zinc-500">
              {t.emptyDescription}
            </p>
          </div>
        )}
      </div>
    </section>
  );
}

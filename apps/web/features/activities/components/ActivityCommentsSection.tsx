import Link from "next/link";
import { MessageCircleQuestion, UserRound } from "lucide-react";
import { getCopy } from "@/lib/copy";
import { withLocale } from "@/lib/routes";
import type { ActivityCommentViewModel } from "../types";
import { ActivityCommentForm } from "./ActivityCommentForm";
import { ActivityCommentThread } from "./ActivityCommentThread";

type ActivityCommentsSectionProps = {
  activityId: string;
  comments: ActivityCommentViewModel[];
  isAuthenticated: boolean;
  locale: string;
  viewerProfileId: string | null;
};

export function ActivityCommentsSection({
  activityId,
  comments,
  isAuthenticated,
  locale,
  viewerProfileId,
}: ActivityCommentsSectionProps) {
  const t = getCopy(locale).activityComments;

  return (
    <section
      className="rounded-lg border border-black/10 bg-white/75 p-4 sm:p-5"
      id="comments"
    >
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-moss/10 text-moss">
          <MessageCircleQuestion className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <h2 className="text-lg font-semibold text-ink">{t.title}</h2>
          <p className="mt-1 text-sm leading-6 text-zinc-500">
            {t.description}
          </p>
        </div>
      </div>

      <div className="mt-5 border-t border-zinc-200 pt-5">
        {isAuthenticated ? (
          <ActivityCommentForm activityId={activityId} locale={locale} />
        ) : (
          <div className="rounded-md border border-zinc-200 bg-zinc-50 p-3 text-sm">
            <p className="font-medium text-ink">{t.signInTitle}</p>
            <p className="mt-1 leading-6 text-zinc-500">
              {t.signInDescription}
            </p>
            <Link
              className="mt-3 inline-flex h-10 items-center justify-center whitespace-nowrap rounded-md bg-zinc-950 px-4 text-sm font-medium text-white transition hover:bg-zinc-800"
              href={withLocale(locale, "/sign-in")}
            >
              {t.signInTitle}
            </Link>
          </div>
        )}
      </div>

      <div className="mt-6 divide-y divide-zinc-200/80">
        {comments.length > 0 ? (
          comments.map((comment) => (
            <ActivityCommentThread
              key={comment.id}
              activityId={activityId}
              comment={comment}
              isAuthenticated={isAuthenticated}
              locale={locale}
              viewerProfileId={viewerProfileId}
            />
          ))
        ) : (
          <div className="rounded-md border border-dashed border-zinc-300 bg-white/60 p-5 text-center">
            <UserRound className="mx-auto h-6 w-6 text-zinc-400" />
            <p className="mt-2 font-medium text-ink">{t.emptyTitle}</p>
            <p className="mt-1 text-sm leading-6 text-zinc-500">
              {t.emptyDescription}
            </p>
          </div>
        )}
      </div>
    </section>
  );
}

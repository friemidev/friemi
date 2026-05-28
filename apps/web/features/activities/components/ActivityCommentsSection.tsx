import Link from "next/link";
import { MessageCircleQuestion, Pin, UserRound } from "lucide-react";
import { formatActivityDate } from "@chill-club/shared";
import { getCopy } from "@/lib/copy";
import { withLocale } from "@/lib/routes";
import type { ActivityCommentViewModel } from "../types";
import { ActivityCommentForm } from "./ActivityCommentForm";

type ActivityCommentsSectionProps = {
  activityId: string;
  comments: ActivityCommentViewModel[];
  isAuthenticated: boolean;
  locale: string;
};

function getInitial(name: string) {
  return name.trim().charAt(0).toUpperCase() || "?";
}

export function ActivityCommentsSection({
  activityId,
  comments,
  isAuthenticated,
  locale,
}: ActivityCommentsSectionProps) {
  const t = getCopy(locale).activityComments;

  return (
    <section className="rounded-lg border border-black/10 bg-white/75 p-4 sm:p-5">
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

      <div className="mt-6 grid gap-3">
        {comments.length > 0 ? (
          comments.map((comment) => (
            <article
              key={comment.id}
              className="rounded-md border border-zinc-200 bg-white/80 p-3 sm:p-4"
            >
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-zinc-100 text-sm font-semibold text-ink">
                  {comment.author.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={comment.author.avatarUrl}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span>{getInitial(comment.author.nickname)}</span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <p className="font-medium text-ink">
                      {comment.author.nickname}
                    </p>
                    <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-600">
                      {t.types[comment.type]}
                    </span>
                    {comment.pinnedByOrganizer ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-800">
                        <Pin className="h-3 w-3" />
                        {t.pinned}
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-1 text-xs text-zinc-500">
                    {formatActivityDate(comment.createdAt, locale)}
                  </p>
                  <p className="mt-3 whitespace-pre-line text-sm leading-7 text-zinc-700">
                    {comment.content}
                  </p>
                </div>
              </div>
            </article>
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

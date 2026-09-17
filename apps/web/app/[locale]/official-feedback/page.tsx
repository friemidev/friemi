import Link from "next/link";
import { ArrowLeft, MessageSquareText } from "lucide-react";
import { notFound } from "next/navigation";
import { PageContainer } from "@/components/layout/PageContainer";
import {
  getOfficialFeedbackInbox,
  markOfficialFeedbackRead,
} from "@/features/official-messages/services/officialMessages";
import { normalizeOfficialMessageReturnHref } from "@/features/official-messages/utils/officialMessageReturn";
import { UserProfilePreviewPopover } from "@/features/profile/components/UserProfilePreviewPopover";
import { ensureCurrentUserProfile } from "@/lib/auth";

export const dynamic = "force-dynamic";

function getCopy(locale: string) {
  if (locale === "fr") {
    return {
      empty: "Aucun retour utilisateur pour le moment.",
      official: "Boite de reception officielle",
      title: "Retours utilisateurs",
    };
  }

  if (locale === "en") {
    return {
      empty: "No user feedback yet.",
      official: "Official inbox",
      title: "User feedback",
    };
  }

  return {
    empty: "暂时还没有用户反馈。",
    official: "官方反馈收件箱",
    title: "用户问题反馈",
  };
}

export default async function OfficialFeedbackPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams?: Promise<{ returnTo?: string | string[] }>;
}) {
  const { locale } = await params;
  const query = await searchParams;
  const profile = await ensureCurrentUserProfile(locale, "/official-feedback");
  const feedback = await getOfficialFeedbackInbox(profile.id);

  if (!feedback) notFound();
  await markOfficialFeedbackRead(profile.id);
  const copy = getCopy(locale);
  const returnHref = normalizeOfficialMessageReturnHref(
    locale,
    query?.returnTo,
  );

  return (
    <PageContainer className="official-message-page flex max-w-xl flex-col overflow-hidden bg-white max-md:h-[100dvh] max-md:max-h-[100dvh] max-md:min-h-0 max-md:!px-0 max-md:!py-0 md:min-h-[calc(100dvh-8rem)] md:px-5 md:py-8">
      <header className="z-20 flex shrink-0 items-center gap-3 border-b border-[#E7E2D6] bg-[#FEFFF9] px-4 pb-3 pt-[calc(env(safe-area-inset-top)+0.75rem)] md:rounded-t-lg md:pt-3">
        <Link
          aria-label="Back"
          className="grid h-10 w-10 shrink-0 place-items-center rounded-full ring-1 ring-[#D6D5B2]"
          href={returnHref}
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[#156240] text-white">
          <MessageSquareText className="h-5 w-5" />
        </span>
        <span className="min-w-0 flex-1">
          <h1 className="truncate text-base font-bold text-[#111210]">
            {copy.title}
          </h1>
          <span className="text-[11px] font-semibold text-[#6C746A]">
            {copy.official}
          </span>
        </span>
      </header>

      <main className="min-h-0 flex-1 space-y-5 overflow-y-auto bg-[#F7F8F4] px-4 py-5">
        {feedback.length === 0 ? (
          <div className="grid min-h-[60dvh] place-items-center text-center text-sm font-semibold text-[#777A74]">
            {copy.empty}
          </div>
        ) : (
          feedback.map((item) => (
            <article className="flex items-end gap-2.5" key={item.id}>
              <UserProfilePreviewPopover
                avatarUrl={item.sender.avatarUrl}
                isAuthenticated
                locale={locale}
                nickname={item.sender.nickname}
                profileId={item.sender.id}
              >
                <span className="grid h-10 w-10 shrink-0 cursor-pointer place-items-center overflow-hidden rounded-full bg-[#EAF5E8] text-sm font-bold text-[#156240] ring-1 ring-[#BFD8B9]">
                  {item.sender.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      alt=""
                      className="h-full w-full object-cover"
                      src={item.sender.avatarUrl}
                    />
                  ) : (
                    item.sender.nickname.trim().slice(0, 1) || "N"
                  )}
                </span>
              </UserProfilePreviewPopover>
              <div className="max-w-[82%]">
                <div className="mb-1 flex items-center gap-2">
                  <span className="truncate text-[11px] font-bold text-[#4F574F]">
                    {item.sender.nickname}
                  </span>
                  <time className="shrink-0 text-[10px] font-semibold text-[#8F9189]">
                    {new Intl.DateTimeFormat(locale, {
                      dateStyle: "short",
                      timeStyle: "short",
                    }).format(new Date(item.createdAt))}
                  </time>
                </div>
                <p className="whitespace-pre-wrap break-words rounded-[1rem] rounded-bl-sm bg-white px-4 py-3 text-sm font-semibold leading-6 text-[#444A44] shadow-sm ring-1 ring-[#E1E4DB]">
                  {item.content}
                </p>
              </div>
            </article>
          ))
        )}
      </main>
    </PageContainer>
  );
}

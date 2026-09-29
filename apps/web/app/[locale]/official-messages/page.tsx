import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, BadgeCheck } from "lucide-react";
import { PageContainer } from "@/components/layout/PageContainer";
import { OfficialFeedbackDialog } from "@/features/official-messages/components/OfficialFeedbackDialog";
import {
  getOfficialMessagesForProfile,
  markOfficialMessagesRead,
} from "@/features/official-messages/services/officialMessages";
import { normalizeOfficialMessageReturnHref } from "@/features/official-messages/utils/officialMessageReturn";
import { ensureCurrentUserProfile } from "@/lib/auth";

export const dynamic = "force-dynamic";

function getCopy(locale: string) {
  return locale === "fr"
    ? { official: "Compte officiel", title: "Friemi officiel" }
    : locale === "en"
      ? { official: "Official account", title: "Friemi Official" }
      : { official: "官方账号", title: "Friemi 官方" };
}

export default async function OfficialMessagesPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams?: Promise<{ returnTo?: string | string[] }>;
}) {
  const { locale } = await params;
  const query = await searchParams;
  const profile = await ensureCurrentUserProfile(locale, "/official-messages");
  const messages = await getOfficialMessagesForProfile(profile.id, locale);
  await markOfficialMessagesRead(
    profile.id,
    messages.at(-1)?.publishedAt ?? null,
  );
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
        <span className="relative grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-xl bg-[#156240] text-white ring-1 ring-[#D6D5B2]">
          <Image
            alt="Friemi"
            className="h-full w-full object-cover"
            height={44}
            src="/brand/v2_1/friemi-icon-transparent-512.png"
            width={44}
          />
          <span className="absolute bottom-0 right-0 grid h-4 w-4 place-items-center rounded-full bg-white text-[#156240]">
            <BadgeCheck className="h-3 w-3" />
          </span>
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
        {messages.map((message) => (
          <article className="flex items-end gap-2.5" key={message.id}>
            <span className="grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-lg bg-[#156240] ring-1 ring-[#D6D5B2]">
              <Image
                alt=""
                className="h-full w-full object-cover"
                height={36}
                src="/brand/v2_1/friemi-icon-transparent-512.png"
                width={36}
              />
            </span>
            <div className="max-w-[82%]">
              <time className="mb-1 block text-[10px] font-semibold text-[#8F9189]">
                {new Intl.DateTimeFormat(locale, {
                  dateStyle: "medium",
                  timeStyle: "short",
                }).format(new Date(message.publishedAt))}
              </time>
              <div className="rounded-[1rem] rounded-bl-sm bg-white px-4 py-3 shadow-sm ring-1 ring-[#E1E4DB]">
                <h2 className="text-sm font-bold text-[#111210]">
                  {message.title}
                </h2>
                <p className="mt-1.5 whitespace-pre-wrap break-words text-sm font-semibold leading-6 text-[#555B54]">
                  {message.content}
                </p>
              </div>
            </div>
          </article>
        ))}
      </main>

      <footer className="z-20 shrink-0 border-t border-[#E7E2D6] bg-[#FEFFF9] px-4 pb-[calc(var(--app-mobile-nav-height)+var(--app-bottom-safe-area)+0.75rem)] pt-3 md:pb-3">
        <OfficialFeedbackDialog locale={locale} />
      </footer>
    </PageContainer>
  );
}

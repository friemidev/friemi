import Link from "next/link";
import { ArrowLeft, BadgeCheck } from "lucide-react";
import { PageContainer } from "@/components/layout/PageContainer";
import {
  getOfficialMessages,
  markOfficialMessagesRead,
} from "@/features/official-messages/services/officialMessages";
import { ensureCurrentUserProfile } from "@/lib/auth";
import { withLocale } from "@/lib/routes";

export const dynamic = "force-dynamic";

export default async function OfficialMessagesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const profile = await ensureCurrentUserProfile(locale, "/official-messages");
  const messages = await getOfficialMessages();
  await markOfficialMessagesRead(profile.id, messages[0]?.publishedAt ?? null);
  const copy =
    locale === "fr"
      ? { empty: "Aucun message officiel.", title: "Friemi officiel" }
      : locale === "en"
        ? { empty: "No official messages yet.", title: "Friemi Official" }
        : { empty: "暂时没有官方消息。", title: "Friemi 官方" };

  return (
    <PageContainer className="app-mobile-page-shell [--app-mobile-page-top-gap:1rem] [--app-mobile-page-bottom-gap:1.5rem] max-w-xl px-5 md:py-8">
      <header className="flex items-center gap-3 border-b border-[#E7E2D6] pb-4">
        <Link
          aria-label="Back"
          className="grid h-10 w-10 shrink-0 place-items-center rounded-full ring-1 ring-[#D6D5B2]"
          href={withLocale(
            locale,
            "/footprints?tab=message&chatFilter=official",
          )}
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#156240] text-white">
          <BadgeCheck className="h-5 w-5" />
        </span>
        <h1 className="min-w-0 truncate text-xl font-bold text-[#111210]">
          {copy.title}
        </h1>
      </header>

      {messages.length > 0 ? (
        <div className="divide-y divide-[#E7E2D6]">
          {messages.map((message) => (
            <article className="py-5" key={message.id}>
              <time className="text-[11px] font-semibold text-[#8F9189]">
                {new Intl.DateTimeFormat(locale, {
                  dateStyle: "medium",
                  timeStyle: "short",
                }).format(new Date(message.publishedAt))}
              </time>
              <h2 className="mt-1.5 text-base font-bold text-[#111210]">
                {message.title}
              </h2>
              <p className="mt-2 whitespace-pre-wrap break-words text-sm font-semibold leading-6 text-[#555B54]">
                {message.content}
              </p>
            </article>
          ))}
        </div>
      ) : (
        <p className="py-12 text-center text-sm font-semibold text-[#777A74]">
          {copy.empty}
        </p>
      )}
    </PageContainer>
  );
}

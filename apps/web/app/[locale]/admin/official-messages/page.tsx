import { PageContainer } from "@/components/layout/PageContainer";
import { OfficialMessageComposer } from "@/features/official-messages/components/OfficialMessageComposer";
import { getOfficialMessages } from "@/features/official-messages/services/officialMessages";
import { requireAdminPageAccess } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

export default async function AdminOfficialMessagesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  await requireAdminPageAccess(locale, "/admin/official-messages");
  const messages = await getOfficialMessages();
  const title =
    locale === "fr"
      ? "Messages officiels"
      : locale === "en"
        ? "Official messages"
        : "官方消息";

  return (
    <PageContainer className="space-y-6 pb-28 md:max-w-3xl md:pb-12 md:pt-10">
      <header>
        <p className="text-xs font-semibold text-[#156240]">Friemi Admin</p>
        <h1 className="mt-2 text-3xl font-bold text-[#111210]">{title}</h1>
      </header>
      <OfficialMessageComposer locale={locale} />
      <section className="divide-y divide-[#E7E2D6] border-y border-[#E7E2D6]">
        {messages.map((message) => (
          <article className="py-4" key={message.id}>
            <div className="flex items-start justify-between gap-4">
              <h2 className="text-sm font-bold text-[#111210]">
                {message.title}
              </h2>
              <time className="shrink-0 text-[11px] font-semibold text-[#8F9189]">
                {new Intl.DateTimeFormat(locale, {
                  dateStyle: "short",
                  timeStyle: "short",
                }).format(new Date(message.publishedAt))}
              </time>
            </div>
            <p className="mt-2 whitespace-pre-wrap text-sm font-semibold leading-6 text-[#5F635E]">
              {message.content}
            </p>
          </article>
        ))}
      </section>
    </PageContainer>
  );
}

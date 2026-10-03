import Link from "next/link";
import { ArrowLeft, Plus } from "lucide-react";
import { ensureCurrentUserProfile } from "@/lib/auth";
import { withLocale } from "@/lib/routes";
import { buildNoIndexMetadata } from "@/lib/seo";
import { getNowCopy } from "@/features/now/now";
import { getMyNowInvites } from "@/features/now/queries";
import { NowInviteRow } from "@/features/now/NowInviteRow";

type PageProps = { params: Promise<{ locale: string }> };
export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: PageProps) {
  const { locale } = await params;
  return buildNoIndexMetadata({
    canonicalPath: withLocale(locale, "/now/mine"),
  });
}

export default async function MyNowPage({ params }: PageProps) {
  const { locale } = await params;
  const profile = await ensureCurrentUserProfile(locale, "/now/mine");
  const { created, interested } = await getMyNowInvites(profile.id);
  const copy = getNowCopy(locale);
  return (
    <main className="app-mobile-page-shell min-h-svh bg-[#FAFCF9] px-5 pb-28 pt-5 text-[#143D32]">
      <div className="mx-auto max-w-[640px]">
        <div className="flex items-center justify-between">
          <Link
            href={withLocale(locale, "/mobile-home")}
            className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-full bg-white text-[#1E6248] shadow-sm"
            aria-label="Back"
          >
            <ArrowLeft size={20} />
          </Link>
          <Link
            href={withLocale(locale, "/now/new")}
            className="inline-flex min-h-11 items-center gap-1 text-[13px] font-bold text-[#1E7353]"
          >
            <Plus size={16} />
            {copy.create}
          </Link>
        </div>
        <h1 className="mt-4 text-[27px] font-bold">{copy.mine}</h1>
        <section className="mt-7">
          <h2 className="mb-3 text-[17px] font-bold">{copy.myCreated}</h2>
          {created.length ? (
            <div className="grid gap-3">
              {created.map((invite) => (
                <NowInviteRow invite={invite} key={invite.id} locale={locale} />
              ))}
            </div>
          ) : (
            <p className="rounded-2xl bg-white px-5 py-6 text-[13px] text-[#728175]">
              {copy.noCreated}
            </p>
          )}
        </section>
        <section className="mt-8">
          <h2 className="mb-3 text-[17px] font-bold">{copy.myInterested}</h2>
          {interested.length ? (
            <div className="grid gap-3">
              {interested.map((invite) => (
                <NowInviteRow invite={invite} key={invite.id} locale={locale} />
              ))}
            </div>
          ) : (
            <p className="rounded-2xl bg-white px-5 py-6 text-[13px] text-[#728175]">
              {copy.noInterested}
            </p>
          )}
        </section>
      </div>
    </main>
  );
}

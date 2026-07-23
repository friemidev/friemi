import { Orbit } from "lucide-react";
import { joinPlanetByInviteAction } from "@/features/planets/actions/planetActions";

type PlanetInvitePageProps = {
  params: Promise<{ inviteCode: string; locale: string }>;
};

const copy = {
  "zh-CN": {
    title: "星球邀请",
    body: "你收到了一个星球邀请。提交申请后，需要创建人审核通过，才能正式加入并看到群聊。",
    action: "申请加入星球",
  },
  en: {
    title: "Planet invite",
    body: "You received a planet invite. After you send the request, the creator must approve it before you can join and view the chat.",
    action: "Request to join",
  },
  fr: {
    title: "Invitation planète",
    body: "Vous avez reçu une invitation. Après votre demande, le créateur doit l'approuver avant que vous puissiez rejoindre et voir le chat.",
    action: "Demander à rejoindre",
  },
} as const;

export default async function PlanetInvitePage({ params }: PlanetInvitePageProps) {
  const { inviteCode, locale } = await params;
  const t = locale === "en" || locale === "fr" ? copy[locale] : copy["zh-CN"];

  return (
    <main className="flex min-h-[100svh] items-center justify-center bg-[#f6f1ea] px-4 text-[#151713]">
      <section className="w-full max-w-sm rounded-3xl bg-[#fffefb] p-7 text-center shadow-xl">
        <Orbit className="mx-auto h-12 w-12 text-[#246c4b]" />
        <h1 className="mt-3 text-xl font-black">{t.title}</h1>
        <p className="mt-2 text-sm leading-6 text-[#718075]">{t.body}</p>
        <form action={joinPlanetByInviteAction} className="mt-6">
          <input name="locale" type="hidden" value={locale} />
          <input name="inviteCode" type="hidden" value={inviteCode} />
          <button className="w-full rounded-xl bg-[#246c4b] py-3 font-black text-white">{t.action}</button>
        </form>
      </section>
    </main>
  );
}

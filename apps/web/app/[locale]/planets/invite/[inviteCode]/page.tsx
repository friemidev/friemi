import { Orbit } from "lucide-react";
import { joinPlanetByInviteAction } from "@/features/planets/actions/planetActions";

type PlanetInvitePageProps = {
  params: Promise<{ inviteCode: string; locale: string }>;
};

export default async function PlanetInvitePage({ params }: PlanetInvitePageProps) {
  const { inviteCode, locale } = await params;

  return (
    <main className="flex min-h-[100svh] items-center justify-center bg-[#f6f1ea] px-4 text-[#151713]">
      <section className="w-full max-w-sm rounded-3xl bg-[#fffefb] p-7 text-center shadow-xl">
        <Orbit className="mx-auto h-12 w-12 text-[#246c4b]" />
        <h1 className="mt-3 text-xl font-black">星球邀请</h1>
        <p className="mt-2 text-sm leading-6 text-[#718075]">你收到了一个私密星球的邀请。确认后即可加入并查看星球内容。</p>
        <form action={joinPlanetByInviteAction} className="mt-6">
          <input name="locale" type="hidden" value={locale} />
          <input name="inviteCode" type="hidden" value={inviteCode} />
          <button className="w-full rounded-xl bg-[#246c4b] py-3 font-black text-white">加入星球</button>
        </form>
      </section>
    </main>
  );
}

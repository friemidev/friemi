import { notFound } from "next/navigation";
import { BrandLockup } from "@/components/brand/BrandLockup";
import {
  NowBubbleField,
  type NowBubbleItem,
} from "@/features/now/NowBubbleField";

export default async function NowPreview({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  if (process.env.NODE_ENV !== "development") notFound();
  const { locale } = await params;
  const now = Date.now();
  const samples: Omit<NowBubbleItem, "createdAt" | "expiresAt" | "avatars">[] =
    [
      {
        id: "preview-coffee",
        category: "COFFEE",
        title: "喝杯咖啡",
        area: "Bastille",
        interestCount: 2,
        size: "medium",
      },
      {
        id: "preview-drink",
        category: "DRINK",
        title: "喝一杯",
        area: "Le Marais",
        interestCount: 3,
        size: "large",
      },
      {
        id: "preview-movie",
        category: "MOVIE",
        title: "看电影",
        area: "Opéra",
        interestCount: 1,
        size: "small",
      },
      {
        id: "preview-park",
        category: "PARK",
        title: "逛公园",
        area: "Luxembourg",
        interestCount: 2,
        size: "medium",
      },
      {
        id: "preview-game",
        category: "GAME",
        title: "来局桌游",
        area: "République",
        interestCount: 2,
        size: "medium",
      },
      {
        id: "preview-walk",
        category: "WALK",
        title: "City walk",
        area: "Saint-Michel",
        interestCount: 0,
        size: "small",
      },
      {
        id: "preview-tea",
        category: "TEA",
        title: "下午茶",
        area: "Canal",
        interestCount: 1,
        size: "small",
      },
    ];
  const invites = samples.map((sample, index) => ({
    ...sample,
    avatars: [
      { name: "Camille", url: null },
      { name: "Alex", url: null },
      ...(index % 2 === 0 ? [{ name: "Léa", url: null }] : []),
    ],
    createdAt: new Date(now - 2 * 3_600_000).toISOString(),
    expiresAt: new Date(now + (index + 1) * 38 * 60_000).toISOString(),
  }));
  return (
    <main className="min-h-svh bg-white pt-6 text-[#143D32]">
      <div className="mx-auto max-w-[430px] pl-5">
        <div className="mb-7 pr-5">
          <BrandLockup className="h-9 w-[7.55rem]" size="md" />
          <p className="mt-4 text-[11px] font-semibold text-[#758679]">
            开发预览 · 示例内容
          </p>
          <h1 className="mt-3 text-[27px] font-bold">Hey/嗨，皇室公主</h1>
        </div>
        <NowBubbleField
          initialNow={now}
          invites={invites}
          locale={locale}
          preview
        />
        <div className="mt-8 pr-5">
          <h2 className="text-[17px] font-bold">聚吧分类</h2>
          <div className="mt-3 flex justify-between rounded-2xl bg-[#F7FBF7] p-5 text-center text-[12px]">
            <span>
              🎲
              <br />
              桌游
            </span>
            <span>
              🧳
              <br />
              旅行
            </span>
            <span>
              🎨
              <br />
              艺术
            </span>
          </div>
        </div>
      </div>
    </main>
  );
}

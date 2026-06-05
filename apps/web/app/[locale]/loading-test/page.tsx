import { PageContainer } from "@/components/layout/PageContainer";
import { BrandLoader, getLoadingLabel } from "@/components/ui/BrandLoader";

type LoadingTestPageProps = {
  params: Promise<{
    locale: string;
  }>;
};

export default async function LoadingTestPage({ params }: LoadingTestPageProps) {
  const { locale } = await params;
  const loadingLabel = getLoadingLabel(locale);

  return (
    <PageContainer className="max-w-5xl pb-16 pt-10">
      <section className="space-y-7">
        <div className="max-w-2xl space-y-3">
          <p className="text-sm font-medium text-[#48623d]">Loading test</p>
          <h1 className="text-3xl font-bold text-zinc-950 sm:text-4xl">
            品牌加载动效测试
          </h1>
          <p className="text-base leading-7 text-zinc-600">
            使用透明 logo 和平滑加载环。重点检查循环是否自然、图标是否清楚、背景是否干净。
          </p>
        </div>

        <div className="grid gap-4 lg:grid-cols-[1.35fr_0.65fr]">
          <div className="flex min-h-[22rem] items-center justify-center rounded-lg border border-zinc-200/80 bg-white/72 px-6 py-10 shadow-sm">
            <BrandLoader label={loadingLabel} size="lg" showLabel />
          </div>

          <div className="grid gap-4">
            <div className="flex items-center justify-between rounded-lg border border-zinc-200/80 bg-[#f8f1e3] px-6 py-5 shadow-sm">
              <div>
                <p className="text-sm font-semibold text-zinc-950">浅色背景</p>
                <p className="mt-1 text-sm text-zinc-500">检查是否有白边或底色残留。</p>
              </div>
              <BrandLoader label={loadingLabel} size="sm" />
            </div>

            <div className="flex items-center justify-between rounded-lg border border-[#d8e6d6] bg-[#ecf4ee] px-6 py-5 shadow-sm">
              <div>
                <p className="text-sm font-semibold text-zinc-950">绿色背景</p>
                <p className="mt-1 text-sm text-zinc-500">检查透明帧是否干净。</p>
              </div>
              <BrandLoader label={loadingLabel} size="sm" />
            </div>

            <div className="flex items-center justify-between rounded-lg bg-zinc-950 px-6 py-5 text-white shadow-sm">
              <div>
                <p className="text-sm font-semibold">深色背景</p>
                <p className="mt-1 text-sm text-white/60">检查 logo 是否清晰。</p>
              </div>
              <BrandLoader label={loadingLabel} size="sm" />
            </div>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          {(["sm", "md", "lg"] as const).map((size) => (
            <div
              key={size}
              className="flex min-h-48 flex-col items-center justify-center gap-4 rounded-lg border border-zinc-200/80 bg-white/70 p-6 shadow-sm"
            >
              <BrandLoader label={loadingLabel} size={size} showLabel={size === "lg"} />
              <span className="text-sm font-medium uppercase text-zinc-500">
                {size}
              </span>
            </div>
          ))}
        </div>
      </section>
    </PageContainer>
  );
}

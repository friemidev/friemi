import { PageContainer } from "@/components/layout/PageContainer";
import { LocalizedBrandLoader } from "@/components/ui/LocalizedBrandLoader";

function ActivityCardSkeleton({ index }: { index: number }) {
  return (
    <div
      className="overflow-hidden rounded-lg border border-black/10 bg-white/80 shadow-sm"
      style={{ animationDelay: `${index * 70}ms` }}
    >
      <div className="h-36 animate-pulse bg-[#dbe8ec]" />
      <div className="space-y-3 p-4">
        <div className="h-5 w-4/5 animate-pulse rounded bg-zinc-100" />
        <div className="h-5 w-3/5 animate-pulse rounded bg-zinc-100" />
        <div className="space-y-2 pt-1">
          <div className="h-4 w-32 animate-pulse rounded bg-zinc-100" />
          <div className="h-4 w-24 animate-pulse rounded bg-zinc-100" />
        </div>
      </div>
    </div>
  );
}

export default function ActivitiesLoading() {
  return (
    <PageContainer className="space-y-5 py-5 sm:space-y-6 sm:py-8">
      <div className="flex justify-center py-2">
        <LocalizedBrandLoader size="sm" showLabel />
      </div>
      <div className="rounded-[2rem] border border-[#ded2bc] bg-white/60 px-5 py-7 text-center shadow-[0_12px_28px_rgba(99,78,48,0.05)] sm:px-8 sm:py-9">
        <div className="mx-auto h-10 w-44 animate-pulse rounded bg-white/80" />
        <div className="mx-auto mt-4 h-5 w-full max-w-xl animate-pulse rounded bg-white/70" />
        <div className="mx-auto mt-2 h-5 w-2/3 max-w-md animate-pulse rounded bg-white/70" />
      </div>
      <div className="rounded-xl border border-black/10 bg-white/75 p-3 shadow-sm">
        <div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_repeat(4,10rem)]">
          <div className="h-11 animate-pulse rounded-lg bg-zinc-100" />
          {[0, 1, 2, 3].map((item) => (
            <div
              key={item}
              className="hidden h-11 animate-pulse rounded-lg bg-zinc-100 md:block"
            />
          ))}
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {[0, 1, 2, 3, 4].map((item) => (
          <ActivityCardSkeleton key={item} index={item} />
        ))}
      </div>
    </PageContainer>
  );
}

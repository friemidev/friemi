import {
  LoadingPageShell,
  ShimmerBlock,
} from "@/components/ui/LoadingState";

function HomeCardSkeleton({ index }: { index: number }) {
  return (
    <div
      className="overflow-hidden rounded-lg border border-black/10 bg-white/72 shadow-sm"
      style={{ animationDelay: `${index * 55}ms` }}
    >
      <ShimmerBlock className="h-24 rounded-none sm:h-36" delay={index * 45} />
      <div className="space-y-2 p-3 sm:p-4">
        <ShimmerBlock className="h-5 w-4/5" delay={index * 45 + 60} />
        <ShimmerBlock className="h-4 w-full" delay={index * 45 + 100} />
        <ShimmerBlock className="h-4 w-2/3" delay={index * 45 + 140} />
      </div>
    </div>
  );
}

export default function HomeLoading() {
  return (
    <LoadingPageShell className="space-y-9 pb-6 md:space-y-12">
      <section className="py-3 md:py-10">
        <div className="max-w-3xl space-y-5">
          <ShimmerBlock className="h-7 w-36 rounded-full bg-white/75 ring-1 ring-black/10" />
          <div className="space-y-3 sm:space-y-4">
            <ShimmerBlock className="h-12 w-56 rounded-lg sm:h-16 sm:w-72" delay={60} />
            <ShimmerBlock className="h-7 w-48 rounded-lg sm:h-8 sm:w-64" delay={120} />
            <ShimmerBlock className="h-5 w-full max-w-xl rounded-md" delay={180} />
            <ShimmerBlock className="h-5 w-4/5 max-w-lg rounded-md" delay={220} />
          </div>
          <div className="grid max-w-[30rem] grid-cols-2 gap-2 pt-2 sm:gap-3">
            <ShimmerBlock className="h-14 rounded-2xl bg-white/70" delay={260} />
            <ShimmerBlock className="h-14 rounded-2xl bg-white/70" delay={300} />
          </div>
        </div>
      </section>

      <section className="space-y-3 sm:space-y-4">
        <div className="flex items-end justify-between gap-4 border-t border-sand pt-5 sm:pt-6">
          <div className="min-w-0 space-y-2">
            <ShimmerBlock className="h-8 w-36 rounded-md" delay={100} />
            <ShimmerBlock className="h-4 w-72 max-w-full rounded-md" delay={160} />
          </div>
          <ShimmerBlock className="hidden h-9 w-20 rounded-full sm:block" delay={200} />
        </div>
        <div className="grid gap-3 min-[380px]:grid-cols-2 sm:gap-4 lg:grid-cols-4">
          {[0, 1, 2, 3].map((item) => (
            <HomeCardSkeleton key={item} index={item} />
          ))}
        </div>
      </section>
    </LoadingPageShell>
  );
}

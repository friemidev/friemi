import {
  LoadingCardSkeleton,
  LoadingPageShell,
  ShimmerBlock,
} from "@/components/ui/LoadingState";

export default function ActivitiesLoading() {
  return (
    <LoadingPageShell className="space-y-5 py-5 sm:space-y-6 sm:py-8">
      <section className="space-y-3">
        <div className="hidden items-center justify-between gap-3 px-1 md:flex">
          <div className="flex min-w-0 items-center gap-2">
            <ShimmerBlock className="h-8 w-8 shrink-0 rounded-full" />
            <div className="space-y-2">
              <ShimmerBlock className="h-4 w-24 rounded-md" />
              <ShimmerBlock className="hidden h-3 w-80 rounded-md md:block" />
            </div>
          </div>
          <ShimmerBlock className="h-8 w-20 rounded-full" />
        </div>
        <div className="rounded-[1.25rem] bg-white/62 p-3 shadow-sm ring-1 ring-[#8AB68E] md:hidden">
          <div className="flex h-12 items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2">
              <ShimmerBlock className="h-4 w-4 shrink-0 rounded-full" />
              <ShimmerBlock className="h-4 w-24 rounded-md" />
            </div>
            <ShimmerBlock className="h-7 w-20 shrink-0 rounded-full" />
          </div>
        </div>
        <div className="hidden rounded-[1.25rem] bg-white/62 p-3 shadow-sm ring-1 ring-[#8AB68E] md:block">
          <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_6rem_6rem]">
            <ShimmerBlock className="h-11 rounded-xl sm:h-10" />
            <ShimmerBlock className="h-11 rounded-xl sm:h-10" delay={45} />
            <ShimmerBlock className="h-11 rounded-xl sm:h-10" delay={90} />
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-5">
            {[0, 1, 2, 3, 4].map((item) => (
              <ShimmerBlock
                key={item}
                className="h-10 rounded-xl"
                delay={item * 45}
              />
            ))}
          </div>
        </div>
      </section>
      <div className="activity-card-grid-shell">
        <div className="activity-card-grid">
          {[0, 1, 2, 3, 4].map((item) => (
            <LoadingCardSkeleton key={item} compact delay={item * 70} />
          ))}
        </div>
      </div>
    </LoadingPageShell>
  );
}

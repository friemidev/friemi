import {
  LoadingPageShell,
  ShimmerBlock,
} from "@/components/ui/LoadingState";

function NotificationSkeleton({ index }: { index: number }) {
  return (
    <article
      className="flex gap-3 rounded-[1rem] border border-sand bg-white/68 px-3 py-3 sm:px-4 sm:py-3.5"
      style={{ animationDelay: `${index * 60}ms` }}
    >
      <ShimmerBlock className="h-9 w-9 shrink-0 rounded-full" delay={index * 45} />
      <div className="min-w-0 flex-1 space-y-2.5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1 space-y-2">
            <ShimmerBlock className="h-5 w-16 rounded-full" delay={index * 45 + 20} />
            <ShimmerBlock className="h-5 w-36" delay={index * 45 + 40} />
            <ShimmerBlock
              className="h-4 w-full max-w-md"
              delay={index * 45 + 80}
            />
          </div>
          <ShimmerBlock className="h-3 w-20" delay={index * 45 + 120} />
        </div>
        <ShimmerBlock className="h-8 w-28 rounded-full" delay={index * 45 + 160} />
      </div>
    </article>
  );
}

export default function NotificationsLoading() {
  return (
    <LoadingPageShell className="space-y-5 pb-24">
      <section className="space-y-4 border-b border-[#EEEDE4] pb-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1 space-y-3">
            <ShimmerBlock className="h-5 w-32 rounded-full" />
            <ShimmerBlock className="h-10 w-44 rounded-xl" delay={60} />
            <ShimmerBlock className="h-4 w-full max-w-md" delay={100} />
          </div>
          <ShimmerBlock className="h-9 w-9 rounded-full" delay={80} />
        </div>
        <div className="flex flex-wrap gap-2">
          <ShimmerBlock className="h-7 w-20 rounded-full" delay={120} />
          <ShimmerBlock className="h-7 w-24 rounded-full" delay={160} />
          <ShimmerBlock className="h-7 w-20 rounded-full" delay={200} />
        </div>
        <div className="-mx-4 flex gap-2 overflow-hidden px-4">
          {[0, 1, 2, 3, 4].map((item) => (
            <ShimmerBlock
              key={item}
              className="h-10 w-20 shrink-0 rounded-full"
              delay={220 + item * 35}
            />
          ))}
        </div>
      </section>

      <section className="grid gap-2.5">
        {[0, 1, 2, 3].map((item) => (
          <NotificationSkeleton key={item} index={item} />
        ))}
      </section>
    </LoadingPageShell>
  );
}

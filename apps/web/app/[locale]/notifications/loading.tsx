import {
  LoadingPageShell,
  ShimmerBlock,
} from "@/components/ui/LoadingState";

function NotificationSkeleton({ index }: { index: number }) {
  return (
    <article
      className="flex gap-3 rounded-lg border border-black/10 bg-white/70 p-4 shadow-sm sm:p-5"
      style={{ animationDelay: `${index * 60}ms` }}
    >
      <ShimmerBlock className="h-8 w-8 shrink-0 rounded-full" delay={index * 45} />
      <div className="min-w-0 flex-1 space-y-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-2">
            <ShimmerBlock className="h-5 w-36" delay={index * 45 + 40} />
            <ShimmerBlock
              className="h-4 w-full max-w-md"
              delay={index * 45 + 80}
            />
          </div>
          <ShimmerBlock className="h-3 w-20" delay={index * 45 + 120} />
        </div>
        <ShimmerBlock className="h-9 w-28 rounded-full" delay={index * 45 + 160} />
      </div>
    </article>
  );
}

export default function NotificationsLoading() {
  return (
    <LoadingPageShell className="space-y-6">
      <section className="flex flex-col gap-4 rounded-lg border border-black/10 bg-white/75 p-4 shadow-sm sm:flex-row sm:items-start sm:justify-between sm:p-5">
        <div className="min-w-0 space-y-3">
          <ShimmerBlock className="h-8 w-36" />
          <ShimmerBlock className="h-4 w-full max-w-md" delay={60} />
        </div>
        <ShimmerBlock className="h-10 w-full rounded-full sm:w-28" delay={100} />
      </section>

      <section className="grid gap-3">
        {[0, 1, 2, 3].map((item) => (
          <NotificationSkeleton key={item} index={item} />
        ))}
      </section>
    </LoadingPageShell>
  );
}

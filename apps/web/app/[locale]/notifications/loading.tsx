import {
  LoadingPageShell,
  ShimmerBlock,
} from "@/components/ui/LoadingState";

function NotificationSkeleton({ index }: { index: number }) {
  return (
    <article
      className="flex gap-3 rounded-[1.2rem] border border-sand bg-paper/68 p-4 shadow-[0_12px_30px_rgba(21,98,64,0.055)] sm:p-5"
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
    <LoadingPageShell className="space-y-6 pb-24">
      <section className="relative overflow-hidden rounded-[1.65rem] border border-sand bg-paper/82 p-4 shadow-[0_20px_56px_rgba(21,98,64,0.075)] sm:p-5">
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -right-8 -top-16 h-36 w-36 rounded-full bg-rose/34 blur-3xl"
        />
        <div className="min-w-0 space-y-3">
          <ShimmerBlock className="h-7 w-32 rounded-full" />
          <ShimmerBlock className="h-9 w-40 rounded-xl" delay={60} />
          <ShimmerBlock className="h-4 w-full max-w-md" delay={100} />
        </div>
        <div className="mt-4 grid grid-cols-3 gap-2 sm:max-w-md">
          <ShimmerBlock className="h-16 rounded-[1rem]" delay={120} />
          <ShimmerBlock className="h-16 rounded-[1rem]" delay={160} />
          <ShimmerBlock className="h-16 rounded-[1rem]" delay={200} />
        </div>
      </section>

      <section className="grid gap-3">
        {[0, 1, 2, 3].map((item) => (
          <NotificationSkeleton key={item} index={item} />
        ))}
      </section>
    </LoadingPageShell>
  );
}

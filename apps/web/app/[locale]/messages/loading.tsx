import {
  LoadingPageShell,
  LoadingRowSkeleton,
  ShimmerBlock,
} from "@/components/ui/LoadingState";

export default function MessagesLoading() {
  return (
    <LoadingPageShell
      className="space-y-5 lg:grid lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start lg:gap-5 lg:space-y-0"
      loaderClassName="lg:col-span-2"
    >
      <section className="min-h-[30rem] rounded-[1.25rem] border border-black/10 bg-white/70 shadow-sm">
        <div className="flex items-center gap-3 border-b border-black/10 p-4">
          <ShimmerBlock className="h-11 w-11 rounded-full" />
          <div className="space-y-2">
            <ShimmerBlock className="h-5 w-36" />
            <ShimmerBlock className="h-3 w-24" delay={60} />
          </div>
        </div>
        <div className="flex min-h-[18rem] items-center justify-center">
          <div className="w-full max-w-sm space-y-3 px-4">
            <ShimmerBlock className="ml-auto h-10 w-3/4 rounded-2xl" />
            <ShimmerBlock className="h-10 w-2/3 rounded-2xl" delay={70} />
            <ShimmerBlock className="ml-auto h-10 w-1/2 rounded-2xl" delay={140} />
          </div>
        </div>
        <div className="border-t border-black/10 p-4">
          <ShimmerBlock className="h-12 rounded-xl" />
        </div>
      </section>

      <aside className="space-y-3 rounded-[1.25rem] border border-black/10 bg-white/65 p-4 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div className="space-y-2">
            <ShimmerBlock className="h-5 w-24" />
            <ShimmerBlock className="h-3 w-32" delay={60} />
          </div>
          <ShimmerBlock className="h-10 w-10 rounded-full" />
        </div>
        {[0, 1, 2, 3].map((item) => (
          <LoadingRowSkeleton key={item} avatar="circle" delay={item * 55} />
        ))}
      </aside>
    </LoadingPageShell>
  );
}

import {
  LoadingPageShell,
  ShimmerBlock,
} from "@/components/ui/LoadingState";

export default function ActivityDetailLoading() {
  return (
    <LoadingPageShell className="space-y-6">
      <div className="relative flex min-h-52 items-end overflow-hidden rounded-[1.25rem] border border-black/10 bg-[#dbe8ec] p-4 shadow-[0_16px_36px_rgba(58,49,34,0.08)] sm:p-5 md:min-h-72">
        <ShimmerBlock className="absolute inset-0 rounded-none" />
        <div className="relative w-full max-w-3xl space-y-3 rounded-[1.15rem] bg-white/35 p-3 ring-1 ring-white/30 backdrop-blur-sm sm:p-4">
          <ShimmerBlock className="h-7 w-24 rounded-full bg-white/75" />
          <ShimmerBlock className="h-10 w-5/6 bg-white/80" delay={60} />
          <ShimmerBlock className="h-10 w-3/5 bg-white/75" delay={120} />
        </div>
      </div>

      <section className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <article className="space-y-4">
          <div className="rounded-lg border border-black/10 bg-white/70 p-5">
            <div className="space-y-3">
              {[0, 1, 2, 3, 4].map((item) => (
                <ShimmerBlock
                  key={item}
                  className="h-4"
                  delay={item * 45}
                />
              ))}
            </div>
          </div>
          <ShimmerBlock className="h-44 rounded-lg border border-black/10 bg-white/60" />
        </article>

        <aside className="space-y-4 rounded-[1.25rem] border border-black/10 bg-white/80 p-4 shadow-sm sm:p-5">
          {[0, 1, 2, 3, 4].map((item) => (
            <div key={item} className="flex items-center gap-3">
              <ShimmerBlock className="h-5 w-5" delay={item * 45} />
              <ShimmerBlock className="h-5 flex-1" delay={item * 45 + 40} />
            </div>
          ))}
          <ShimmerBlock className="h-11 rounded-full" delay={240} />
        </aside>
      </section>
    </LoadingPageShell>
  );
}

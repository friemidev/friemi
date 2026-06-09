import {
  LoadingPageShell,
  LoadingRowSkeleton,
  LoadingSectionHeader,
  ShimmerBlock,
} from "@/components/ui/LoadingState";

export default function LobbyLoading() {
  return (
    <LoadingPageShell className="space-y-6 py-5 sm:space-y-8 sm:py-8">
      <div className="max-w-md">
        <ShimmerBlock className="h-14 rounded-full border border-[#dccba8] bg-white/70" />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        {[0, 1, 2, 3].map((section) => (
          <section
            key={section}
            className="space-y-3 rounded-[1.25rem] border border-black/10 bg-white/65 p-4 shadow-sm"
          >
            <LoadingSectionHeader />
            {[0, 1, 2].map((item) => (
              <LoadingRowSkeleton
                key={item}
                action
                delay={section * 60 + item * 45}
              />
            ))}
          </section>
        ))}
      </div>
    </LoadingPageShell>
  );
}

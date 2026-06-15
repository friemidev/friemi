import {
  LoadingCardSkeleton,
  LoadingPageShell,
  LoadingToolbarSkeleton,
  ShimmerBlock,
} from "@/components/ui/LoadingState";

export default function LobbyLoading() {
  return (
    <LoadingPageShell className="space-y-6 py-5 sm:space-y-8 sm:py-8">
      <div className="max-w-md">
        <ShimmerBlock className="h-14 rounded-full border border-[#dccba8] bg-white/70" />
      </div>
      <LoadingToolbarSkeleton columns={4} />
      <div className="grid gap-3 min-[380px]:grid-cols-2 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4">
        {[0, 1, 2, 3, 4, 5].map((item) => (
          <LoadingCardSkeleton key={item} compact delay={item * 60} />
        ))}
      </div>
    </LoadingPageShell>
  );
}

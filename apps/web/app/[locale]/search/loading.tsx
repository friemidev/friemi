import { Search } from "lucide-react";
import {
  LoadingPageShell,
  ShimmerBlock,
} from "@/components/ui/LoadingState";

export default function SearchLoading() {
  return (
    <LoadingPageShell className="space-y-6 py-5 sm:py-8">
      <div className="space-y-4">
        <div className="space-y-3">
          <ShimmerBlock className="h-7 w-28 rounded-full bg-white/75 ring-1 ring-black/10" />
          <ShimmerBlock className="h-9 w-56 rounded-md bg-white/70" delay={60} />
          <ShimmerBlock
            className="h-5 w-full max-w-md rounded-md bg-white/60"
            delay={120}
          />
        </div>
        <div className="flex h-12 items-center gap-3 rounded-full border border-black/10 bg-white/85 px-4 shadow-sm">
          <Search className="h-4 w-4 text-zinc-300" aria-hidden="true" />
          <ShimmerBlock className="h-4 flex-1" />
        </div>
      </div>

      <div className="space-y-3">
        <ShimmerBlock className="h-12 rounded-lg border border-black/10 bg-white/70" />
        <div className="grid gap-3 lg:grid-cols-2">
          {[0, 1, 2, 3].map((item) => (
            <ShimmerBlock
              key={item}
              className="h-24 rounded-lg border border-black/10 bg-white/75 shadow-sm"
              delay={item * 50}
            />
          ))}
        </div>
      </div>
    </LoadingPageShell>
  );
}

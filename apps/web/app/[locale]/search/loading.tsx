import { Search } from "lucide-react";
import { PageContainer } from "@/components/layout/PageContainer";
import { LocalizedBrandLoader } from "@/components/ui/LocalizedBrandLoader";

export default function SearchLoading() {
  return (
    <PageContainer className="space-y-6 py-5 sm:py-8">
      <div className="space-y-4">
        <div className="flex justify-center py-2">
          <LocalizedBrandLoader size="sm" showLabel />
        </div>
        <div className="space-y-3">
          <span className="inline-flex h-7 w-28 animate-pulse rounded-full bg-white/75 ring-1 ring-black/10" />
          <div className="h-9 w-56 animate-pulse rounded-md bg-white/70" />
          <div className="h-5 w-full max-w-md animate-pulse rounded-md bg-white/60" />
        </div>
        <div className="flex h-12 items-center gap-3 rounded-full border border-black/10 bg-white/85 px-4 shadow-sm">
          <Search className="h-4 w-4 text-zinc-300" aria-hidden="true" />
          <div className="h-4 flex-1 animate-pulse rounded bg-zinc-100" />
        </div>
      </div>

      <div className="space-y-3">
        <div className="h-12 animate-pulse rounded-lg border border-black/10 bg-white/70" />
        <div className="grid gap-3 lg:grid-cols-2">
          {[0, 1, 2, 3].map((item) => (
            <div
              key={item}
              className="h-24 animate-pulse rounded-lg border border-black/10 bg-white/75 shadow-sm"
            />
          ))}
        </div>
      </div>
    </PageContainer>
  );
}

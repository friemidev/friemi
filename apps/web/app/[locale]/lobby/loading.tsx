import { PageContainer } from "@/components/layout/PageContainer";
import { LocalizedBrandLoader } from "@/components/ui/LocalizedBrandLoader";

function LobbyRowSkeleton() {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-black/10 bg-white/78 p-3 shadow-sm">
      <div className="h-14 w-14 shrink-0 animate-pulse rounded-lg bg-[#dbe8ec]" />
      <div className="min-w-0 flex-1 space-y-2">
        <div className="h-4 w-4/5 animate-pulse rounded bg-zinc-100" />
        <div className="h-3 w-2/3 animate-pulse rounded bg-zinc-100" />
      </div>
      <div className="hidden h-8 w-20 animate-pulse rounded-full bg-zinc-100 sm:block" />
    </div>
  );
}

export default function LobbyLoading() {
  return (
    <PageContainer className="space-y-6 py-5 sm:space-y-8 sm:py-8">
      <div className="flex justify-center py-2">
        <LocalizedBrandLoader size="sm" showLabel />
      </div>
      <div className="max-w-md">
        <div className="h-14 animate-pulse rounded-full border border-[#dccba8] bg-white/70" />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        {[0, 1, 2, 3].map((section) => (
          <section
            key={section}
            className="space-y-3 rounded-[1.25rem] border border-black/10 bg-white/65 p-4 shadow-sm"
          >
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 animate-pulse rounded-full bg-zinc-100" />
              <div className="space-y-2">
                <div className="h-5 w-28 animate-pulse rounded bg-zinc-100" />
                <div className="h-3 w-40 animate-pulse rounded bg-zinc-100" />
              </div>
            </div>
            {[0, 1, 2].map((item) => (
              <LobbyRowSkeleton key={item} />
            ))}
          </section>
        ))}
      </div>
    </PageContainer>
  );
}

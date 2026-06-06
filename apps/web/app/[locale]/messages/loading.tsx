import { PageContainer } from "@/components/layout/PageContainer";
import { LocalizedBrandLoader } from "@/components/ui/LocalizedBrandLoader";

function FriendRowSkeleton() {
  return (
    <div className="flex items-center gap-3 rounded-xl bg-white/80 p-3 ring-1 ring-black/10">
      <div className="h-11 w-11 shrink-0 animate-pulse rounded-full bg-[#dbe8ec]" />
      <div className="min-w-0 flex-1 space-y-2">
        <div className="h-4 w-28 animate-pulse rounded bg-zinc-100" />
        <div className="h-3 w-40 animate-pulse rounded bg-zinc-100" />
      </div>
    </div>
  );
}

export default function MessagesLoading() {
  return (
    <PageContainer className="space-y-5 lg:grid lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start lg:gap-5 lg:space-y-0">
      <section className="min-h-[30rem] rounded-[1.25rem] border border-black/10 bg-white/70 shadow-sm">
        <div className="flex items-center gap-3 border-b border-black/10 p-4">
          <div className="h-11 w-11 animate-pulse rounded-full bg-[#dbe8ec]" />
          <div className="space-y-2">
            <div className="h-5 w-36 animate-pulse rounded bg-zinc-100" />
            <div className="h-3 w-24 animate-pulse rounded bg-zinc-100" />
          </div>
        </div>
        <div className="flex min-h-[18rem] items-center justify-center">
          <LocalizedBrandLoader size="sm" showLabel />
        </div>
        <div className="border-t border-black/10 p-4">
          <div className="h-12 animate-pulse rounded-xl bg-zinc-100" />
        </div>
      </section>

      <aside className="space-y-3 rounded-[1.25rem] border border-black/10 bg-white/65 p-4 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div className="space-y-2">
            <div className="h-5 w-24 animate-pulse rounded bg-zinc-100" />
            <div className="h-3 w-32 animate-pulse rounded bg-zinc-100" />
          </div>
          <div className="h-10 w-10 animate-pulse rounded-full bg-zinc-100" />
        </div>
        {[0, 1, 2, 3].map((item) => (
          <FriendRowSkeleton key={item} />
        ))}
      </aside>
    </PageContainer>
  );
}

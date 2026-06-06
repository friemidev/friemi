import { PageContainer } from "@/components/layout/PageContainer";
import { LocalizedBrandLoader } from "@/components/ui/LocalizedBrandLoader";

function NotificationSkeleton({ index }: { index: number }) {
  return (
    <article
      className="flex gap-3 rounded-lg border border-black/10 bg-white/70 p-4 shadow-sm sm:p-5"
      style={{ animationDelay: `${index * 60}ms` }}
    >
      <div className="h-8 w-8 shrink-0 animate-pulse rounded-full bg-[#dbe8ec]" />
      <div className="min-w-0 flex-1 space-y-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-2">
            <div className="h-5 w-36 animate-pulse rounded bg-zinc-100" />
            <div className="h-4 w-full max-w-md animate-pulse rounded bg-zinc-100" />
          </div>
          <div className="h-3 w-20 animate-pulse rounded bg-zinc-100" />
        </div>
        <div className="h-9 w-28 animate-pulse rounded-full bg-zinc-100" />
      </div>
    </article>
  );
}

export default function NotificationsLoading() {
  return (
    <PageContainer className="space-y-6">
      <section className="flex flex-col gap-4 rounded-lg border border-black/10 bg-white/75 p-4 shadow-sm sm:flex-row sm:items-start sm:justify-between sm:p-5">
        <div className="min-w-0 space-y-3">
          <LocalizedBrandLoader size="sm" showLabel />
          <div className="h-8 w-36 animate-pulse rounded bg-zinc-100" />
          <div className="h-4 w-full max-w-md animate-pulse rounded bg-zinc-100" />
        </div>
        <div className="h-10 w-full animate-pulse rounded-full bg-zinc-100 sm:w-28" />
      </section>

      <section className="grid gap-3">
        {[0, 1, 2, 3].map((item) => (
          <NotificationSkeleton key={item} index={item} />
        ))}
      </section>
    </PageContainer>
  );
}

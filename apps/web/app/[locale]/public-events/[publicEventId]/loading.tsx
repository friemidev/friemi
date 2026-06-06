import { PageContainer } from "@/components/layout/PageContainer";
import { LocalizedBrandLoader } from "@/components/ui/LocalizedBrandLoader";

export default function PublicEventDetailLoading() {
  return (
    <PageContainer className="space-y-5 py-4 sm:space-y-6 sm:py-8">
      <div className="h-5 w-32 animate-pulse rounded bg-white/70" />
      <div className="relative flex min-h-64 items-end overflow-hidden rounded-[1.5rem] border border-black/10 bg-[#dbe8ec] p-4 shadow-[0_18px_42px_rgba(58,49,34,0.1)] sm:p-6 md:min-h-[26rem]">
        <div className="absolute inset-0 animate-pulse bg-[#dbe8ec]" />
        <div className="relative max-w-4xl space-y-4 rounded-[1.25rem] bg-white/35 p-3 ring-1 ring-white/30 backdrop-blur-sm sm:p-4">
          <div className="flex gap-2">
            <div className="h-7 w-20 animate-pulse rounded-full bg-white/80" />
            <div className="h-7 w-24 animate-pulse rounded-full bg-white/70" />
          </div>
          <div className="h-11 w-full max-w-2xl animate-pulse rounded bg-white/80" />
          <div className="grid gap-2 sm:grid-cols-3">
            {[0, 1, 2].map((item) => (
              <div
                key={item}
                className="h-10 animate-pulse rounded-2xl bg-white/55"
              />
            ))}
          </div>
        </div>
      </div>

      <section className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <article className="space-y-4">
          <div className="rounded-lg border border-black/10 bg-white/70 p-5">
            <div className="mb-4 flex justify-center">
              <LocalizedBrandLoader size="sm" showLabel />
            </div>
            <div className="space-y-3">
              {[0, 1, 2, 3].map((item) => (
                <div
                  key={item}
                  className="h-4 animate-pulse rounded bg-zinc-100"
                />
              ))}
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {[0, 1].map((item) => (
              <div
                key={item}
                className="h-36 animate-pulse rounded-lg border border-black/10 bg-white/60"
              />
            ))}
          </div>
        </article>

        <aside className="space-y-4 rounded-[1.25rem] border border-black/10 bg-white/80 p-4 shadow-sm sm:p-5">
          {[0, 1, 2, 3].map((item) => (
            <div key={item} className="h-5 animate-pulse rounded bg-zinc-100" />
          ))}
          <div className="h-11 animate-pulse rounded-full bg-zinc-100" />
        </aside>
      </section>
    </PageContainer>
  );
}

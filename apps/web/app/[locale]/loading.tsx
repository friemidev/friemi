function SkeletonBlock({
  className,
}: {
  className: string;
}) {
  return <div className={`animate-pulse rounded-2xl bg-[#efe4d1] ${className}`} />;
}

export default function LocaleLoading() {
  return (
    <div className="min-h-[calc(100vh-4rem)] bg-transparent">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-5 sm:px-6 sm:py-8 lg:px-8">
        <div className="flex items-center gap-3">
          <div className="h-2.5 w-2.5 rounded-full bg-[#d88d72]" />
          <p className="text-sm font-medium text-[#8a6a40]">Loading...</p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-5">
            <SkeletonBlock className="h-64 w-full sm:h-80" />
            <SkeletonBlock className="h-36 w-full" />
            <SkeletonBlock className="h-56 w-full" />
          </div>

          <div className="space-y-4">
            <SkeletonBlock className="h-80 w-full" />
            <SkeletonBlock className="h-40 w-full" />
          </div>
        </div>
      </div>
    </div>
  );
}

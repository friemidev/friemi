import Link from "next/link";
import { CircleDashed } from "lucide-react";
import { cn } from "@/lib/utils";

type EmptyStateProps = {
  actionHref?: string;
  actionLabel?: string;
  className?: string;
  title: string;
  description?: string;
};

export function EmptyState({
  actionHref,
  actionLabel,
  className,
  title,
  description,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "rounded-[1.25rem] border border-dashed border-sand-strong bg-white/68 p-5 text-center shadow-[0_12px_28px_rgba(99,78,48,0.05)] sm:p-7",
        className,
      )}
    >
      <span className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-coral-soft text-[#8a6a40] ring-1 ring-sand sm:h-11 sm:w-11">
        <CircleDashed className="h-[18px] w-[18px] sm:h-5 sm:w-5" aria-hidden="true" />
      </span>
      <h2 className="mt-3 text-base font-semibold text-ink sm:mt-4">
        {title}
      </h2>
      {description ? (
        <p className="mx-auto mt-1.5 max-w-md text-sm leading-6 text-zinc-500 sm:mt-2">
          {description}
        </p>
      ) : null}
      {actionHref && actionLabel ? (
        <Link
          href={actionHref}
          className="mt-4 inline-flex h-11 min-h-11 items-center justify-center rounded-full bg-white px-4 text-sm font-semibold text-ink shadow-sm ring-1 ring-sand-strong transition duration-150 ease-out hover:-translate-y-0.5 hover:bg-team-bg active:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral/35 sm:mt-5"
        >
          {actionLabel}
        </Link>
      ) : null}
    </div>
  );
}

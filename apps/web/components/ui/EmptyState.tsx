import Link from "next/link";
import Image from "next/image";
import { ArrowRight } from "lucide-react";
import { brand } from "@/lib/brand";
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
        "relative overflow-hidden rounded-[1.35rem] border border-sand bg-paper/76 p-5 text-center shadow-[0_14px_34px_rgba(21,98,64,0.06)] sm:p-7",
        className,
      )}
    >
      <span
        className="pointer-events-none absolute inset-x-8 -top-14 h-24 rounded-full bg-[#F1F2EC]/55 blur-2xl"
        aria-hidden="true"
      />
      <span className="relative mx-auto flex h-12 w-12 items-center justify-center overflow-hidden rounded-2xl bg-fog ring-1 ring-sand sm:h-14 sm:w-14">
        <Image
          src={brand.emptyStateIconPath}
          alt=""
          width={56}
          height={56}
          className="h-full w-full scale-[1.55] object-cover"
        />
      </span>
      <h2 className="relative mt-3 text-base font-semibold text-ink sm:mt-4">
        {title}
      </h2>
      {description ? (
        <p className="relative mx-auto mt-1.5 max-w-md text-sm leading-6 text-zinc-500 sm:mt-2">
          {description}
        </p>
      ) : null}
      {actionHref && actionLabel ? (
        <Link
          href={actionHref}
          className="relative mt-4 inline-flex h-11 min-h-11 items-center justify-center gap-2 rounded-full bg-moss px-4 text-sm font-semibold text-white shadow-[0_10px_22px_rgba(21,98,64,0.18)] transition duration-150 ease-out hover:-translate-y-0.5 hover:bg-meadow active:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-meadow/35 sm:mt-5"
        >
          {actionLabel}
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      ) : null}
    </div>
  );
}

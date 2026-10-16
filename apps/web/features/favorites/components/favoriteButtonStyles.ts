import { cn } from "@/lib/utils";

export function getFavoriteButtonClassName(
  className?: string,
  options?: {
    isFavorited?: boolean;
    pending?: boolean;
    compact?: boolean;
  },
) {
  return cn(
    "inline-flex aspect-square size-10 min-h-0 min-w-0 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white/95 p-0 text-zinc-950 shadow-sm ring-1 ring-black/10 hover:translate-y-0 hover:bg-white active:translate-y-0",
    options?.isFavorited ? "text-red-500" : null,
    options?.pending ? "ring-2 ring-[#DEAAB3]" : null,
    options?.compact
      ? "relative size-11 min-h-11 min-w-11 bg-transparent shadow-none ring-0 hover:bg-transparent before:pointer-events-none before:absolute before:inset-1.5 before:rounded-full before:bg-white/95 before:shadow-sm before:ring-1 before:ring-black/10 [&>svg]:relative"
      : null,
    className,
  );
}

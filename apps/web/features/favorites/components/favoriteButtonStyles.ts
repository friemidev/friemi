import { cn } from "@/lib/utils";

export function getFavoriteButtonClassName(
  className?: string,
  options?: {
    isFavorited?: boolean;
    pending?: boolean;
  },
) {
  return cn(
    "inline-flex aspect-square size-10 min-h-0 min-w-0 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white/95 p-0 text-zinc-950 shadow-sm ring-1 ring-black/10 hover:translate-y-0 hover:bg-white active:translate-y-0",
    options?.isFavorited ? "text-red-500" : null,
    options?.pending ? "ring-2 ring-[#e6b3a1]" : null,
    className,
  );
}

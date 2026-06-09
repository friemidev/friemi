import { CircleDashed } from "lucide-react";

type EmptyStateProps = {
  title: string;
  description?: string;
};

export function EmptyState({ title, description }: EmptyStateProps) {
  return (
    <div className="rounded-[1.25rem] border border-dashed border-[#d8c9b5] bg-white/70 p-8 text-center shadow-[0_12px_28px_rgba(99,78,48,0.05)]">
      <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-[#f7efe2] text-[#8a6a40] ring-1 ring-[#eadcc6]">
        <CircleDashed className="h-5 w-5" aria-hidden="true" />
      </span>
      <h2 className="mt-4 text-base font-semibold text-zinc-950">{title}</h2>
      {description ? (
        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-zinc-500">
          {description}
        </p>
      ) : null}
    </div>
  );
}

import { CircleDashed } from "lucide-react";

type EmptyStateProps = {
  title: string;
  description?: string;
};

export function EmptyState({ title, description }: EmptyStateProps) {
  return (
    <div className="rounded-lg border border-dashed border-zinc-300 bg-white/60 p-8 text-center">
      <CircleDashed className="mx-auto h-8 w-8 text-zinc-400" />
      <h2 className="mt-4 text-base font-semibold text-zinc-950">{title}</h2>
      {description ? (
        <p className="mt-2 text-sm text-zinc-500">{description}</p>
      ) : null}
    </div>
  );
}

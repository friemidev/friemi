import type { ReactNode } from "react";
import { cn } from "@chill-club/ui";

type FormFieldProps = {
  label: string;
  hint?: string;
  children: ReactNode;
  className?: string;
};

export function FormField({ label, hint, children, className }: FormFieldProps) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <label className="block text-sm font-medium text-zinc-700">{label}</label>
      {children}
      {hint ? <p className="text-xs text-zinc-500">{hint}</p> : null}
    </div>
  );
}

export const selectClassName =
  "h-10 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm text-zinc-900";

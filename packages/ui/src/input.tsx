import * as React from "react";
import { cn } from "./utils";

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

export function Input({ className, ...props }: InputProps) {
  return (
    <input
      className={cn(
        "h-10 w-full rounded-xl border border-sand bg-white/92 px-3 text-sm text-ink outline-none transition placeholder:text-zinc-400 focus:border-coral focus:ring-2 focus:ring-coral/20 disabled:bg-zinc-100 disabled:text-zinc-400",
        className
      )}
      {...props}
    />
  );
}

import * as React from "react";
import { cn } from "./utils";

export type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>;

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  function Textarea({ className, ...props }, ref) {
    return (
      <textarea
        ref={ref}
        className={cn(
          "min-h-28 w-full rounded-xl border border-sand bg-white/92 px-3 py-2 text-sm text-ink outline-none transition placeholder:text-zinc-400 focus:border-coral focus:ring-2 focus:ring-coral/20 disabled:bg-zinc-100 disabled:text-zinc-400",
          className,
        )}
        {...props}
      />
    );
  },
);

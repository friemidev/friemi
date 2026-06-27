import * as React from "react";
import { cn } from "./utils";

type ButtonVariant = "primary" | "secondary" | "ghost" | "success";

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
};

const variants: Record<ButtonVariant, string> = {
  primary: "bg-ink text-paper shadow-sm shadow-ink/10 hover:bg-forest",
  secondary:
    "bg-paper/88 text-ink shadow-sm ring-1 ring-sand-strong hover:bg-team-bg",
  ghost: "text-ink/70 hover:bg-paper/72 hover:text-ink",
  success: "bg-moss text-paper shadow-sm shadow-moss/20 hover:bg-meadow",
};

export function Button({
  className,
  variant = "primary",
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex h-11 min-h-11 items-center justify-center whitespace-nowrap rounded-full px-4 text-sm font-semibold transition duration-150 ease-out hover:-translate-y-0.5 active:translate-y-0 disabled:pointer-events-none disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral/45 focus-visible:ring-offset-2 focus-visible:ring-offset-paper",
        variants[variant],
        className,
      )}
      {...props}
    />
  );
}

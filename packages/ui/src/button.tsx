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
  children,
  ...props
}: ButtonProps) {
  const content = React.Children.map(children, (child) =>
    typeof child === "number" || (typeof child === "string" && child.trim()) ? (
      <span className="min-w-0 overflow-hidden text-ellipsis">{child}</span>
    ) : (
      child
    ),
  );

  return (
    <button
      className={cn(
        "friemi-pressable inline-flex h-11 min-h-11 min-w-0 max-w-full items-center justify-center whitespace-nowrap rounded-full px-4 text-sm font-semibold [&>svg]:shrink-0 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral/45 focus-visible:ring-offset-2 focus-visible:ring-offset-paper",
        variants[variant],
        className,
      )}
      {...props}
    >
      {content}
    </button>
  );
}

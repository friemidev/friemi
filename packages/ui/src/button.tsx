import * as React from "react";
import { cn } from "./utils";

type ButtonVariant = "primary" | "secondary" | "ghost" | "success";

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
};

const variants: Record<ButtonVariant, string> = {
  primary: "bg-zinc-950 text-white hover:bg-zinc-800",
  secondary: "bg-white text-zinc-950 ring-1 ring-zinc-200 hover:bg-zinc-50",
  ghost: "text-zinc-700 hover:bg-zinc-100",
  success: "bg-emerald-600 text-white hover:bg-emerald-700",
};

export function Button({
  className,
  variant = "primary",
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex h-10 items-center justify-center whitespace-nowrap rounded-md px-4 text-sm font-medium transition disabled:pointer-events-none disabled:opacity-50",
        variants[variant],
        className,
      )}
      {...props}
    />
  );
}

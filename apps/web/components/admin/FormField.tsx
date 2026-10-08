import { cloneElement, isValidElement, useId, type ReactNode } from "react";
import { cn } from "@chill-club/ui";

type FormFieldProps = {
  label: string;
  hint?: string;
  children: ReactNode;
  className?: string;
};

export function FormField({
  label,
  hint,
  children,
  className,
}: FormFieldProps) {
  const generatedId = useId();
  const control = isValidElement<{ id?: string }>(children)
    ? cloneElement(children, { id: children.props.id ?? generatedId })
    : children;
  const controlId = isValidElement<{ id?: string }>(control)
    ? control.props.id
    : undefined;

  return (
    <div className={cn("space-y-1.5", className)}>
      <label className="block text-sm font-medium text-ink" htmlFor={controlId}>
        {label}
      </label>
      {control}
      {hint ? <p className="text-xs text-ink/70">{hint}</p> : null}
    </div>
  );
}

export const selectClassName =
  "h-10 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm text-zinc-900";

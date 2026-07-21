import { cn } from "@/lib/utils";

type LocaleFlagIconProps = {
  flag: "cn" | "gb" | "fr";
  label: string;
  size?: "sm" | "md" | "lg";
};

export function LocaleFlagIcon({
  flag,
  label,
  size = "md",
}: LocaleFlagIconProps) {
  return (
    <span
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-white shadow-sm ring-1 ring-black/10",
        size === "sm" && "h-5 w-5",
        size === "md" && "h-6 w-6",
        size === "lg" && "h-8 w-8",
      )}
    >
      <span className="sr-only">{label}</span>
      {flag === "cn" ? <ChinaFlag /> : null}
      {flag === "gb" ? <UnitedKingdomFlag /> : null}
      {flag === "fr" ? <FranceFlag /> : null}
    </span>
  );
}

function ChinaFlag() {
  return (
    <svg
      aria-hidden="true"
      className="h-full w-full"
      focusable="false"
      viewBox="0 0 32 32"
    >
      <rect fill="#de2910" height="32" width="32" />
      <path
        d="M8.1 5.2 9 7.9h2.9L9.6 9.6l.9 2.8-2.4-1.7-2.3 1.7.9-2.8-2.4-1.7h2.9l.9-2.7Z"
        fill="#ffde00"
      />
      <path
        d="m14.4 4.6.6 1.1 1.2.1-.9.8.2 1.2-1.1-.6-1.1.6.2-1.2-.9-.8 1.3-.1.5-1.1Zm4.2 3.7.2 1.2 1.1.5-1.1.6-.1 1.2-.9-.9-1.2.3.6-1.1-.7-1 1.2.2.9-1Zm-.3 5.9.9.8 1.2-.3-.5 1.1.7 1-1.2-.1-.7 1-.3-1.2-1.2-.4 1-.7.1-1.2Zm-4.2 3.8 1.1.5 1-.6-.2 1.2.9.8-1.2.1-.5 1.1-.5-1.1-1.2-.1.9-.8-.3-1.1Z"
        fill="#ffde00"
      />
    </svg>
  );
}

function FranceFlag() {
  return (
    <svg
      aria-hidden="true"
      className="h-full w-full"
      focusable="false"
      viewBox="0 0 32 32"
    >
      <rect fill="#fff" height="32" width="32" />
      <rect fill="#0055a4" height="32" width="10.67" />
      <rect fill="#ef4135" height="32" width="10.67" x="21.33" />
    </svg>
  );
}

function UnitedKingdomFlag() {
  return (
    <svg
      aria-hidden="true"
      className="h-full w-full"
      focusable="false"
      viewBox="0 0 32 32"
    >
      <rect fill="#012169" height="32" width="32" />
      <path d="m0 0 32 32M32 0 0 32" stroke="#fff" strokeWidth="7.2" />
      <path d="m0 0 32 32M32 0 0 32" stroke="#c8102e" strokeWidth="4" />
      <path d="M16 0v32M0 16h32" stroke="#fff" strokeWidth="10" />
      <path d="M16 0v32M0 16h32" stroke="#c8102e" strokeWidth="6" />
    </svg>
  );
}

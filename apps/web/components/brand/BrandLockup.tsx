import Image from "next/image";
import { brand } from "@/lib/brand";
import { cn } from "@/lib/utils";

type BrandLockupProps = {
  className?: string;
  priority?: boolean;
  size?: "sm" | "md" | "lg";
  tone?: "navy" | "white";
};

const sizeClasses = {
  sm: "h-8 w-[6.75rem]",
  md: "h-10 w-[8.5rem]",
  lg: "h-14 w-[11.5rem]",
};

export function BrandLockup({
  className,
  priority = false,
  size = "md",
  tone = "navy",
}: BrandLockupProps) {
  const src =
    tone === "white"
      ? brand.lockupHorizontalWhitePath
      : brand.lockupHorizontalNavyPath;

  return (
    <span className={cn("relative block shrink-0", sizeClasses[size], className)}>
      <Image
        src={src}
        alt={brand.name}
        width={1200}
        height={360}
        className="h-full w-full object-contain object-left"
        priority={priority}
      />
    </span>
  );
}

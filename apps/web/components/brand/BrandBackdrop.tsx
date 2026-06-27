import Image from "next/image";
import { brand } from "@/lib/brand";
import { cn } from "@/lib/utils";

type BrandBackdropProps = {
  className?: string;
  imageClassName?: string;
  priority?: boolean;
  variant?: "desktop-band" | "desktop-wide" | "mobile-frame";
};

const backdropSrc = {
  "desktop-band": brand.desktopBandImagePath,
  "desktop-wide": brand.desktopWideImagePath,
  "mobile-frame": brand.mobileFrameImagePath,
};

export function BrandBackdrop({
  className,
  imageClassName,
  priority = false,
  variant = "desktop-wide",
}: BrandBackdropProps) {
  return (
    <div className={cn("pointer-events-none absolute overflow-hidden", className)} aria-hidden="true">
      <Image
        src={backdropSrc[variant]}
        alt=""
        fill
        sizes="100vw"
        className={cn("object-cover", imageClassName)}
        priority={priority}
      />
    </div>
  );
}

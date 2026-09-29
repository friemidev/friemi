import Image from "next/image";
import { cn } from "@/lib/utils";

type FriemiCoinIconProps = {
  className?: string;
};

export function FriemiCoinIcon({ className }: FriemiCoinIconProps) {
  return (
    <Image
      alt=""
      aria-hidden="true"
      className={cn(
        "inline-block h-4 w-4 shrink-0 object-contain drop-shadow-[0_3px_3px_rgba(124,88,15,0.2)]",
        className,
      )}
      height={64}
      src="/items/FMCoin.png"
      width={64}
    />
  );
}

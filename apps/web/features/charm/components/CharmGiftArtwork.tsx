import Image from "next/image";
import { cn } from "@/lib/utils";

const giftArtworkById: Readonly<Record<string, string>> = {
  art: "/items/gift/shop/art-brushes.webp",
  birthday_cake: "/items/gift/shop/birthday-cake.webp",
  board_game: "/items/gift/shop/board-game-dice.webp",
  christmas: "/items/gift/shop/christmas-tree.webp",
  egg: "/items/gift/shop/negative-egg.webp",
  fireworks: "/items/gift/shop/fireworks.webp",
  growth: "/items/gift/shop/growth-notebook.webp",
  halloween: "/items/gift/shop/halloween-pumpkin.webp",
  heart: "/items/gift/shop/charm-heart.webp",
  meal: "/items/gift/shop/meal-carb-bomb.webp",
  movie: "/items/gift/shop/movie-popcorn.webp",
  music: "/items/gift/shop/music-open-mic.webp",
  bomb: "/items/gift/shop/negative-bomb.webp",
  police_car: "/items/gift/shop/negative-police-car.webp",
  rose: "/items/gift/shop/social-flower.webp",
  sports: "/items/gift/shop/sports-medal.webp",
  spring_festival: "/items/gift/shop/spring-festival-red-envelope.webp",
  travel: "/items/gift/shop/travel-camera.webp",
  werewolf: "/items/gift/shop/werewolf-eye.webp",
};

export function getCharmGiftArtworkPath(giftId: string) {
  return giftArtworkById[giftId] ?? null;
}

export function CharmGiftArtwork({
  className,
  emoji,
  giftId,
  label,
  sizes = "96px",
}: {
  className?: string;
  emoji: string;
  giftId: string;
  label: string;
  sizes?: string;
}) {
  const artworkPath = getCharmGiftArtworkPath(giftId);

  return (
    <span
      className={cn(
        "relative grid shrink-0 place-items-center overflow-hidden rounded-[1rem] bg-[#F8F7F2]",
        className,
      )}
      role={artworkPath ? undefined : "img"}
      aria-label={artworkPath ? undefined : label}
    >
      {artworkPath ? (
        <Image
          alt={label}
          className="object-cover"
          fill
          loading="eager"
          sizes={sizes}
          src={artworkPath}
          unoptimized
        />
      ) : (
        <span className="text-[2.25rem] leading-none" aria-hidden="true">
          {emoji}
        </span>
      )}
    </span>
  );
}

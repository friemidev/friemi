type MessageAvatarProps = {
  avatarUrl: string | null;
  name: string;
  size?: "sm" | "md";
};

export function MessageAvatar({
  avatarUrl,
  name,
  size = "md",
}: MessageAvatarProps) {
  const initial = name.trim().charAt(0).toUpperCase() || "N";
  const sizeClass = size === "sm" ? "h-9 w-9 text-sm" : "h-11 w-11 text-base";

  return (
    <span
      className={`${sizeClass} flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-white text-center font-semibold text-ink shadow-sm ring-1 ring-black/10`}
    >
      {avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          alt=""
          className="h-full w-full object-cover"
          referrerPolicy="no-referrer"
          src={avatarUrl}
        />
      ) : (
        initial
      )}
    </span>
  );
}

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
  const sizeClass =
    size === "sm" ? "h-9 w-9 text-sm" : "h-11 w-11 text-base";

  return (
    <span
      className={`${sizeClass} flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#FEFFF9] text-center font-semibold text-moss shadow-[0_8px_18px_rgba(21,98,64,0.1)] ring-1 ring-sand`}
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

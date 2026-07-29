type MessageAvatarProps = {
  avatarUrl: string | null;
  isOnline?: boolean;
  name: string;
  size?: "sm" | "md";
};

export function MessageAvatar({
  avatarUrl,
  isOnline = false,
  name,
  size = "md",
}: MessageAvatarProps) {
  const initial = name.trim().charAt(0).toUpperCase() || "N";
  const sizeClass =
    size === "sm" ? "h-9 w-9 text-sm" : "h-11 w-11 text-base";
  const dotClass = size === "sm" ? "h-2.5 w-2.5" : "h-3 w-3";

  return (
    <span
      className={`${sizeClass} relative flex shrink-0 items-center justify-center rounded-full bg-[#FEFFF9] text-center font-semibold text-moss shadow-[0_8px_18px_rgba(21,98,64,0.1)] ring-1 ring-sand`}
    >
      <span className="flex h-full w-full items-center justify-center overflow-hidden rounded-full">
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
      {isOnline ? (
        <span
          aria-hidden="true"
          className={`${dotClass} absolute bottom-0 right-0 rounded-full bg-[#2FBF62] ring-2 ring-white`}
        />
      ) : null}
    </span>
  );
}

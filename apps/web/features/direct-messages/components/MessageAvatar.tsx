import type { UserPresenceDisplayStatus } from "@/features/profile/presence";

type MessageAvatarProps = {
  avatarUrl: string | null;
  isOnline?: boolean;
  name: string;
  presenceDisplayStatus?: UserPresenceDisplayStatus;
  size?: "sm" | "md";
};

export function MessageAvatar({
  avatarUrl,
  isOnline = false,
  name,
  presenceDisplayStatus,
  size = "md",
}: MessageAvatarProps) {
  const initial = name.trim().charAt(0).toUpperCase() || "N";
  const sizeClass =
    size === "sm" ? "h-9 w-9 text-sm" : "h-11 w-11 text-base";
  const dotClass = size === "sm" ? "h-2.5 w-2.5" : "h-3 w-3";
  const visiblePresenceStatus =
    presenceDisplayStatus ?? (isOnline ? "ONLINE" : null);
  const dotColorClass =
    visiblePresenceStatus === "AWAY" ? "bg-[#F0B84D]" : "bg-[#2FBF62]";

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
      {visiblePresenceStatus ? (
        <span
          aria-hidden="true"
          className={`${dotClass} ${dotColorClass} absolute bottom-0 right-0 rounded-full ring-2 ring-white`}
        />
      ) : null}
    </span>
  );
}

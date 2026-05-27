import { Card, CardContent } from "@chill-club/ui";
import { getProfileFollowCopy } from "../copy";
import type { ProfileFollowUserViewModel } from "../queries/getProfileDashboard";

type ProfileFollowUserCardProps = {
  locale: string;
  user: ProfileFollowUserViewModel;
};

export function ProfileFollowUserCard({
  locale,
  user,
}: ProfileFollowUserCardProps) {
  const t = getProfileFollowCopy(locale);
  const userInitial = user.nickname.trim().slice(0, 1) || "N";

  return (
    <Card className="h-full border-black/10 bg-white/75">
      <CardContent className="flex items-start gap-3 p-4">
        {user.avatarUrl ? (
          <img
            src={user.avatarUrl}
            alt={`${user.nickname} avatar`}
            className="h-11 w-11 shrink-0 rounded-full object-cover"
          />
        ) : (
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-moss text-sm font-semibold text-white">
            {userInitial}
          </div>
        )}
        <div className="min-w-0">
          <p className="truncate font-medium text-ink">{user.nickname}</p>
          <p className="mt-1 line-clamp-2 text-sm leading-6 text-zinc-600">
            {user.bio ?? t.noBio}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

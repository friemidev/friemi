export const defaultProfileAvatars = [
  {
    key: "mint",
    color: "#156240",
    src: "/profile/default-avatars/mint.svg",
  },
  {
    key: "coral",
    color: "#F47D6B",
    src: "/profile/default-avatars/coral.svg",
  },
  {
    key: "sky",
    color: "#4E8FEA",
    src: "/profile/default-avatars/sky.svg",
  },
  {
    key: "sun",
    color: "#E9A827",
    src: "/profile/default-avatars/sun.svg",
  },
  {
    key: "berry",
    color: "#E7457A",
    src: "/profile/default-avatars/berry.svg",
  },
  {
    key: "violet",
    color: "#8A61CE",
    src: "/profile/default-avatars/violet.svg",
  },
] as const;

const defaultProfileAvatarSrcSet: Set<string> = new Set(
  defaultProfileAvatars.map((avatar) => avatar.src),
);

export function isDefaultProfileAvatarSrc(value: string) {
  return defaultProfileAvatarSrcSet.has(value);
}

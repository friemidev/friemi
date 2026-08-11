export type DefaultProfileAvatarGender = "female" | "male";

function buildGenderAvatars(gender: DefaultProfileAvatarGender) {
  return Array.from({ length: 9 }, (_, index) => {
    const number = String(index + 1).padStart(2, "0");

    return {
      gender,
      key: `${gender}-${number}`,
      src: `/avatar/${gender}-${number}.png`,
    };
  });
}

export const defaultProfileAvatarsByGender = {
  female: buildGenderAvatars("female"),
  male: buildGenderAvatars("male"),
} as const;

export const defaultProfileAvatars = [
  ...defaultProfileAvatarsByGender.female,
  ...defaultProfileAvatarsByGender.male,
] as const;

const legacyDefaultProfileAvatarSrcs = [
  "/profile/default-avatars/mint.svg",
  "/profile/default-avatars/coral.svg",
  "/profile/default-avatars/sky.svg",
  "/profile/default-avatars/sun.svg",
  "/profile/default-avatars/berry.svg",
  "/profile/default-avatars/violet.svg",
] as const;

const defaultProfileAvatarSrcSet: Set<string> = new Set(
  [
    ...defaultProfileAvatars.map((avatar) => avatar.src),
    ...legacyDefaultProfileAvatarSrcs,
  ],
);

export function isDefaultProfileAvatarSrc(value: string) {
  return defaultProfileAvatarSrcSet.has(value);
}

export function getDefaultProfileAvatarGender(
  value: string | null | undefined,
): DefaultProfileAvatarGender | null {
  if (!value) {
    return null;
  }

  const matchedAvatar = defaultProfileAvatars.find(
    (avatar) => avatar.src === value,
  );

  return matchedAvatar?.gender ?? null;
}

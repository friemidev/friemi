export const werewolfAllRolesProductId = "werewolf-all-roles" as const;

export type ProfileShopProductId = typeof werewolfAllRolesProductId;

export function getProfileShopProductId(
  value: string | string[] | undefined,
): ProfileShopProductId | null {
  const candidate = Array.isArray(value) ? value[0] : value;

  return candidate === werewolfAllRolesProductId ? candidate : null;
}

export function getWerewolfAllRolesShopPath() {
  return `/profile/shop?product=${werewolfAllRolesProductId}&recharge=1`;
}

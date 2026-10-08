export function normalizeFriemiCode(value: string) {
  const normalized = value
    .replace(/[０-９]/g, (character) =>
      String.fromCharCode(character.charCodeAt(0) - 0xfee0),
    )
    .replace(/[\s-]/g, "");

  return /^\d{6}$/.test(normalized) ? normalized : null;
}

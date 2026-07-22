function stripInvalidDisplayCharacters(value: string) {
  let result = "";

  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);

    if (code >= 0xd800 && code <= 0xdbff) {
      const nextCode = value.charCodeAt(index + 1);

      if (nextCode >= 0xdc00 && nextCode <= 0xdfff) {
        result += value[index] + value[index + 1];
        index += 1;
      }

      continue;
    }

    if (code >= 0xdc00 && code <= 0xdfff) {
      continue;
    }

    if (code === 0xfffd) {
      continue;
    }

    result += value[index];
  }

  return result;
}

export function sanitizeDisplayText(value: string) {
  return stripInvalidDisplayCharacters(value).normalize("NFC").trim();
}

export function getAvatarInitial(value: string, fallback = "N") {
  const text = sanitizeDisplayText(value);
  const initial = Array.from(text).find(
    (char) => !/^[\u0300-\u036f\u200d\ufe0e\ufe0f]$/.test(char),
  );

  return initial?.toUpperCase() || fallback;
}

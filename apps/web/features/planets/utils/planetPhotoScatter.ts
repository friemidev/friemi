export type PlanetPhotoScatterCard = {
  heightPercent: number;
  leftPercent: number;
  rotationDegrees: number;
  topPercent: number;
  widthPercent: number;
};

const CARD_HEIGHT_RATIO = 5 / 6;
const MINIMUM_BASE_EXPOSURE = 0.6;

function seededUnit(seed: number) {
  const value = Math.sin(seed * 12.9898) * 43758.5453;
  return value - Math.floor(value);
}

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(Math.max(value, minimum), maximum);
}

function getBaseExposure(
  widthPercent: number,
  columns: number,
  rows: number,
) {
  const heightPercent = widthPercent * CARD_HEIGHT_RATIO;
  const horizontalStep =
    columns > 1 ? (100 - widthPercent) / (columns - 1) : widthPercent;
  const verticalStep =
    rows > 1 ? (100 - heightPercent) / (rows - 1) : heightPercent;

  return (
    Math.min(1, horizontalStep / widthPercent) *
    Math.min(1, verticalStep / heightPercent)
  );
}

function getLargestSafeWidth(columns: number, rows: number) {
  let minimum = 20;
  let maximum = 70;

  for (let index = 0; index < 24; index += 1) {
    const candidate = (minimum + maximum) / 2;
    if (getBaseExposure(candidate, columns, rows) >= MINIMUM_BASE_EXPOSURE) {
      minimum = candidate;
    } else {
      maximum = candidate;
    }
  }

  return minimum;
}

export function getPlanetPhotoScatterLayout(
  photoCount: number,
): PlanetPhotoScatterCard[] {
  const count = Math.max(1, Math.floor(photoCount));
  if (count === 1) {
    return [
      {
        heightPercent: 100,
        leftPercent: 0,
        rotationDegrees: 0,
        topPercent: 0,
        widthPercent: 100,
      },
    ];
  }

  if (count === 2) {
    const widthPercent = 68;
    const heightPercent = widthPercent * CARD_HEIGHT_RATIO;

    return [
      {
        heightPercent,
        leftPercent: 1,
        rotationDegrees: -4,
        topPercent: 1,
        widthPercent,
      },
      {
        heightPercent,
        leftPercent: 31,
        rotationDegrees: 4,
        topPercent: 99 - heightPercent,
        widthPercent,
      },
    ];
  }

  const columns = Math.ceil(Math.sqrt(count * 0.9));
  const rows = Math.ceil(count / columns);
  const widthPercent = getLargestSafeWidth(columns, rows);
  const heightPercent = widthPercent * CARD_HEIGHT_RATIO;

  return Array.from({ length: count }, (_, index) => {
    const row = Math.floor(index / columns);
    const rowStart = row * columns;
    const itemsInRow = Math.min(columns, count - rowStart);
    const column = index - rowStart;
    const availableWidth = 100 - widthPercent;
    const availableHeight = 100 - heightPercent;
    const horizontalStep =
      itemsInRow > 1 ? availableWidth / (itemsInRow - 1) : 0;
    const horizontalJitter =
      (seededUnit((index + 1) * 7 + count * 11) - 0.5) * 2;
    const verticalJitter =
      (seededUnit((index + 1) * 13 + count * 5) - 0.5) * 2;
    const rawLeft =
      itemsInRow === 1
        ? availableWidth / 2 + horizontalJitter
        : column * horizontalStep + horizontalJitter;
    const rawTop =
      rows === 1
        ? availableHeight / 2 + verticalJitter
        : row * (availableHeight / (rows - 1)) + verticalJitter;

    return {
      heightPercent,
      leftPercent: clamp(rawLeft, 0.5, 99.5 - widthPercent),
      rotationDegrees:
        (seededUnit((index + 1) * 19 + count * 3) - 0.5) * 10,
      topPercent: clamp(rawTop, 0.5, 99.5 - heightPercent),
      widthPercent,
    };
  });
}

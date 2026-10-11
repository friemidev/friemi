type CanvasGeometry = {
  bounds: { left: number; top: number; width: number; height: number };
  // Untransformed border-box dimensions, including the uniform SVG border.
  width: number;
  height: number;
  border: number;
  rotatedClockwise: boolean;
};

/** Map the visible paper to the shared 1000 × 700 viewBox, including CSS rotation. */
export function drawGuessCanvasPoint(
  clientX: number,
  clientY: number,
  { bounds, width, height, border, rotatedClockwise }: CanvasGeometry,
): [number, number] | null {
  const innerWidth = width - border * 2;
  const innerHeight = height - border * 2;
  if (![clientX, clientY, bounds.left, bounds.top, bounds.width, bounds.height, width, height, border].every(Number.isFinite)
    || bounds.width <= 0 || bounds.height <= 0 || innerWidth <= 0 || innerHeight <= 0) return null;

  // Use viewport bounds instead of getScreenCTM: CSS rotation, zoom and resize
  // must use the same visible rectangle as the pointer event on every browser.
  const x = (rotatedClockwise ? (clientY - bounds.top) / bounds.height : (clientX - bounds.left) / bounds.width) * width;
  const y = (rotatedClockwise ? 1 - (clientX - bounds.left) / bounds.width : (clientY - bounds.top) / bounds.height) * height;
  const paperWidth = Math.min(innerWidth, innerHeight * 10 / 7);
  const paperHeight = paperWidth * 7 / 10;
  const left = border + (innerWidth - paperWidth) / 2;
  const top = border + (innerHeight - paperHeight) / 2;
  // 0.0001 is at most 0.1 viewBox pixels. Extra float digits inflate every
  // saved drawing without adding visible detail, exhausting its payload budget.
  const normalized = (value: number) => Math.round(Math.min(1, Math.max(0, value)) * 10_000) / 10_000;
  return [normalized((x - left) / paperWidth), normalized((y - top) / paperHeight)];
}

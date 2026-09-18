export function getCollapsedVoterNameCount({
  availableWidth,
  moreWidths,
  voterWidths,
}: {
  availableWidth: number;
  moreWidths: number[];
  voterWidths: number[];
}) {
  if (voterWidths.length <= 1) return voterWidths.length;

  const fullWidth = voterWidths.reduce((total, width) => total + width, 0);

  if (fullWidth <= availableWidth) return voterWidths.length;

  let prefixWidth = 0;
  let visibleCount = 1;

  for (let count = 1; count < voterWidths.length; count += 1) {
    prefixWidth += voterWidths[count - 1] ?? 0;
    const hiddenCount = voterWidths.length - count;
    const moreWidth = moreWidths[hiddenCount];

    if (moreWidth !== undefined && prefixWidth + moreWidth <= availableWidth) {
      visibleCount = count;
    }
  }

  return visibleCount;
}

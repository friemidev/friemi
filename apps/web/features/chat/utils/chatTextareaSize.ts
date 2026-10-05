export const chatTextareaMaxRows = 8;

export function getChatTextareaSize({
  scrollHeight,
  lineHeight,
  padding,
  border,
}: {
  scrollHeight: number;
  lineHeight: number;
  padding: number;
  border: number;
}) {
  const minimum = lineHeight + padding + border;
  const maximum = lineHeight * chatTextareaMaxRows + padding + border;
  const contentHeight = scrollHeight + border;

  return {
    height: Math.max(minimum, Math.min(contentHeight, maximum)),
    overflow: contentHeight > maximum,
  };
}

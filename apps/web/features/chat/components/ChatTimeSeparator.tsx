import {
  formatChatDateSeparator,
  formatChatMessageTime,
} from "@/lib/chatDateSeparators";

export function ChatTimeSeparator({
  createdAt,
  locale,
  showDate,
}: {
  createdAt: string;
  locale: string;
  showDate: boolean;
}) {
  const label = [
    showDate ? formatChatDateSeparator(createdAt, locale) : "",
    formatChatMessageTime(createdAt, locale),
  ]
    .filter(Boolean)
    .join(" ");

  if (!label) return null;

  return (
    <div
      className="my-1 min-w-0 px-4 py-1 text-center text-[11px] font-medium leading-5 text-[#858A83]"
      data-chat-time
    >
      <time dateTime={createdAt}>{label}</time>
    </div>
  );
}

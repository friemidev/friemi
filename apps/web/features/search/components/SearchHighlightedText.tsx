import { getGlobalSearchTerms } from "../utils/searchQuery";

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function SearchHighlightedText({
  className,
  query,
  text,
}: {
  className?: string;
  query: string;
  text: string;
}) {
  const terms = getGlobalSearchTerms(query).filter((term) => term.length > 1);

  if (terms.length === 0) {
    return <>{text}</>;
  }

  const pattern = new RegExp(`(${terms.map(escapeRegExp).join("|")})`, "gi");
  const parts = text.split(pattern);

  return (
    <>
      {parts.map((part, index) => {
        const matched = terms.some(
          (term) => part.toLowerCase() === term.toLowerCase(),
        );

        return matched ? (
          <mark
            key={`${part}-${index}`}
            className={
              className ??
              "rounded bg-[#f5d7bf] px-0.5 font-semibold text-[#7b432f]"
            }
          >
            {part}
          </mark>
        ) : (
          <span key={`${part}-${index}`}>{part}</span>
        );
      })}
    </>
  );
}

import { Fragment } from "react";
import { cn } from "@/lib/utils";

const mentionEveryoneTokens = ["@所有人", "@everyone", "@tout le monde"];

type MentionSegment = {
  highlighted: boolean;
  text: string;
};

function splitMentionText(
  content: string,
  mentionLabels: string[],
  mentionsEveryone: boolean,
) {
  const tokens = [
    ...mentionLabels
      .map((label) => `@${label.trim()}`)
      .filter((token) => token.length > 1),
    ...(mentionsEveryone ? mentionEveryoneTokens : []),
  ]
    .filter((token, index, values) => values.indexOf(token) === index)
    .sort((tokenA, tokenB) => tokenB.length - tokenA.length);

  if (tokens.length === 0) {
    return [{ highlighted: false, text: content }];
  }

  const segments: MentionSegment[] = [];
  let cursor = 0;

  while (cursor < content.length) {
    let nextIndex = -1;
    let nextToken = "";

    for (const token of tokens) {
      const tokenIndex = content.indexOf(token, cursor);

      if (
        tokenIndex >= 0 &&
        (nextIndex < 0 ||
          tokenIndex < nextIndex ||
          (tokenIndex === nextIndex && token.length > nextToken.length))
      ) {
        nextIndex = tokenIndex;
        nextToken = token;
      }
    }

    if (nextIndex < 0) {
      segments.push({ highlighted: false, text: content.slice(cursor) });
      break;
    }

    if (nextIndex > cursor) {
      segments.push({
        highlighted: false,
        text: content.slice(cursor, nextIndex),
      });
    }

    segments.push({ highlighted: true, text: nextToken });
    cursor = nextIndex + nextToken.length;
  }

  return segments;
}

export function ChatMentionText({
  className,
  content,
  mentionClassName,
  mentionLabels,
  mentionsEveryone,
}: {
  className?: string;
  content: string;
  mentionClassName?: string;
  mentionLabels: string[];
  mentionsEveryone: boolean;
}) {
  const segments = splitMentionText(content, mentionLabels, mentionsEveryone);

  return (
    <span className={cn("whitespace-pre-wrap break-words", className)}>
      {segments.map((segment, index) => (
        <Fragment key={`${index}:${segment.text}`}>
          {segment.highlighted ? (
            <span className={cn("font-bold text-[#7A2FBE]", mentionClassName)}>
              {segment.text}
            </span>
          ) : (
            segment.text
          )}
        </Fragment>
      ))}
    </span>
  );
}

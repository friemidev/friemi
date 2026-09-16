export type ChatMessageSubmission = {
  body: string;
  imageUrls: string[];
};

export function splitChatMessageSubmissions(
  body: string,
  imageUrls: string[],
): ChatMessageSubmission[] {
  const trimmedBody = body.trim();

  if (imageUrls.length === 0) {
    return trimmedBody ? [{ body: trimmedBody, imageUrls: [] }] : [];
  }

  return imageUrls.map((imageUrl, index) => ({
    body: index === 0 ? trimmedBody : "",
    imageUrls: [imageUrl],
  }));
}

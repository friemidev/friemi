import type { ImgHTMLAttributes } from "react";

/** Static component audit: the preview has no Next image optimizer. */
export default function PreviewImage({ priority, ...props }: ImgHTMLAttributes<HTMLImageElement> & { priority?: boolean }) {
  return <img {...props} fetchPriority={priority ? "high" : props.fetchPriority}/>;
}

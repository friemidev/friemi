import type { AnchorHTMLAttributes } from "react";

/** Preserve native navigation and accessibility in the standalone preview. */
export default function PreviewLink(props: AnchorHTMLAttributes<HTMLAnchorElement>) {
  return <a {...props}/>;
}

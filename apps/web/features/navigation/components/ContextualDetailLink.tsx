"use client";

import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import {
  type DetailSourceInput,
  saveDetailSourceContext,
} from "@/features/navigation/contextualDetailReturn";

type ContextualDetailLinkProps = Omit<ComponentProps<typeof Link>, "href"> & {
  children: ReactNode;
  detailSource?: DetailSourceInput;
  href: string;
};

export function ContextualDetailLink({
  children,
  detailSource,
  href,
  onClick,
  ...props
}: ContextualDetailLinkProps) {
  return (
    <Link
      {...props}
      href={href}
      onClick={(event) => {
        if (detailSource) {
          saveDetailSourceContext(detailSource, href);
        }
        onClick?.(event);
      }}
    >
      {children}
    </Link>
  );
}


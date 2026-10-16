import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { ReactNode } from "react";
import styles from "./HomeSectionLink.module.css";

export function HomeSectionLink({
  href,
  label,
  children,
}: {
  href: string;
  label: string;
  children: ReactNode;
}) {
  return (
    <Link href={href} aria-label={label} className={styles.link}>
      {children}
      <ArrowRight size={15} aria-hidden="true" />
    </Link>
  );
}

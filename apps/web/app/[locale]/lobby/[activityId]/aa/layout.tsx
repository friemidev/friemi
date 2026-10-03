import type { ReactNode } from "react";
import styles from "./layout.module.css";

export default function AaLayout({ children }: { children: ReactNode }) {
  return <div className={styles.route}>{children}</div>;
}

"use client";

import { AppRecoveryScreen } from "@/components/ui/AppRecoveryScreen";
import styles from "@/components/ui/AppRecoveryScreen.module.css";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  void error;

  return (
    <html
      className={styles.document}
      lang="zh-CN"
      suppressHydrationWarning
    >
      <body className={styles.body} suppressHydrationWarning>
        <AppRecoveryScreen
          fullScreen
          onRefresh={() => {
            reset();
            window.setTimeout(() => window.location.reload(), 80);
          }}
        />
      </body>
    </html>
  );
}

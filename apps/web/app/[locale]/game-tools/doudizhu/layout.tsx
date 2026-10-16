import type { ReactNode } from "react";
import s from "./layout.module.css";

/** Server-rendered scope: immersive room sizing also applies before hydration. */
export default function DoudizhuLayout({ children }: { children: ReactNode }) {
  return (
    <div className={s.route} data-ddz-viewport-route>
      {children}
    </div>
  );
}

import type { Metadata } from "next";
import "./online.css";
export const metadata: Metadata = { robots: { index: false, follow: false } };
export default function DiceOnlineLayout({ children }: { children: React.ReactNode }) { return children; }

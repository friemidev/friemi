import { redirect } from "next/navigation";

export default function SafetyRedirectPage() {
  redirect("/zh-CN/safety");
}

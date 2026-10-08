import { redirect } from "next/navigation";
import { defaultLocale } from "@chill-club/shared";

export default function RootPage() {
  redirect(`/${defaultLocale}/home`);
}

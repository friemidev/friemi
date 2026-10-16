import Image from "next/image";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export function UnoComingSoon({ locale }: { locale: string }) {
  const copy = locale === "en" ? { soon: "Coming soon", back: "Back to games" }
    : locale === "fr" ? { soon: "Bientôt", back: "Retour aux jeux" }
      : { soon: "敬请期待", back: "返回游戏" };

  return <main className="mx-auto flex min-h-[65dvh] w-full max-w-xl flex-col items-center justify-center gap-5 px-6 py-12 text-center text-ink">
    <Image src="/game-tools/uno/logo.png" alt="UNO" width={320} height={320} priority className="h-auto w-full max-w-72 rounded-3xl object-contain"/>
    <h1 className="text-2xl font-black">UNO</h1>
    <p className="text-base text-ink/70">{copy.soon}</p>
    <Link href={`/${locale}/game-tools`} className="mt-3 inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-forest px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-meadow focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-forest">
      <ArrowLeft size={18} aria-hidden="true"/>{copy.back}
    </Link>
  </main>;
}

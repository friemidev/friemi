import Link from "next/link";

type LocaleSwitcherProps = {
  locale: string;
};

export function LocaleSwitcher({ locale }: LocaleSwitcherProps) {
  const nextLocale = locale === "zh-CN" ? "en" : "zh-CN";

  return (
    <Link className="rounded-md px-2.5 py-2 text-sm text-zinc-600 hover:bg-white/70" href={`/${nextLocale}`}>
      {locale === "zh-CN" ? "EN" : "中文"}
    </Link>
  );
}

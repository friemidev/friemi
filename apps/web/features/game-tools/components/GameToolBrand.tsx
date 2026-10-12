import Image from "next/image";
import Link from "next/link";
import styles from "./GameToolBrand.module.css";

type GameToolBrandProps = {
  game: string;
  href?: string;
  compactOnMobile?: boolean;
  showGameOnNarrow?: boolean;
};

export function GameToolBrand({ game, href, compactOnMobile = false, showGameOnNarrow = false }: GameToolBrandProps) {
  const content = <>
    <span className={styles.logoWindow}>
      <Image src="/brand/v2_1/friemi-title-navy.png" alt="Friemi" width={194} height={61} className={styles.logo} priority />
    </span>
    <span aria-hidden="true" className={`${styles.divider} ${compactOnMobile ? styles.compactDivider : ""} ${showGameOnNarrow ? styles.showOnNarrow : ""}`} />
    <strong className={`${styles.game} ${compactOnMobile ? styles.compactGame : ""} ${showGameOnNarrow ? styles.showOnNarrow : ""}`}>{game}</strong>
  </>;

  return href
    ? <Link href={href} aria-label={`Friemi · ${game}`} className={styles.brand}>{content}</Link>
    : <span aria-label={`Friemi · ${game}`} className={styles.brand}>{content}</span>;
}

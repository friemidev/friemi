"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { DRAW_GUESS_CATS, getDrawGuessCatName, type DrawGuessCatId } from "../drawGuessCats";
import { getUnoCopy } from "../unoCopy";
import { DrawGuessCatSprite } from "./DrawGuessCatSprite";
import { UnoDialog } from "./UnoChrome";
import s from "./UnoGame.module.css";

export function UnoCharacterPicker({ catId, locale, busy, error, onSelect, onClose }: {
  catId: DrawGuessCatId; locale: string; busy: boolean; error?: string;
  onSelect: (catId: DrawGuessCatId) => Promise<boolean>; onClose: () => void;
}) {
  const t = getUnoCopy(locale);
  const [selected, setSelected] = useState(catId);
  const [saving, setSaving] = useState(false);
  const locked = busy || saving;
  async function choose() {
    if (locked) return;
    if (selected === catId) { onClose(); return; }
    setSaving(true);
    try { if (await onSelect(selected)) onClose(); }
    finally { setSaving(false); }
  }
  return <UnoDialog title={t.characterTitle} className={s.characterDialog} onClose={saving ? undefined : onClose}>
    <div className={s.characterSpotlight}>
      <span className={s.characterStage}><DrawGuessCatSprite catId={selected} animated mood="happy" performance="wave" size={108}/></span>
      <strong>{getDrawGuessCatName(selected, locale)}</strong>
    </div>
    <div className={s.characterGrid} aria-label={t.changeCharacter}>
      {DRAW_GUESS_CATS.map(cat => <button type="button" key={cat.id} aria-pressed={selected === cat.id} disabled={locked} onClick={() => setSelected(cat.id)} className={s.characterOption}>
        <DrawGuessCatSprite catId={cat.id} size={62}/><span>{getDrawGuessCatName(cat.id, locale)}</span>
        {selected === cat.id && <Check className={s.characterCheck} size={14} aria-hidden="true"/>}
      </button>)}
    </div>
    <div className={s.characterFooter}>
      {error && <p role="alert" className={s.inlineError}>{error}</p>}
      <button type="button" className={`${s.button} ${s.primary}`} disabled={locked} onClick={() => void choose()}>{saving ? t.characterSaving : t.useCharacter}</button>
      <button type="button" className={s.textButton} disabled={saving} onClick={onClose}>{t.cancel}</button>
    </div>
  </UnoDialog>;
}

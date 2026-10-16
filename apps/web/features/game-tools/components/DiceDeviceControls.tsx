"use client";

import { useEffect, useRef, useState } from "react";
import { Smartphone, Volume2, VolumeX } from "lucide-react";
import { diceDeviceCopy } from "../diceDeviceCopy";
import { createDiceAudio, createMotionRoller, type MotionState } from "../dice-preview/runtime/dice-device.js";

export function DiceDeviceControls({ locale, showShake, canRoll, onRoll, soundCue }: {
  locale: string; showShake: boolean; canRoll: boolean; onRoll(): void; soundCue: string | null;
}) {
  const t = diceDeviceCopy[locale as keyof typeof diceDeviceCopy] ?? diceDeviceCopy.en;
  const [motionState, setMotionState] = useState<MotionState>("off");
  const [soundOn, setSoundOn] = useState(false);
  const [soundError, setSoundError] = useState(false);
  const latest = useRef({ canRoll, onRoll }); latest.current = { canRoll: showShake && canRoll, onRoll };
  const motion = useRef<ReturnType<typeof createMotionRoller> | null>(null);
  const audio = useRef<ReturnType<typeof createDiceAudio> | null>(null);
  const soundChosen = useRef(false);
  const soundEnabled = useRef(false);
  const motionOperation = useRef(0);
  const soundOperation = useRef(0);
  const previousCue = useRef(soundCue);
  useEffect(() => {
    const player = createDiceAudio();
    const roller = createMotionRoller({ canRoll: () => latest.current.canRoll, onRoll: () => latest.current.onRoll(), onState: setMotionState });
    motion.current = roller; audio.current = player;
    const onHide = () => { motionOperation.current += 1; soundOperation.current += 1; roller.disable(); player.disable(); soundEnabled.current = false; setSoundOn(false); };
    window.addEventListener("pagehide", onHide);
    const onVisibility = () => { if (document.hidden) player.stop(); };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      motionOperation.current += 1; soundOperation.current += 1; roller.destroy(); player.dispose();
      motion.current = null; audio.current = null;
      window.removeEventListener("pagehide", onHide); document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);
  useEffect(() => {
    if (showShake) return;
    motionOperation.current += 1; motion.current?.disable();
    if (!soundChosen.current && !soundEnabled.current) audio.current?.disable();
  }, [showShake]);
  useEffect(() => { motion.current?.reset(); }, [canRoll]);
  useEffect(() => {
    if (soundCue !== previousCue.current) audio.current?.stop();
    if (soundCue && soundCue !== previousCue.current && soundEnabled.current) {
      const operation = soundOperation.current;
      void audio.current?.roll(window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 140 : 900, 5, { covered: true }).then((status) => {
        if (status !== "blocked" || operation !== soundOperation.current || previousCue.current !== soundCue || !audio.current || !soundEnabled.current || document.hidden) return;
        soundOperation.current += 1; audio.current.disable(); soundEnabled.current = false; setSoundOn(false); setSoundError(true);
      });
    }
    previousCue.current = soundCue;
  }, [soundCue]);
  async function toggleMotion() {
    const current = ++motionOperation.current, audioOperation = soundOperation.current;
    if (!motion.current || !audio.current) return;
    if (motionState === "on" || motionState === "waiting") { motion.current.disable(); if (!soundChosen.current && !soundEnabled.current) audio.current.disable(); return; }
    const permission = motion.current.enable();
    const unlockSound = soundChosen.current ? null : audio.current.enable();
    const enabled = await permission;
    if (unlockSound) {
      const audible = await unlockSound;
      if (current !== motionOperation.current || audioOperation !== soundOperation.current || soundChosen.current) return;
      if (!enabled) { audio.current?.disable(); soundEnabled.current = false; setSoundOn(false); return; }
      soundEnabled.current = audible; setSoundOn(audible); setSoundError(!audible);
    }
  }
  async function toggleSound() {
    const current = ++soundOperation.current;
    soundChosen.current = true; setSoundError(false);
    if (soundEnabled.current) { audio.current?.disable(); soundEnabled.current = false; setSoundOn(false); return; }
    soundEnabled.current = true; setSoundOn(true);
    const enabled = await audio.current?.enable() ?? false;
    if (current !== soundOperation.current) return;
    soundEnabled.current = enabled; setSoundOn(enabled); setSoundError(!enabled);
  }
  const pending = motionState === "requesting";
  const message = pending ? t.requesting : motionState === "denied" ? t.denied : motionState === "unsupported" ? t.unsupported : motionState === "unavailable" ? t.unavailable : soundError ? t.soundError : "";
  return <div className="dice-online-device-settings">
    <div className="dice-online-device-row">
      {showShake ? <button className="dice-online-shake-switch" type="button" role="switch" aria-checked={motionState === "on" || motionState === "waiting"} aria-busy={pending} disabled={pending} title={t.shakeHint} onClick={() => void toggleMotion()}><Smartphone size={18} /><span>{t.shake}</span><i aria-hidden="true" /></button> : null}
      <button className="dice-online-sound" type="button" aria-label={soundOn ? t.soundOff : t.soundOn} aria-pressed={soundOn} onClick={() => void toggleSound()}>{soundOn ? <Volume2 size={19} /> : <VolumeX size={19} />}</button>
    </div>
    {message ? <p className="dice-online-device-note" role="status">{message}</p> : null}
  </div>;
}

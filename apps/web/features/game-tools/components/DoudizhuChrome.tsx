"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { ArrowLeft, HelpCircle, X } from "lucide-react";
import { getDoudizhuCopy } from "../doudizhuCopy";
import { DrawGuessCatSprite } from "./DrawGuessCatSprite";
import {
  getDrawGuessCat,
  DRAW_GUESS_CATS,
  getDrawGuessCatName,
  type DrawGuessCatId,
} from "../drawGuessCats";
import s from "./DoudizhuGame.module.css";

export function DoudizhuDialog({
  title,
  children,
  onClose,
  closeLabel = "Close",
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  closeLabel?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null),
    heading = useRef<HTMLHeadingElement>(null),
    close = useRef(onClose);
  close.current = onClose;
  useEffect(() => {
    const node = ref.current,
      trigger =
        document.activeElement instanceof HTMLElement
          ? document.activeElement
          : null;
    const portrait = matchMedia(
      "(max-width: 767px) and (orientation: portrait)",
    );
    const dismissHiddenTableDialog = () => {
      if (!portrait.matches || !node?.closest("[data-ddz-orientation]"))
        return false;
      // A hidden, open native dialog still makes the rotation prompt inert.
      node.close();
      close.current();
      return true;
    };
    if (!dismissHiddenTableDialog()) {
      node?.showModal();
      heading.current?.focus();
    }
    portrait.addEventListener("change", dismissHiddenTableDialog);
    return () => {
      portrait.removeEventListener("change", dismissHiddenTableDialog);
      node?.close();
      if (trigger?.isConnected) trigger.focus({ preventScroll: true });
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className={s.dialog}
      aria-label={title}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          const r = e.currentTarget.getBoundingClientRect();
          if (
            e.clientX < r.left ||
            e.clientX > r.right ||
            e.clientY < r.top ||
            e.clientY > r.bottom
          )
            onClose();
        }
      }}
      onKeyDown={(e) => {
        if (e.key !== "Tab") return;
        const controls = Array.from(
          e.currentTarget.querySelectorAll<HTMLElement>(
            "button,a[href],input,select,textarea,summary,[tabindex]",
          ),
        ).filter(
          (el) =>
            el.tabIndex >= 0 &&
            !el.matches(":disabled,[inert]") &&
            el.getClientRects().length &&
            getComputedStyle(el).visibility !== "hidden",
        );
        const first = controls[0],
          last = controls.at(-1);
        if (
          e.shiftKey &&
          (document.activeElement === first ||
            document.activeElement === heading.current)
        ) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }}
    >
      <div className={s.dialogHeader}>
        <h2 ref={heading} tabIndex={-1}>
          {title}
        </h2>
        <button
          type="button"
          className={s.iconButton}
          onClick={onClose}
          aria-label={closeLabel}
        >
          <X size={20} />
        </button>
      </div>
      {children}
    </dialog>
  );
}
export function DoudizhuHeader({
  locale,
  code,
  onBack,
  children,
}: {
  locale: string;
  code?: string;
  onBack?: () => void;
  children?: ReactNode;
}) {
  const t = getDoudizhuCopy(locale),
    [rules, setRules] = useState(false);
  return (
    <>
      <header className={s.header}>
        {onBack ? (
          <button
            className={s.iconButton}
            onClick={onBack}
            aria-label={t.leave}
          >
            <ArrowLeft size={21} />
          </button>
        ) : (
          <a
            className={s.iconButton}
            href={`/${locale}/game-tools`}
            aria-label={t.back}
          >
            <ArrowLeft size={21} />
          </a>
        )}
        <a className={s.brand} href={`/${locale}/game-tools/doudizhu`}>
          <span aria-hidden="true" className={s.brandMark}>
            ♠
          </span>
          {t.title}
        </a>
        {code && (
          <span className={s.roomCode}>
            {t.room}
            <br />
            <b>{code}</b>
          </span>
        )}
        <div className={s.headerTools}>
          {children}
          <button
            className={s.iconButton}
            onClick={() => setRules(true)}
            aria-label={t.rules}
          >
            <HelpCircle size={21} />
          </button>
        </div>
      </header>
      {rules && (
        <DoudizhuDialog
          title={t.rules}
          closeLabel={t.close}
          onClose={() => setRules(false)}
        >
          <ol className={s.rulesList}>
            {t.rulesLines.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ol>
          <button
            className={`${s.button} ${s.primary}`}
            onClick={() => setRules(false)}
          >
            {t.close}
          </button>
        </DoudizhuDialog>
      )}
    </>
  );
}
export function DoudizhuCat({
  catId,
  active = false,
  ready = false,
  winner = false,
  size = 80,
}: {
  catId?: string;
  active?: boolean;
  ready?: boolean;
  winner?: boolean;
  size?: number;
}) {
  const [celebrating, setCelebrating] = useState(false);
  useEffect(() => {
    if (!ready && !winner) {
      setCelebrating(false);
      return;
    }
    setCelebrating(true);
    const timer = setTimeout(() => setCelebrating(false), winner ? 2200 : 900);
    return () => clearTimeout(timer);
  }, [ready, winner]);
  return (
    <DrawGuessCatSprite
      catId={getDrawGuessCat(catId).id}
      size={size}
      animated={active || celebrating}
      mood={winner || ready ? "happy" : "idle"}
      activity={active ? "thinking" : "none"}
      performance={winner ? "champion" : ready ? "clap" : "default"}
    />
  );
}
export function DoudizhuCatPicker({
  locale,
  catId,
  busy,
  onSelect,
  onClose,
  error = "",
  onRetry,
}: {
  locale: string;
  catId: string;
  busy?: boolean;
  onSelect: (id: DrawGuessCatId) => void | boolean | Promise<boolean>;
  onClose: () => void;
  error?: string;
  onRetry?: () => void;
}) {
  const t = getDoudizhuCopy(locale);
  const [submitting, setSubmitting] = useState(false),
    [failed, setFailed] = useState(false);
  const submitted = useRef<DrawGuessCatId | null>(null),
    mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  useEffect(() => {
    if (failed && submitted.current === catId && !busy) onClose();
  }, [catId, busy, failed, onClose]);
  async function select(id: DrawGuessCatId) {
    if (busy || submitting) return;
    if (id === catId) {
      onClose();
      return;
    }
    submitted.current = id;
    setSubmitting(true);
    setFailed(false);
    try {
      const accepted = await onSelect(id);
      if (!mounted.current) return;
      if (accepted === false) setFailed(true);
      else onClose();
    } catch {
      if (mounted.current) setFailed(true);
    } finally {
      if (mounted.current) setSubmitting(false);
    }
  }
  return (
    <DoudizhuDialog title={t.chooseCat} closeLabel={t.close} onClose={onClose}>
      {failed && (
        <div className={s.feedback} role="alert">
          <span>{error || t.changed}</span>
          {onRetry && (
            <button
              className={s.textButton}
              disabled={submitting}
              onClick={onRetry}
            >
              {t.retry}
            </button>
          )}
        </div>
      )}
      <div className={s.catGrid}>
        {DRAW_GUESS_CATS.map((cat) => (
          <button
            key={cat.id}
            type="button"
            className={s.catOption}
            aria-pressed={catId === cat.id}
            disabled={busy || submitting}
            onClick={() => void select(cat.id)}
          >
            <DrawGuessCatSprite catId={cat.id} size={64} animated={false} />
            <span>{getDrawGuessCatName(cat.id, locale)}</span>
          </button>
        ))}
      </div>
      <button
        className={`${s.button} ${s.primary}`}
        style={{ marginTop: 16, width: "100%" }}
        onClick={onClose}
      >
        {t.close}
      </button>
    </DoudizhuDialog>
  );
}

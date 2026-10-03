"use client";

import { useEffect, useMemo, useRef, useState, type PointerEvent } from "react";
import { createPortal } from "react-dom";
import { Clock3, Eraser, Maximize2, Minimize2, RotateCcw, Send, Trash2 } from "lucide-react";
import { DrawGuessCatSprite } from "@/features/game-tools/components/DrawGuessCatSprite";
import type { DrawStroke } from "@/features/game-tools/drawGuessEngine";

const COLORS = ["#30425C", "#E46D79", "#E9AA41", "#448EA4", "#8D70B1", "#56A776"];

function pathFor(points: DrawStroke["points"]) {
  if (!points.length) return "";
  const first = points[0];
  return `M ${first[0] * 1000} ${first[1] * 700} ${points.slice(1).map(([x, y]) => `L ${x * 1000} ${y * 700}`).join(" ")}`;
}

export function DrawGuessArtwork({ strokes, className = "" }: { strokes: DrawStroke[]; className?: string }) {
  return <svg aria-label="Artwork" className={`h-full w-full touch-none bg-white ${className}`} viewBox="0 0 1000 700" preserveAspectRatio="xMidYMid meet">
    {strokes.map((stroke, index) => stroke.points.length === 1
      ? <circle key={index} cx={stroke.points[0][0] * 1000} cy={stroke.points[0][1] * 700} r={stroke.width / 2} fill={stroke.color} />
      : <path key={index} d={pathFor(stroke.points)} fill="none" stroke={stroke.color} strokeLinecap="round" strokeLinejoin="round" strokeWidth={stroke.width} />)}
  </svg>;
}

export function DrawGuessCanvas({ catId, compact = false, disabled = false, fullscreenPrompt, fullscreenTimer, locale = "en", onClear, onProgress, onStroke, onSubmit, onUndo, strokes, submitDisabled = false }: {
  catId?: string | null;
  compact?: boolean;
  disabled?: boolean;
  fullscreenPrompt?: string;
  fullscreenTimer?: string;
  locale?: string;
  onClear?: () => void;
  onProgress?: (stroke: DrawStroke) => void;
  onStroke?: (stroke: DrawStroke) => void;
  onSubmit?: () => void;
  onUndo?: () => void;
  strokes: DrawStroke[];
  submitDisabled?: boolean;
}) {
  const surfaceRef = useRef<SVGSVGElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const currentRef = useRef<DrawStroke | null>(null);
  const [current, setCurrent] = useState<DrawStroke | null>(null);
  const [color, setColor] = useState(COLORS[0]);
  const [width, setWidth] = useState(6);
  const [compactSize, setCompactSize] = useState<{ width: number; height: number } | null>(null);
  const [fullscreen, setFullscreen] = useState(false);
  const fullscreenRef = useRef(false);
  const nativeFullscreenOwned = useRef(false);
  const copy = locale === "zh-CN" ? { enter: "横屏全屏作画", enterShort: "横屏", exit: "退出全屏", draw: "横屏画布", time: "剩余时间", submit: "提交画作" }
    : locale === "fr" ? { enter: "Dessiner en plein écran", enterShort: "Plein écran", exit: "Quitter le plein écran", draw: "Toile horizontale", time: "Temps restant", submit: "Envoyer le dessin" }
    : { enter: "Draw in landscape fullscreen", enterShort: "Full screen", exit: "Exit fullscreen", draw: "Landscape canvas", time: "Time left", submit: "Submit drawing" };
  const committedPaths = useMemo(() => strokes.map((stroke, index) => stroke.points.length === 1
    ? <circle key={index} cx={stroke.points[0][0] * 1000} cy={stroke.points[0][1] * 700} r={stroke.width / 2} fill={stroke.color} />
    : <path key={index} d={pathFor(stroke.points)} fill="none" stroke={stroke.color} strokeLinecap="round" strokeLinejoin="round" strokeWidth={stroke.width} />), [strokes]);

  useEffect(() => {
    if (!compact || !frameRef.current) return;
    const frame = frameRef.current;
    const updateSize = () => {
      const canvasWidth = Math.max(1, Math.min(frame.clientWidth - 16, (frame.clientHeight - 16) * 10 / 7));
      setCompactSize({ width: canvasWidth, height: canvasWidth * 7 / 10 });
    };
    const observer = new ResizeObserver(updateSize);
    observer.observe(frame);
    updateSize();
    return () => observer.disconnect();
  }, [compact, fullscreen]);

  useEffect(() => {
    if (!fullscreen) return;
    const onEscape = (event: KeyboardEvent) => { if (event.key === "Escape") closeFullscreen(); };
    const onFullscreenChange = () => {
      if (nativeFullscreenOwned.current && !document.fullscreenElement) {
        nativeFullscreenOwned.current = false;
        fullscreenRef.current = false;
        setFullscreen(false);
        unlockOrientation();
      }
    };
    window.addEventListener("keydown", onEscape);
    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => {
      window.removeEventListener("keydown", onEscape);
      document.removeEventListener("fullscreenchange", onFullscreenChange);
    };
  }, [fullscreen]);

  useEffect(() => () => {
    fullscreenRef.current = false;
    if (nativeFullscreenOwned.current && document.fullscreenElement === document.documentElement) void document.exitFullscreen().catch(() => {});
    if (nativeFullscreenOwned.current) unlockOrientation();
    nativeFullscreenOwned.current = false;
  }, []);

  function unlockOrientation() {
    try { screen.orientation?.unlock?.(); } catch { /* The browser may already have unlocked orientation. */ }
  }

  async function openFullscreen() {
    if (fullscreenRef.current) return;
    fullscreenRef.current = true;
    setFullscreen(true);
    try {
      if (!document.fullscreenElement && document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen();
        if (!fullscreenRef.current) { await document.exitFullscreen().catch(() => {}); return; }
        nativeFullscreenOwned.current = true;
        try { await (screen.orientation as ScreenOrientation & { lock?: (orientation: string) => Promise<void> } | undefined)?.lock?.("landscape"); } catch { /* CSS keeps the canvas landscape when orientation lock is unavailable. */ }
      }
    } catch { /* The fixed landscape canvas also works where native fullscreen is unavailable. */ }
  }

  function closeFullscreen() {
    fullscreenRef.current = false;
    setFullscreen(false);
    if (nativeFullscreenOwned.current) {
      nativeFullscreenOwned.current = false;
      unlockOrientation();
      if (document.fullscreenElement === document.documentElement) void document.exitFullscreen().catch(() => {});
    }
  }

  function point(event: PointerEvent<SVGSVGElement>): [number, number] {
    const matrix = surfaceRef.current?.getScreenCTM();
    if (matrix) {
      const local = new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix.inverse());
      return [Math.min(1, Math.max(0, local.x / 1000)), Math.min(1, Math.max(0, local.y / 700))];
    }
    const bounds = surfaceRef.current!.getBoundingClientRect();
    const canvasWidth = Math.min(bounds.width, bounds.height * 10 / 7);
    const canvasHeight = canvasWidth * 7 / 10;
    const left = bounds.left + (bounds.width - canvasWidth) / 2;
    const top = bounds.top + (bounds.height - canvasHeight) / 2;
    return [Math.min(1, Math.max(0, (event.clientX - left) / canvasWidth)), Math.min(1, Math.max(0, (event.clientY - top) / canvasHeight))];
  }

  function finish() {
    if (currentRef.current) onStroke?.(currentRef.current);
    currentRef.current = null;
    setCurrent(null);
  }

  const canvas = <div className={fullscreen ? "draw-guess-landscape-shell draw-guess-theme draw-guess-play-stage" : compact ? "flex h-full min-h-0 flex-col gap-2" : "space-y-3"}>
    {fullscreen ? <div className="draw-guess-landscape-header">
      <span className="min-w-0 flex-1 truncate text-sm font-black text-[#30425C]">{fullscreenPrompt || copy.draw}</span>
      {fullscreenTimer ? <span aria-label={copy.time} className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1 font-mono text-sm font-black tabular-nums text-[#3E6FA8]"><Clock3 className="h-4 w-4" />{fullscreenTimer}</span> : null}
      {onSubmit ? <button type="button" disabled={submitDisabled || !strokes.length || Boolean(current)} onClick={onSubmit} className="draw-guess-btn draw-guess-btn--candy min-h-9 gap-1 px-3 text-xs disabled:opacity-60"><Send className="h-4 w-4" />{copy.submit}</button> : null}
      <button type="button" aria-label={copy.exit} onClick={closeFullscreen} className="draw-guess-btn draw-guess-btn--milk grid h-9 min-h-9 w-9 place-items-center"><Minimize2 className="h-4 w-4" /></button>
    </div> : null}
    <div className={fullscreen ? "draw-guess-landscape-body" : compact ? "contents" : "space-y-3"}>
    <div ref={frameRef} className={`relative min-w-0 overflow-hidden rounded-[1.4rem] ${compact ? "draw-guess-paper-stage grid min-h-0 flex-1 place-items-center bg-[#F3F8FC] p-2" : "border-2 border-[#C9DCEC] bg-white shadow-[0_16px_38px_rgba(48,66,92,0.1)]"}`}>
      {compact ? <svg aria-hidden="true" className="pointer-events-none absolute right-5 top-5 h-9 w-9 rotate-12 text-[#B7D0E8]/65" viewBox="0 0 40 40" fill="currentColor"><ellipse cx="20" cy="27" rx="10" ry="8" /><ellipse cx="8" cy="18" rx="3" ry="4" transform="rotate(-20 8 18)" /><ellipse cx="16" cy="10" rx="3" ry="4" transform="rotate(-8 16 10)" /><ellipse cx="25" cy="10" rx="3" ry="4" transform="rotate(8 25 10)" /><ellipse cx="33" cy="18" rx="3" ry="4" transform="rotate(20 33 18)" /></svg> : null}
      {compact && catId ? <span aria-hidden="true" className="pointer-events-none absolute left-3 top-2"><DrawGuessCatSprite catId={catId} size={52} /></span> : null}
      <svg ref={surfaceRef} aria-label="Drawing canvas" className={`${compact ? "relative aspect-[10/7] max-h-full max-w-full rounded-[1.2rem] border-[3px] border-[#C6DBEC] shadow-[0_7px_0_#DFE9F2,0_18px_30px_rgba(48,66,92,0.12)]" : "aspect-[10/7] w-full"} touch-none select-none bg-white`} style={compact && compactSize ? compactSize : undefined} viewBox="0 0 1000 700" preserveAspectRatio="xMidYMid meet"
        onPointerDown={(event) => { if (disabled) return; event.preventDefault(); event.currentTarget.setPointerCapture(event.pointerId); const stroke = { color, width, points: [point(event)] } satisfies DrawStroke; currentRef.current = stroke; setCurrent(stroke); onProgress?.(stroke); }}
        onPointerMove={(event) => { if (!currentRef.current || disabled) return; const nextPoint = point(event); const points = currentRef.current.points; const last = points.at(-1)!; if (points.length >= 512 || Math.hypot((nextPoint[0] - last[0]) * 1000, (nextPoint[1] - last[1]) * 700) < 2) return; const next = { ...currentRef.current, points: [...points, nextPoint] }; currentRef.current = next; setCurrent(next); onProgress?.(next); }}
        onPointerUp={finish} onPointerCancel={finish}>
        {committedPaths}
        {current ? current.points.length === 1
          ? <circle cx={current.points[0][0] * 1000} cy={current.points[0][1] * 700} r={current.width / 2} fill={current.color} />
          : <path d={pathFor(current.points)} fill="none" stroke={current.color} strokeLinecap="round" strokeLinejoin="round" strokeWidth={current.width} /> : null}
      </svg>
    </div>
    {!disabled ? <div className={`draw-guess-canvas-tools flex shrink-0 flex-col gap-2 rounded-2xl bg-[#ECF4FB] ${compact ? "p-1.5 sm:p-2" : "p-2.5"} sm:flex-row sm:items-center`}>
      <div className="draw-guess-canvas-palette flex items-center justify-center gap-1.5 sm:justify-start">
        {COLORS.map((value) => <button key={value} type="button" aria-label={`Color ${value}`} aria-pressed={color === value} onClick={() => setColor(value)} className={`h-8 w-8 shrink-0 rounded-full border-[3px] border-white shadow-[0_3px_0_#D8E5F1] transition-transform duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#3F74AE] motion-safe:hover:-translate-y-0.5 motion-safe:active:translate-y-0.5 sm:h-9 sm:w-9 ${color === value ? "ring-2 ring-[#3F74AE] ring-offset-1" : ""}`} style={{ backgroundColor: value }} />)}
        <button type="button" aria-label="Eraser" aria-pressed={color === "#FFFFFF"} onClick={() => setColor("#FFFFFF")} className={`grid h-8 w-8 shrink-0 place-items-center rounded-full border-[3px] border-white bg-[#FFFCF5] text-[#405875] shadow-[0_3px_0_#D8E5F1] transition-transform focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#3F74AE] motion-safe:hover:-translate-y-0.5 sm:h-9 sm:w-9 ${color === "#FFFFFF" ? "ring-2 ring-[#3F74AE] ring-offset-1" : ""}`}><Eraser className="h-4 w-4" /></button>
      </div>
      <div className="draw-guess-canvas-actions flex items-center justify-between gap-2 sm:ml-auto">
        <label className="flex items-center gap-2 rounded-full bg-white/80 px-2.5 py-1 text-xs font-black tabular-nums text-[#405875]">{width}<input aria-label="Brush width" className="w-24 accent-[#3F74AE] sm:w-16" type="range" min="2" max="18" value={width} onChange={(event) => setWidth(Number(event.target.value))} /></label>
        <div className="flex items-center gap-1.5">
          {onUndo ? <button type="button" disabled={!strokes.length || Boolean(current)} onClick={onUndo} className="draw-guess-btn draw-guess-btn--milk grid h-9 min-h-9 w-9 place-items-center disabled:opacity-60" aria-label="Undo last stroke"><RotateCcw className="h-4 w-4" /></button> : null}
          {onClear ? <button type="button" disabled={!strokes.length || Boolean(current)} onClick={() => { if (fullscreen) closeFullscreen(); onClear(); }} className="draw-guess-btn draw-guess-btn--blush grid h-9 min-h-9 w-9 place-items-center disabled:opacity-60" aria-label="Clear drawing"><Trash2 className="h-4 w-4" /></button> : null}
          {!fullscreen && compact ? <button type="button" onClick={() => void openFullscreen()} className="draw-guess-btn draw-guess-btn--milk draw-guess-fullscreen-button h-9 min-h-9 gap-1 px-2.5 text-[11px]" aria-label={copy.enter} title={copy.enter}><Maximize2 className="h-4 w-4" /><span className="max-[359px]:sr-only">{copy.enterShort}</span></button> : null}
        </div>
      </div>
    </div> : null}
    </div>
  </div>;
  return fullscreen && typeof document !== "undefined" ? createPortal(canvas, document.body) : canvas;
}

"use client";

import { useEffect, useMemo, useRef, useState, type PointerEvent } from "react";
import { Eraser, RotateCcw, Trash2 } from "lucide-react";
import type { DrawStroke } from "@/features/game-tools/drawGuessEngine";

const COLORS = ["#173D32", "#E46D53", "#E9AA41", "#448EA4", "#8D70B1", "#56A776"];

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

export function DrawGuessCanvas({ compact = false, disabled = false, onClear, onProgress, onStroke, onUndo, strokes }: {
  compact?: boolean;
  disabled?: boolean;
  onClear?: () => void;
  onProgress?: (stroke: DrawStroke) => void;
  onStroke?: (stroke: DrawStroke) => void;
  onUndo?: () => void;
  strokes: DrawStroke[];
}) {
  const surfaceRef = useRef<SVGSVGElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const currentRef = useRef<DrawStroke | null>(null);
  const [current, setCurrent] = useState<DrawStroke | null>(null);
  const [color, setColor] = useState(COLORS[0]);
  const [width, setWidth] = useState(6);
  const [compactSize, setCompactSize] = useState<{ width: number; height: number } | null>(null);
  const committedPaths = useMemo(() => strokes.map((stroke, index) => stroke.points.length === 1
    ? <circle key={index} cx={stroke.points[0][0] * 1000} cy={stroke.points[0][1] * 700} r={stroke.width / 2} fill={stroke.color} />
    : <path key={index} d={pathFor(stroke.points)} fill="none" stroke={stroke.color} strokeLinecap="round" strokeLinejoin="round" strokeWidth={stroke.width} />), [strokes]);

  useEffect(() => {
    if (!compact || !frameRef.current) return;
    const frame = frameRef.current;
    const updateSize = () => {
      const bounds = frame.getBoundingClientRect();
      const canvasWidth = Math.max(1, Math.min(bounds.width - 16, (bounds.height - 16) * 10 / 7));
      setCompactSize({ width: canvasWidth, height: canvasWidth * 7 / 10 });
    };
    const observer = new ResizeObserver(updateSize);
    observer.observe(frame);
    updateSize();
    return () => observer.disconnect();
  }, [compact]);

  function point(event: PointerEvent<SVGSVGElement>): [number, number] {
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

  return <div className={compact ? "flex h-full min-h-0 flex-col gap-2" : "space-y-3"}>
    <div ref={frameRef} className={`overflow-hidden rounded-2xl ${compact ? "grid min-h-0 flex-1 place-items-center bg-[#F7F3EA] p-2" : "border-2 border-[#C8D8CA] bg-white shadow-[0_16px_38px_rgba(31,66,47,0.09)]"}`}>
      <svg ref={surfaceRef} aria-label="Drawing canvas" className={`${compact ? "aspect-[10/7] max-h-full max-w-full rounded-xl border-2 border-[#C8D8CA] shadow-[0_12px_30px_rgba(31,66,47,0.12)]" : "aspect-[10/7] w-full"} touch-none select-none bg-white`} style={compact && compactSize ? compactSize : undefined} viewBox="0 0 1000 700" preserveAspectRatio="xMidYMid meet"
        onPointerDown={(event) => { if (disabled) return; event.preventDefault(); event.currentTarget.setPointerCapture(event.pointerId); const stroke = { color, width, points: [point(event)] } satisfies DrawStroke; currentRef.current = stroke; setCurrent(stroke); onProgress?.(stroke); }}
        onPointerMove={(event) => { if (!currentRef.current || disabled) return; const nextPoint = point(event); const points = currentRef.current.points; const last = points.at(-1)!; if (points.length >= 512 || Math.hypot((nextPoint[0] - last[0]) * 1000, (nextPoint[1] - last[1]) * 700) < 2) return; const next = { ...currentRef.current, points: [...points, nextPoint] }; currentRef.current = next; setCurrent(next); onProgress?.(next); }}
        onPointerUp={finish} onPointerCancel={finish}>
        {committedPaths}
        {current ? current.points.length === 1
          ? <circle cx={current.points[0][0] * 1000} cy={current.points[0][1] * 700} r={current.width / 2} fill={current.color} />
          : <path d={pathFor(current.points)} fill="none" stroke={current.color} strokeLinecap="round" strokeLinejoin="round" strokeWidth={current.width} /> : null}
      </svg>
    </div>
    {!disabled ? <div className={`flex shrink-0 flex-wrap items-center gap-2 rounded-2xl bg-[#F4F0E6] ${compact ? "p-1.5 sm:p-2" : "p-2.5"}`}>
      {COLORS.map((value) => <button key={value} type="button" aria-label={`Color ${value}`} aria-pressed={color === value} onClick={() => setColor(value)} className={`h-9 w-9 rounded-full border-2 border-white shadow-sm transition-transform duration-150 hover:-translate-y-0.5 active:scale-95 ${color === value ? "ring-2 ring-[#173D32] ring-offset-2" : ""}`} style={{ backgroundColor: value }} />)}
      <button type="button" aria-label="Eraser" aria-pressed={color === "#FFFFFF"} onClick={() => setColor("#FFFFFF")} className="grid h-9 w-9 place-items-center rounded-full border border-[#D5D9CA] bg-white transition-transform duration-150 hover:-translate-y-0.5 active:scale-95"><Eraser className="h-4 w-4" /></button>
      <label className="ml-auto flex items-center gap-2 text-xs font-bold text-[#51695A]">{width}<input aria-label="Brush width" className="w-20 accent-[#156240]" type="range" min="2" max="18" value={width} onChange={(event) => setWidth(Number(event.target.value))} /></label>
      {onUndo ? <button type="button" disabled={!strokes.length || Boolean(current)} onClick={onUndo} className="grid h-9 w-9 place-items-center rounded-lg bg-white text-[#51695A] transition-transform duration-150 hover:-translate-y-0.5 active:scale-95 disabled:opacity-40" aria-label="Undo last stroke"><RotateCcw className="h-4 w-4" /></button> : null}
      {onClear ? <button type="button" disabled={!strokes.length || Boolean(current)} onClick={onClear} className="grid h-9 w-9 place-items-center rounded-lg bg-white text-[#9E4B3C] transition-transform duration-150 hover:-translate-y-0.5 active:scale-95 disabled:opacity-40" aria-label="Clear drawing"><Trash2 className="h-4 w-4" /></button> : null}
    </div> : null}
  </div>;
}

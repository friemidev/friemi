"use client";

import { useRef, useState, type PointerEvent } from "react";
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

export function DrawGuessCanvas({ disabled = false, onClear, onProgress, onStroke, onUndo, strokes }: {
  disabled?: boolean;
  onClear?: () => void;
  onProgress?: (stroke: DrawStroke) => void;
  onStroke: (stroke: DrawStroke) => void;
  onUndo?: () => void;
  strokes: DrawStroke[];
}) {
  const surfaceRef = useRef<SVGSVGElement>(null);
  const currentRef = useRef<DrawStroke | null>(null);
  const [current, setCurrent] = useState<DrawStroke | null>(null);
  const [color, setColor] = useState(COLORS[0]);
  const [width, setWidth] = useState(6);

  function point(event: PointerEvent<SVGSVGElement>): [number, number] {
    const bounds = surfaceRef.current!.getBoundingClientRect();
    const canvasWidth = Math.min(bounds.width, bounds.height * 10 / 7);
    const canvasHeight = canvasWidth * 7 / 10;
    const left = bounds.left + (bounds.width - canvasWidth) / 2;
    const top = bounds.top + (bounds.height - canvasHeight) / 2;
    return [Math.min(1, Math.max(0, (event.clientX - left) / canvasWidth)), Math.min(1, Math.max(0, (event.clientY - top) / canvasHeight))];
  }

  function finish() {
    if (currentRef.current) onStroke(currentRef.current);
    currentRef.current = null;
    setCurrent(null);
  }

  return <div className="space-y-3">
    <div className="overflow-hidden rounded-2xl border-2 border-[#C8D8CA] bg-white shadow-[0_16px_38px_rgba(31,66,47,0.09)]">
      <svg ref={surfaceRef} aria-label="Drawing canvas" className="aspect-[10/7] w-full touch-none select-none bg-white" viewBox="0 0 1000 700" preserveAspectRatio="xMidYMid meet"
        onPointerDown={(event) => { if (disabled) return; event.currentTarget.setPointerCapture(event.pointerId); const stroke = { color, width, points: [point(event)] } satisfies DrawStroke; currentRef.current = stroke; setCurrent(stroke); onProgress?.(stroke); }}
        onPointerMove={(event) => { if (!currentRef.current || disabled) return; const nextPoint = point(event); const points = currentRef.current.points; const last = points.at(-1)!; if (points.length >= 512 || Math.hypot((nextPoint[0] - last[0]) * 1000, (nextPoint[1] - last[1]) * 700) < 2) return; const next = { ...currentRef.current, points: [...points, nextPoint] }; currentRef.current = next; setCurrent(next); onProgress?.(next); }}
        onPointerUp={finish} onPointerCancel={finish}>
        {[...strokes, ...(current ? [current] : [])].map((stroke, index) => stroke.points.length === 1
          ? <circle key={index} cx={stroke.points[0][0] * 1000} cy={stroke.points[0][1] * 700} r={stroke.width / 2} fill={stroke.color} />
          : <path key={index} d={pathFor(stroke.points)} fill="none" stroke={stroke.color} strokeLinecap="round" strokeLinejoin="round" strokeWidth={stroke.width} />)}
      </svg>
    </div>
    {!disabled ? <div className="flex flex-wrap items-center gap-2 rounded-2xl bg-[#F4F0E6] p-2.5">
      {COLORS.map((value) => <button key={value} type="button" aria-label={`Color ${value}`} aria-pressed={color === value} onClick={() => setColor(value)} className={`h-8 w-8 rounded-full border-2 border-white shadow-sm ${color === value ? "ring-2 ring-[#173D32] ring-offset-2" : ""}`} style={{ backgroundColor: value }} />)}
      <button type="button" aria-label="Eraser" aria-pressed={color === "#FFFFFF"} onClick={() => setColor("#FFFFFF")} className="grid h-8 w-8 place-items-center rounded-full border border-[#D5D9CA] bg-white"><Eraser className="h-4 w-4" /></button>
      <label className="ml-auto flex items-center gap-2 text-xs font-bold text-[#51695A]">{width}<input aria-label="Brush width" className="w-20 accent-[#156240]" type="range" min="2" max="18" value={width} onChange={(event) => setWidth(Number(event.target.value))} /></label>
      {onUndo ? <button type="button" disabled={!strokes.length || Boolean(current)} onClick={onUndo} className="grid h-8 w-8 place-items-center rounded-lg bg-white text-[#51695A] disabled:opacity-40" aria-label="Undo last stroke"><RotateCcw className="h-4 w-4" /></button> : null}
      {onClear ? <button type="button" disabled={!strokes.length || Boolean(current)} onClick={onClear} className="grid h-8 w-8 place-items-center rounded-lg bg-white text-[#9E4B3C] disabled:opacity-40" aria-label="Clear drawing"><Trash2 className="h-4 w-4" /></button> : null}
    </div> : null}
  </div>;
}

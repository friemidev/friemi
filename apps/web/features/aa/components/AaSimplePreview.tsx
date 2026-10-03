"use client";
import { useState } from "react";
import { createAaExample } from "../domain/simpleFixtures";
import { getSimpleAaCopy } from "../simpleCopy";
import { AaSimpleClient } from "./AaSimpleClient";

export function AaSimplePreview({ locale }: { locale: string }) {
  const [kind, setKind] = useState<"fund" | "ten" | "six" | "empty">("fund");
  const [state, setState] = useState(() => createAaExample());
  const [reset, setReset] = useState(0);
  const copy = getSimpleAaCopy(locale);
  return <div style={{ background: "#f0f2eb", minHeight: "100vh", paddingBottom: 20 }}>
    <aside aria-label={copy.preview} style={{ maxWidth: 720, margin: "0 auto", padding: "18px 16px", display: "flex", flexWrap: "wrap", alignItems: "center", gap: 14, color: "#376046", fontSize: 13 }}>
      <strong style={{ width: "100%", letterSpacing: ".04em" }}>FRIEMI / {copy.preview}</strong>
      <label>{copy.scenario} <select style={{ padding: "8px 5px", borderRadius: 7, background: "white" }} value={kind} onChange={e => { const value = e.target.value as typeof kind; setKind(value); setState(createAaExample(value)); setReset(n => n + 1); }}><option value="fund">€51 · 先转€40</option><option value="ten">€10 ÷ 3</option><option value="six">6 人 · 多人垫付</option><option value="empty">空账本</option></select></label>
      <label>{copy.viewer} <select style={{ padding: "8px 5px", borderRadius: 7, background: "white" }} value={state.viewerId} onChange={e => { const id = e.target.value; setState(s => ({ ...s, viewerId: id, canManage: id === "Lou", canSettle: id === "Lou" })); setReset(n => n + 1); }}>{state.participants.map(p => <option key={p.id}>{p.name}</option>)}</select></label>
      <button style={{ padding: "8px 5px", textDecoration: "underline" }} type="button" onClick={() => { setState(createAaExample(kind)); setReset(n => n + 1); }}>{copy.reset}</button>
    </aside>
    <AaSimpleClient key={reset} initialState={state} onStateChange={setState} locale={locale} preview />
  </div>;
}

"use client";

import { useState, type FormEvent } from "react";
import { Flag } from "lucide-react";

type Reason = "INAPPROPRIATE" | "PERSONAL_INFO" | "HARASSMENT" | "OTHER";

export function DrawGuessReportButton({ kind, locale, ownerSeat, roomId, roundNumber, stage }: {
  kind: "WORD" | "DRAWING";
  locale: string;
  ownerSeat: number;
  roomId: string;
  roundNumber: number;
  stage: number;
}) {
  const zh = locale === "zh-CN";
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<Reason>("INAPPROPRIATE");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    try {
      const response = await fetch(`/api/game-tools/draw-guess/rooms/${roomId}/reports`, {
        body: JSON.stringify({ ownerSeat, reason, roundNumber, stage, targetKind: kind }),
        headers: { "content-type": "application/json" },
        method: "POST",
      });
      const result = await response.json();
      if (!response.ok) {
        setMessage(result.error === "ALREADY_REPORTED" ? zh ? "已举报过这一项" : "Already reported" : zh ? "提交失败，请稍后重试" : "Could not send report");
        return;
      }
      setMessage(zh ? "已提交给审核人员" : "Sent to moderators");
      setOpen(false);
    } catch {
      setMessage(zh ? "网络中断，请稍后重试" : "Connection lost. Try again later.");
    } finally {
      setPending(false);
    }
  }

  return <div className="mt-2 text-xs text-[#66776C]">
    {!message && !open ? <button type="button" onClick={() => setOpen(true)} className="inline-flex min-h-9 items-center gap-1 rounded-lg px-2 font-semibold hover:bg-[#FBECE5] hover:text-[#9E4B3C]"><Flag className="h-3.5 w-3.5" />{zh ? "举报内容" : "Report"}</button> : null}
    {open ? <form onSubmit={submit} className="flex flex-wrap items-center gap-2 rounded-xl border border-[#E5D8D0] bg-[#FFF8F3] p-2">
      <label className="sr-only" htmlFor={`report-${roomId}-${roundNumber}-${ownerSeat}-${stage}`}>{zh ? "举报原因" : "Report reason"}</label>
      <select id={`report-${roomId}-${roundNumber}-${ownerSeat}-${stage}`} value={reason} onChange={(event) => setReason(event.target.value as Reason)} className="min-h-9 rounded-lg border border-[#D8C9C0] bg-white px-2 text-xs">
        <option value="INAPPROPRIATE">{zh ? "不适宜内容" : "Inappropriate"}</option>
        <option value="PERSONAL_INFO">{zh ? "个人信息" : "Personal information"}</option>
        <option value="HARASSMENT">{zh ? "骚扰辱骂" : "Harassment"}</option>
        <option value="OTHER">{zh ? "其他" : "Other"}</option>
      </select>
      <button type="submit" disabled={pending} className="min-h-9 rounded-lg bg-[#9E4B3C] px-3 font-semibold text-white disabled:opacity-50">{pending ? "…" : zh ? "提交" : "Send"}</button>
      <button type="button" disabled={pending} onClick={() => setOpen(false)} className="min-h-9 px-2 font-semibold">{zh ? "取消" : "Cancel"}</button>
    </form> : null}
    {message ? <p role="status" className="px-2 py-1">{message}</p> : null}
  </div>;
}

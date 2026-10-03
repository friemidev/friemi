"use client";

import { useEffect, useId, useMemo, useRef, useState, type FormEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Check, ChevronRight, CircleHelp, Coins, Plus, ReceiptText, RotateCcw, Users, Wallet } from "lucide-react";
import { AA_EXPENSE, AA_PREPAYMENT, AA_SETTLEMENT, applyAaCommand, isPrepaymentRefund, simpleBalances, splitSimpleExpense, type AaCommand, type AaRecord, type AaSimpleState } from "../domain/simpleLedger";
import { formatMinorAmount, parseMoneyToMinor } from "../domain/money";
import { getSimpleAaCopy, getSimpleAaError } from "../simpleCopy";
import { brand } from "../../../lib/brand";
import styles from "./AaSimpleClient.module.css";

export type AaScreen = "overview" | "choose" | "expense" | "prepayment" | "details" | "progress" | "payment" | "record";
type Props = {
  initialState: AaSimpleState; locale: string; initialScreen?: AaScreen; initialRecordId?: string; preview?: boolean;
  onCommand?: (command: AaCommand) => Promise<{ state?: AaSimpleState; error?: string }>;
  onStateChange?: (state: AaSimpleState) => void;
};

export function AaSimpleClient({ initialState, locale, initialScreen = "overview", initialRecordId, preview = false, onCommand, onStateChange }: Props) {
  const [state, setState] = useState(initialState);
  const [screen, setScreen] = useState<AaScreen>(initialScreen);
  const [tab, setTab] = useState("expenses");
  const [selectedId, setSelectedId] = useState<string | null>(initialRecordId ?? null);
  const [editing, setEditing] = useState<AaRecord | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [confirmation, setConfirmation] = useState<"reopen" | "delete" | "received" | "unpaid" | null>(null);
  const lock = useRef(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const copy = getSimpleAaCopy(locale);
  const router = useRouter();
  useEffect(() => {
    if (preview) return;
    const refresh = () => { if (!document.hidden && !lock.current) router.refresh(); };
    const timer = window.setInterval(refresh, 30000);
    document.addEventListener("visibilitychange", refresh);
    return () => { clearInterval(timer); document.removeEventListener("visibilitychange", refresh); };
  }, [preview, router]);
  useEffect(() => { setState(initialState); }, [initialState]);
  useEffect(() => { heading.current?.focus({ preventScroll: true }); window.scrollTo({ top: 0, behavior: "instant" }); }, [screen]);
  const money = (amount: string | bigint) => formatMinorAmount(BigInt(amount), state.currency, locale);
  const name = (id: string | null) => state.participants.find(p => p.id === id)?.name ?? "—";
  const balances = simpleBalances(state);
  const balanceOf = (id: string) => balances.find(p => p.participantId === id)?.balanceMinor ?? 0n;
  const mine = balanceOf(state.viewerId);
  const myRefund = isPrepaymentRefund(state, state.viewerId, mine);
  const active = state.status === "ACTIVE";
  const visible = state.records.filter(r => r.status !== "VOIDED");
  const expenses = visible.filter(r => r.type === "EXPENSE");
  const prepayments = visible.filter(r => r.source === AA_PREPAYMENT);
  const historical = visible.filter(r => r.type !== "EXPENSE" && ![AA_PREPAYMENT, AA_SETTLEMENT].includes(r.source ?? ""));
  const transfers = visible.filter(r => r.source === AA_SETTLEMENT);
  const unresolved = visible.some(r => r.status === "DISPUTED");
  const contestedForViewer = transfers.filter(r => r.status === "DISPUTED" && (r.from === state.viewerId || r.to === state.viewerId)).reduce((sum, r) => sum + BigInt(r.amount), 0n);
  const heroLabel = mine === 0n
    ? (contestedForViewer > 0n ? copy.discrepancy : active ? copy.balanced : copy.settled)
    : mine > 0n ? (active ? copy.estimateReceive : copy.receive)
      : myRefund ? (active ? copy.estimateRefund : copy.refund) : (active ? copy.estimatePay : copy.pay);
  const total = expenses.filter(r => r.status === "POSTED").reduce((sum, r) => sum + BigInt(r.amount), 0n);
  const prepaid = prepayments.filter(r => r.status === "POSTED").reduce((sum, r) => sum + BigInt(r.amount), 0n);
  const completed = transfers.filter(r => r.status === "POSTED").length;
  const selected = state.records.find(r => r.id === selectedId);
  const viewerActive = state.participants.some(p => p.id === state.viewerId && p.active);
  const canRecord = active && !unresolved && (viewerActive || state.canManage);
  const statusText = (r: AaRecord) => r.status === "POSTED" ? (r.source === AA_SETTLEMENT ? copy.paid : copy.posted) : r.status === "DISPUTED" ? copy.disputed : r.status === "VOIDED" ? copy.voided : copy.pending;
  const go = (next: AaScreen) => { setError(""); setConfirmation(null); setScreen(next); };
  const openRecord = (record: AaRecord) => { setSelectedId(record.id); go(record.source === AA_SETTLEMENT ? "payment" : "record"); };
  async function run(input: Omit<AaCommand, "expectedVersion" | "operationId">, nextScreen?: AaScreen) {
    if (lock.current) return;
    lock.current = true; setBusy(true); setError("");
    try {
      const command = { ...input, operationId: crypto.randomUUID(), expectedVersion: state.version };
      const result = preview ? { state: applyAaCommand(state, command, new Date().toISOString()) } : await onCommand!(command);
      if (result.error) throw new Error(result.error);
      if (result.state) { setState(result.state); onStateChange?.(result.state); }
      setConfirmation(null);
      if (nextScreen) go(nextScreen);
    } catch (cause) { setError(getSimpleAaError(cause instanceof Error ? cause.message : "FAILED", locale)); }
    finally { lock.current = false; setBusy(false); }
  }
  const primary = (label: string, action: () => void, disabled = false, icon?: ReactNode) => <button type="button" className={styles.primary} onClick={action} disabled={busy || disabled}>{icon}{busy ? copy.working : label}</button>;
  const footer = (children: ReactNode) => <div className={styles.footer}>{children}</div>;
  const avatar = (id: string | null) => <span aria-hidden="true" className={styles.avatar} data-tone={Math.max(0, state.participants.findIndex(p => p.id === id)) % 4}>{name(id).slice(0, 1)}</span>;
  const chatHref = `/${locale}/lobby/${state.activityId}`;
  const title = ({ overview: copy.bill, choose: copy.choose, expense: copy.expense, prepayment: copy.prepayment, details: copy.details, progress: copy.progress, payment: copy.payment, record: selected?.source === AA_PREPAYMENT ? copy.prepayments : selected?.title ?? copy.details })[screen];
  const back = () => {
    if (confirmation) { setConfirmation(null); return; }
    if (screen === "expense" || screen === "prepayment") go(editing ? "record" : "choose");
    else if (screen === "payment") go("progress");
    else go("overview");
  };
  const recordRow = (record: AaRecord) => <button className={styles.row} type="button" key={record.id} onClick={() => openRecord(record)}>
    {avatar(record.type === "TRANSFER" ? record.from : record.contributions[0]?.participantId ?? record.creatorId)}
    <span className={styles.grow}><strong>{record.source === AA_PREPAYMENT ? `${name(record.from)} → ${name(record.to)}` : record.title}</strong><small>{record.type === "EXPENSE" ? `${name(record.contributions[0]?.participantId ?? record.creatorId)} · ${record.shares.length} ${copy.shared}` : record.source === AA_PREPAYMENT ? copy.prepayments : copy.legacy}{record.status !== "POSTED" ? ` · ${statusText(record)}` : ""}</small></span>
    <b className={styles.number}>{money(record.amount)}</b><ChevronRight size={16} aria-hidden="true" />
  </button>;

  return <section className={styles.shell} aria-busy={busy}>
    <header className={styles.header}>
      {screen === "overview" && !preview ? <a className={styles.iconButton} aria-label={copy.back} href={chatHref}><ArrowLeft size={21} /></a> : <button type="button" className={styles.iconButton} aria-label={copy.back} onClick={back} disabled={screen === "overview"}><ArrowLeft size={21} /></button>}
      <h1 ref={heading} tabIndex={-1}>{title}</h1><img className={styles.headerMark} src={brand.logoIconPath} width={32} height={32} alt="Friemi" />
    </header>
    {error && <div role="alert" className={styles.error}>{error}{!preview && <button type="button" onClick={() => window.location.reload()}>{copy.refresh}</button>}</div>}
    {confirmation ? <div className={styles.confirm}>
      <CircleHelp size={28} /><h2>{copy[confirmation === "delete" ? "remove" : confirmation]}</h2>
      <p>{confirmation === "reopen" ? copy.reopenHint : confirmation === "delete" ? copy.deleteHint : copy.reviewHint}</p>
      {primary(copy.confirm, () => run({ intent: confirmation, recordId: selectedId ?? undefined }, confirmation === "reopen" || confirmation === "delete" || confirmation === "unpaid" ? "overview" : "progress"))}
      <button className={styles.secondary} type="button" onClick={() => setConfirmation(null)}>{copy.cancel}</button>
    </div> : <>
    {screen === "overview" && <>
      <p className={styles.activity}>{state.title} <span>· {state.participants.length} {copy.shared}</span></p>
      <div className={styles.hero}>
        <span>{heroLabel}</span>
        <strong className={styles.heroAmount}>{money(mine === 0n && contestedForViewer > 0n ? contestedForViewer : mine < 0n ? -mine : mine)}</strong>
        <button type="button" onClick={() => go("details")}>{copy.total} <b>{money(total)}</b><span>{copy.details}<ChevronRight size={15} /></span></button>
      </div>
      {prepaid > 0n && <div className={styles.prepayLine}><Wallet size={16} /><span>{copy.prepaid} <b>{money(prepaid)}</b></span><small>{copy.excluded}</small></div>}
      {!active && <button type="button" className={styles.progressLink} onClick={() => go("progress")}><span><Check size={18} />{copy.progress}</span><b>{completed} / {transfers.length}</b><ChevronRight size={17} /></button>}
      {unresolved && <button className={styles.notice} type="button" onClick={() => go("progress")}>{copy.discrepancy}<ChevronRight size={17} /></button>}
      {state.legacyBlocked && <p className={styles.notice}>{copy.pendingLegacy}</p>}
      <div className={styles.tabs} role="tablist" aria-label={copy.bill}>
        {[["expenses", copy.expenses, expenses.length], ["prepayments", copy.prepayments, prepayments.length], ...(historical.length ? [["history", copy.history, historical.length]] : [])].map(([key, label, count]) => <button key={key} type="button" role="tab" aria-selected={tab === key} onClick={() => setTab(String(key))}>{label}<span>{count}</span></button>)}
      </div>
      {tab === "prepayments" && <p className={styles.tabHint}>{copy.prepaymentHint}</p>}
      <div className={styles.list} role="tabpanel" aria-label={tab === "expenses" ? copy.expenses : copy.prepayments}>
        {(tab === "expenses" ? expenses : tab === "prepayments" ? prepayments : historical).slice().reverse().map(recordRow)}
        {(tab === "expenses" ? expenses : tab === "prepayments" ? prepayments : historical).length === 0 && <div className={styles.empty}><ReceiptText size={30} /><h2>{tab === "expenses" ? copy.empty : copy.noPrepay}</h2><p>{tab === "expenses" ? copy.emptyHint : copy.noPrepayHint}</p></div>}
      </div>
      {footer(active ? state.canSettle && visible.some(r => r.status === "POSTED") ? <div className={styles.footerSplit}>
        {primary(copy.add, () => { setEditing(null); go("choose"); }, !canRecord, <Plus size={20} />)}
        <button type="button" className={styles.secondary} onClick={() => go("details")}>{copy.goSettle}<ArrowRight size={17} /></button>
      </div> : primary(copy.add, () => { setEditing(null); go("choose"); }, !canRecord, <Plus size={20} />) : primary(copy.progress, () => go("progress"), false, <ArrowRight size={19} />))}
    </>}
    {screen === "choose" && <div className={styles.choices}>
      <button type="button" onClick={() => go("expense")} disabled={!canRecord}><span className={styles.choiceIcon}><ReceiptText size={28} /></span><strong>{copy.expense}</strong><p>{copy.expenseHint}</p><ArrowRight size={20} /></button>
      <button type="button" onClick={() => go("prepayment")} disabled={!canRecord}><span className={styles.choiceIcon} data-warm><Wallet size={28} /></span><strong>{copy.prepayment}</strong><p>{copy.prepaymentHint}</p><ArrowRight size={20} /></button>
    </div>}
    {(screen === "expense" || screen === "prepayment") && <EntryForm key={`${screen}:${editing?.id ?? "new"}`} state={state} kind={screen} editing={editing} locale={locale} busy={busy} canRecord={canRecord} onSave={input => run(input, "overview")} />}
    {screen === "details" && <>
      <div className={styles.total}><span>{copy.total}</span><strong>{money(total)}</strong></div>
      <div className={styles.list}>
        {state.participants.map(person => {
          const value = balanceOf(person.id);
          const isRefund = isPrepaymentRefund(state, person.id, value);
          const balanceLabel = value > 0n ? copy.receive : value < 0n ? (isRefund ? copy.refund : copy.pay) : unresolved ? copy.disputed : copy.settled;
          const sum = (items: AaRecord[], prop: "shares" | "contributions") => items.filter(r => r.status === "POSTED").reduce((a, r) => a + r[prop].filter(i => i.participantId === person.id).reduce((s, i) => s + BigInt(i.amount), 0n), 0n);
          const transferSum = (items: AaRecord[], field: "from" | "to") => items.filter(r => (r.status === "POSTED" || (r.source === AA_SETTLEMENT && r.status === "DISPUTED" && r.paidAt)) && r[field] === person.id).reduce((a, r) => a + BigInt(r.amount), 0n);
          const figures = [[copy.share, sum(expenses, "shares")], [copy.advanced, sum(expenses, "contributions")], [copy.prepayOut, transferSum(prepayments, "from")], [copy.prepayIn, transferSum(prepayments, "to")], [copy.paymentOut, transferSum(transfers, "from")], [copy.paymentIn, transferSum(transfers, "to")]] as const;
          const known = -figures[0][1] + figures[1][1] + figures[2][1] - figures[3][1] + figures[4][1] - figures[5][1];
          const adjustment = value - known;
          return <details className={styles.personDetail} key={person.id}><summary>{avatar(person.id)}<span className={styles.grow}><strong>{person.name}{person.id === state.viewerId ? ` (${copy.me})` : ""}</strong><small>{copy.share} {money(figures[0][1])}</small></span><span className={styles.balance}><small>{balanceLabel}</small><b>{money(value < 0n ? -value : value)}</b></span></summary><dl className={styles.breakdown}>{figures.map(([label, amount]) => <div key={label}><dt>{label}</dt><dd>{money(amount)}</dd></div>)}{adjustment !== 0n && <div><dt>{copy.adjustment}</dt><dd>{money(adjustment)}</dd></div>}</dl></details>;
        })}
      </div>
      {state.legacyBlocked && <p className={styles.notice}>{copy.legacyBlocked}</p>}
      {footer(active ? state.canSettle ? primary(copy.start, () => run({ intent: "start" }, "progress"), unresolved || state.legacyBlocked || !visible.some(r => r.status === "POSTED")) : <p className={styles.hint}>{copy.host}</p> : <>{primary(copy.progress, () => go("progress"))}{state.canSettle && state.status !== "ARCHIVED" && <button className={styles.textButton} type="button" disabled={busy || unresolved} onClick={() => setConfirmation("reopen")}><RotateCcw size={15} />{copy.reopen}</button>}</>)}
    </>}
    {screen === "progress" && <>
      <div className={styles.total}><span>{copy.completed}</span><strong>{completed}<em> / {transfers.length}</em></strong><progress value={completed} max={transfers.length || 1} aria-label={copy.progress} /></div>
      {unresolved && <p className={styles.notice}>{copy.discrepancyHint}</p>}
      {transfers.length === 0 && <p className={styles.empty}>{active ? copy.host : balances.every(b => b.balanceMinor === 0n) ? copy.emptySettlement : copy.legacyBlocked}</p>}
      <div className={styles.list}>{transfers.map(r => <button type="button" key={r.id} className={styles.row} onClick={() => openRecord(r)}>{avatar(r.from)}<span className={styles.grow}><strong>{name(r.from)} <span className={styles.arrow}>→</span> {name(r.to)}</strong><small>{statusText(r)}</small></span><b className={styles.number}>{money(r.amount)}</b>{r.status === "POSTED" ? <Check size={17} className={styles.green} /> : <ChevronRight size={16} />}</button>)}</div>
      {state.records.some(r => r.source === AA_SETTLEMENT && r.status === "VOIDED") && <details className={styles.history}><summary>{copy.paidHistory} · {copy.voided}</summary>{state.records.filter(r => r.source === AA_SETTLEMENT && r.status === "VOIDED").map(r => <div className={styles.row} key={r.id}><span className={styles.grow}>{name(r.from)} → {name(r.to)}</span><span>{money(r.amount)}</span></div>)}</details>}
      {footer(primary(copy.details, () => go("details")))}
    </>}
    {screen === "payment" && selected && <>
      <div className={styles.paymentHero}>{avatar(selected.to)}<p>{name(selected.from)} {copy.payTo} {name(selected.to)}</p><strong>{money(selected.amount)}</strong><span className={styles.badge} data-status={selected.status}>{statusText(selected)}</span></div>
      {selected.status === "DISPUTED" ? <div className={styles.contact}><CircleHelp size={22} /><h2>{copy.reported}</h2><p>{copy.reviewHint}</p></div> : <div className={styles.contact}><Wallet size={22} /><h2>{copy.contact}</h2><p>{copy.contactHint}</p>{!preview && <a href={chatHref}>{copy.chat}<ArrowRight size={16} /></a>}</div>}
      {footer(<>
        {selected.status === "PENDING_CONFIRMATION" && selected.from === state.viewerId && <><p className={styles.hint}>{copy.markHint}</p>{primary(copy.markedPaid, () => run({ intent: "pay", recordId: selected.id }, "progress"), unresolved || state.legacyBlocked, <Check size={18} />)}</>}
        {selected.status === "POSTED" && selected.to === state.viewerId && primary(copy.notReceived, () => run({ intent: "dispute", recordId: selected.id }, "progress"))}
        {selected.status === "DISPUTED" && state.canSettle && <>{primary(copy.received, () => setConfirmation("received"))}<button className={styles.secondary} type="button" onClick={() => setConfirmation("unpaid")}>{copy.unpaid}</button></>}
        {(selected.status === "POSTED" && selected.to !== state.viewerId || selected.status === "PENDING_CONFIRMATION" && selected.from !== state.viewerId) && <p className={styles.hint}>{statusText(selected)}</p>}
      </>)}
    </>}
    {screen === "record" && selected && <>
      <div className={styles.total}><span>{selected.source === AA_PREPAYMENT ? copy.prepayments : selected.type === "EXPENSE" ? copy.expenses : copy.legacy}</span><strong>{money(selected.amount)}</strong></div>
      {selected.type === "TRANSFER" ? <div className={styles.row}>{avatar(selected.from)}<strong>{name(selected.from)} → {name(selected.to)}</strong></div> : <><h2 className={styles.sectionTitle}>{copy.payer}</h2>{selected.contributions.map(item => <div className={styles.row} key={item.participantId}>{avatar(item.participantId)}<strong className={styles.grow}>{name(item.participantId)}</strong><b>{money(item.amount)}</b></div>)}<h2 className={styles.sectionTitle}>{copy.breakdown}</h2><div className={styles.list}>{selected.shares.map(item => <div className={styles.row} key={item.participantId}>{avatar(item.participantId)}<span className={styles.grow}>{name(item.participantId)}</span><b>{money(item.amount)}</b></div>)}</div></>}
      {selected.note && <p className={styles.note}>{selected.note}</p>}
      {!([AA_EXPENSE, AA_PREPAYMENT].includes(selected.source ?? "")) && <div className={styles.contact}><p>{copy.legacyHint}</p>{!preview && <a href={`/${locale}/lobby/${state.activityId}/aa/transactions/${selected.id}`}>{copy.openOriginal}<ArrowRight size={16} /></a>}</div>}
      {canRecord && [AA_EXPENSE, AA_PREPAYMENT].includes(selected.source ?? "") && (state.canManage || selected.creatorId === state.viewerId) && footer(<>{primary(copy.edit, () => { setEditing(selected); go(selected.source === AA_PREPAYMENT ? "prepayment" : "expense"); })}<button type="button" className={styles.textButton} onClick={() => setConfirmation("delete")}>{copy.remove}</button></>)}
    </>}
    </>}
  </section>;
}

function EntryForm({ state, kind, editing, locale, busy, canRecord, onSave }: {
  state: AaSimpleState; kind: "expense" | "prepayment"; editing: AaRecord | null; locale: string; busy: boolean; canRecord: boolean;
  onSave: (command: Omit<AaCommand, "expectedVersion" | "operationId">) => Promise<void>;
}) {
  const copy = getSimpleAaCopy(locale);
  const id = useId();
  const [amount, setAmount] = useState(editing ? `${BigInt(editing.amount) / 100n}.${(BigInt(editing.amount) % 100n).toString().padStart(2, "0")}` : "");
  const [title, setTitle] = useState(editing?.title ?? "");
  const [note, setNote] = useState(editing?.note ?? "");
  const [payer, setPayer] = useState(editing?.from ?? editing?.contributions[0]?.participantId ?? state.viewerId);
  const [recipient, setRecipient] = useState(editing?.to ?? state.participants.find(p => p.id !== state.viewerId && p.active)?.id ?? "");
  const [people, setPeople] = useState(editing?.shares.map(i => i.participantId) ?? state.participants.filter(p => p.active).map(p => p.id));
  const [formError, setFormError] = useState("");
  const allocations = useMemo(() => { try { return splitSimpleExpense(parseMoneyToMinor(amount), payer, people); } catch { return []; } }, [amount, payer, people]);
  const money = (value: string) => formatMinorAmount(BigInt(value), "EUR", locale);
  function submit(event: FormEvent) {
    event.preventDefault(); setFormError("");
    try { if (parseMoneyToMinor(amount) <= 0n || (kind === "expense" && !allocations.length) || (kind === "prepayment" && payer === recipient)) throw new Error(); }
    catch { setFormError(copy.invalid); return; }
    void onSave({ intent: kind, recordId: editing?.id, amount, title: kind === "expense" ? title.trim() : copy.prepayments, note, payerId: payer, recipientId: recipient, participantIds: people });
  }
  return <form className={styles.form} onSubmit={submit}>
    <div className={styles.amountInput}><label htmlFor={`${id}-amount`}>{copy.amount}</label><div><span>€</span><input id={`${id}-amount`} aria-label={copy.amount} type="text" inputMode="decimal" placeholder="0.00" value={amount} onChange={e => setAmount(e.target.value.replace(",", "."))} required maxLength={13} autoComplete="off" /></div></div>
    {kind === "expense" && <label className={styles.field}>{copy.title}<input placeholder={copy.titlePlaceholder} value={title} onChange={e => setTitle(e.target.value)} maxLength={120} required /></label>}
    <fieldset className={styles.fieldset}><legend>{kind === "expense" ? copy.payer : copy.sender}</legend><div className={styles.chips}>{state.participants.filter(p => p.active).filter(p => kind === "expense" || state.canManage || p.id === state.viewerId).map((p, index) => <button key={p.id} type="button" aria-pressed={payer === p.id} onClick={() => { setPayer(p.id); if (p.id === recipient) setRecipient(state.participants.find(q => q.active && q.id !== p.id)?.id ?? ""); }}><span className={styles.avatar} data-tone={index % 4} aria-hidden="true">{p.name.slice(0, 1)}</span>{p.name}{payer === p.id && <Check size={14} />}</button>)}</div></fieldset>
    {kind === "prepayment" ? <fieldset className={styles.fieldset}><legend>{copy.recipient}</legend><div className={styles.chips}>{state.participants.filter(p => p.active && p.id !== payer).map((p, index) => <button key={p.id} type="button" aria-pressed={recipient === p.id} onClick={() => setRecipient(p.id)}><span className={styles.avatar} data-tone={index % 4} aria-hidden="true">{p.name.slice(0, 1)}</span>{p.name}{recipient === p.id && <Check size={14} />}</button>)}</div></fieldset> : <fieldset className={styles.fieldset}><legend>{copy.split}</legend><button type="button" className={styles.selectAll} onClick={() => setPeople(state.participants.filter(p => p.active).map(p => p.id))}>{copy.all}</button><div className={styles.participantGrid}>{state.participants.filter(p => p.active).map((p, index) => { const selected = people.includes(p.id); return <button key={p.id} type="button" aria-pressed={selected} onClick={() => setPeople(ids => selected ? ids.filter(i => i !== p.id) : [...ids, p.id])}><span className={styles.avatar} data-tone={index % 4} aria-hidden="true">{p.name.slice(0, 1)}</span><span className={styles.grow}>{p.name}</span><span className={styles.checkbox}>{selected && <Check size={13} />}</span>{selected && allocations.length > 0 && <b>{money(allocations.find(i => i.participantId === p.id)!.amount)}</b>}</button>; })}</div></fieldset>}
    <details className={styles.optional} open={undefined}><summary>{copy.more}</summary><label className={styles.field}>{copy.note}<textarea value={note} onChange={e => setNote(e.target.value)} maxLength={2000} rows={3} /></label></details>
    {formError && <p className={styles.error} role="alert">{formError}</p>}
    <div className={styles.footer}><button className={styles.primary} type="submit" disabled={busy || !canRecord}>{busy ? copy.working : kind === "expense" ? copy.save : copy.savePrepay}</button></div>
  </form>;
}

"use client";

import { useEffect, useId, useMemo, useRef, useState, type FormEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Check, ChevronRight, CircleHelp, Coins, Copy, Plus, ReceiptText, RotateCcw, Users, Wallet } from "lucide-react";
import { AA_EXPENSE, AA_PREPAYMENT, AA_SETTLEMENT, applyAaCommand, isPrepaymentRefund, simpleBalances, splitSimpleExpense, type AaCommand, type AaRecord, type AaSimpleState } from "../domain/simpleLedger";
import { formatMinorAmount, parseMoneyToMinor } from "../domain/money";
import { getSimpleAaCopy, getSimpleAaError } from "../simpleCopy";
import { brand } from "../../../lib/brand";
import styles from "./AaSimpleClient.module.css";

export type AaScreen = "overview" | "choose" | "expense" | "prepayment" | "details" | "progress" | "payment" | "record";
const paymentCopy = {
  "zh-CN": { incoming: "我的待收款", outgoing: "我的待付款", receipt: "收款", awaiting: "待收款", noneIncoming: "暂无待收款", noneOutgoing: "暂无待付款", add: "添加收款方式", change: "修改收款方式", label: "我的收款方式", placeholder: "例如 Revolut @name 或 IBAN FR…", save: "保存收款方式", remove: "移除", missing: "对方还没填写收款方式", copy: "复制收款方式", copied: "已复制", invalid: "请填写不超过 160 字的收款方式", copyFailed: "复制失败，请手动复制", from: "来自", to: "付给", payerMarked: "对方已标记付款", waitingRecipient: "已付款，等收款人确认", confirmReceipt: "我已收款", receiptHint: "确认钱已到账后点击", receiptConfirmHint: "确认收到这笔钱后，双方的账目会结清。", received: "收款人已确认", undoPaid: "撤销已付款", reopenBlocked: "有已付款待收款确认，请先核对这笔转账。" },
  en: { incoming: "My incoming payments", outgoing: "My payments to make", receipt: "Receive payment", awaiting: "To receive", noneIncoming: "Nothing to receive", noneOutgoing: "Nothing to pay", add: "Add payment details", change: "Edit payment details", label: "My payment details", placeholder: "e.g. Revolut @name or IBAN FR…", save: "Save payment details", remove: "Remove", missing: "Recipient has not added payment details", copy: "Copy payment details", copied: "Copied", invalid: "Enter payment details (up to 160 characters)", copyFailed: "Could not copy. Please copy manually", from: "From", to: "Pay", payerMarked: "Payer marked as paid", waitingRecipient: "Paid · awaiting recipient", confirmReceipt: "I received it", receiptHint: "Tap once the money arrives", receiptConfirmHint: "Confirming receipt settles this payment for both people.", received: "Recipient confirmed", undoPaid: "Undo paid status", reopenBlocked: "A marked payment is awaiting receipt. Resolve it before reopening." },
  fr: { incoming: "Mes paiements à recevoir", outgoing: "Mes paiements à faire", receipt: "Recevoir", awaiting: "À recevoir", noneIncoming: "Rien à recevoir", noneOutgoing: "Rien à payer", add: "Ajouter mes coordonnées", change: "Modifier mes coordonnées", label: "Mes coordonnées de paiement", placeholder: "Ex. Revolut @nom ou IBAN FR…", save: "Enregistrer", remove: "Supprimer", missing: "Le bénéficiaire n’a pas ajouté ses coordonnées", copy: "Copier les coordonnées", copied: "Copié", invalid: "Saisissez vos coordonnées (160 caractères max.)", copyFailed: "Copie impossible. Copiez manuellement", from: "De", to: "Payer", payerMarked: "Payeur : paiement indiqué", waitingRecipient: "Payé · en attente du bénéficiaire", confirmReceipt: "J’ai reçu l’argent", receiptHint: "Appuyez après réception", receiptConfirmHint: "Confirmer la réception solde ce paiement pour les deux personnes.", received: "Réception confirmée", undoPaid: "Annuler le paiement indiqué", reopenBlocked: "Un paiement indiqué attend confirmation. Vérifiez-le avant de rouvrir." },
} as const;
type Props = {
  initialState: AaSimpleState; locale: string; initialScreen?: AaScreen; initialRecordId?: string; preview?: boolean;
  onCommand?: (command: AaCommand) => Promise<{ state?: AaSimpleState; error?: string }>;
  onSavePaymentMethod?: (value: string) => Promise<{ paymentMethod?: string | null; error?: string }>;
  onStateChange?: (state: AaSimpleState) => void;
};

export function AaSimpleClient({ initialState, locale, initialScreen = "overview", initialRecordId, preview = false, onCommand, onSavePaymentMethod, onStateChange }: Props) {
  const [state, setState] = useState(initialState);
  const [screen, setScreen] = useState<AaScreen>(initialScreen);
  const [tab, setTab] = useState("expenses");
  const [selectedId, setSelectedId] = useState<string | null>(initialRecordId ?? null);
  const [editing, setEditing] = useState<AaRecord | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [confirmation, setConfirmation] = useState<"reopen" | "delete" | "receive" | "received" | "unpaid" | null>(null);
  const [editingPaymentMethod, setEditingPaymentMethod] = useState(false);
  const [paymentMethodDraft, setPaymentMethodDraft] = useState("");
  const [paymentMethodBusy, setPaymentMethodBusy] = useState(false);
  const [paymentMethodError, setPaymentMethodError] = useState("");
  const [copiedRecipient, setCopiedRecipient] = useState<string | null>(null);
  const lock = useRef(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const copy = getSimpleAaCopy(locale);
  const paymentText = paymentCopy[locale === "en" || locale === "fr" ? locale : "zh-CN"];
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
  const pendingTransfers = transfers.filter(r => r.status === "PENDING_CONFIRMATION");
  const hasUnconfirmedSent = pendingTransfers.some(r => Boolean(r.paidAt));
  const incoming = pendingTransfers.filter(r => r.to === state.viewerId);
  const outgoing = pendingTransfers.filter(r => r.from === state.viewerId);
  const disputedTransfers = transfers.filter(r => r.status === "DISPUTED" && (state.canSettle || r.from === state.viewerId || r.to === state.viewerId));
  const pastTransfers = state.records.filter(r => r.source === AA_SETTLEMENT && (r.from === state.viewerId || r.to === state.viewerId) && (r.status === "POSTED" || r.status === "VOIDED"));
  const incomingAmount = incoming.reduce((sum, record) => sum + BigInt(record.amount), 0n);
  const outgoingAmount = outgoing.reduce((sum, record) => sum + BigInt(record.amount), 0n);
  const myPaymentMethod = state.participants.find(person => person.id === state.viewerId)?.paymentMethod ?? null;
  const unresolved = visible.some(r => r.status === "DISPUTED");
  const contestedForViewer = transfers.filter(r => r.status === "DISPUTED" && (r.from === state.viewerId || r.to === state.viewerId)).reduce((sum, r) => sum + BigInt(r.amount), 0n);
  const waitingForReceipt = !active && outgoing.length > 0 && outgoing.every(record => Boolean(record.paidAt));
  const heroLabel = mine === 0n
    ? (contestedForViewer > 0n ? copy.discrepancy : active ? copy.balanced : copy.settled)
    : mine > 0n ? (active ? copy.estimateReceive : copy.receive)
      : waitingForReceipt ? paymentText.waitingRecipient
        : myRefund ? (active ? copy.estimateRefund : copy.refund) : (active ? copy.estimatePay : copy.pay);
  const total = expenses.filter(r => r.status === "POSTED").reduce((sum, r) => sum + BigInt(r.amount), 0n);
  const prepaid = prepayments.filter(r => r.status === "POSTED").reduce((sum, r) => sum + BigInt(r.amount), 0n);
  const completed = transfers.filter(r => r.status === "POSTED").length;
  const selected = state.records.find(r => r.id === selectedId);
  const selectedPayeeMethod = state.participants.find(person => person.id === selected?.to)?.paymentMethod;
  const viewerActive = state.participants.some(p => p.id === state.viewerId && p.active);
  const canEditPaymentMethod = viewerActive && state.status !== "ARCHIVED";
  const canRecord = active && !unresolved && (viewerActive || state.canManage);
  const statusText = (r: AaRecord) => r.status === "POSTED" ? (r.source === AA_SETTLEMENT ? r.receivedAt ? paymentText.received : copy.paid : copy.posted) : r.status === "DISPUTED" ? copy.disputed : r.status === "VOIDED" ? copy.voided : r.source === AA_SETTLEMENT && r.paidAt ? paymentText.waitingRecipient : copy.pending;
  const go = (next: AaScreen) => { setError(""); setPaymentMethodError(""); setConfirmation(null); setScreen(next); };
  const openRecord = (record: AaRecord) => { setSelectedId(record.id); go(record.source === AA_SETTLEMENT ? "payment" : "record"); };
  async function run(input: Omit<AaCommand, "expectedVersion" | "operationId">, nextScreen?: AaScreen) {
    if (lock.current) return;
    lock.current = true; setBusy(true); setError("");
    try {
      const command = { ...input, operationId: crypto.randomUUID(), expectedVersion: state.version };
      const result = preview ? { state: applyAaCommand(state, command, new Date().toISOString()) } : await onCommand!(command);
      if (result.error) throw new Error(result.error);
      if (result.state) { setState(result.state); onStateChange?.(result.state); if (input.intent === "start" && !preview) router.refresh(); }
      setConfirmation(null);
      if (nextScreen) go(nextScreen);
    } catch (cause) { setError(getSimpleAaError(cause instanceof Error ? cause.message : "FAILED", locale)); }
    finally { lock.current = false; setBusy(false); }
  }
  async function savePaymentMethod(value: string) {
    if (paymentMethodBusy) return;
    if (value && (value.length > 160 || /[\u0000-\u001f\u007f]/.test(value))) { setPaymentMethodError(paymentText.invalid); return; }
    setPaymentMethodBusy(true); setPaymentMethodError("");
    try {
      const result = preview ? { paymentMethod: value || null } : await onSavePaymentMethod!(value);
      if (result.error) throw new Error(result.error);
      const next = { ...state, participants: state.participants.map(person => person.id === state.viewerId ? { ...person, paymentMethod: result.paymentMethod ?? null } : person) };
      setState(next); onStateChange?.(next); setEditingPaymentMethod(false);
    } catch { setPaymentMethodError(copy.error); }
    finally { setPaymentMethodBusy(false); }
  }
  async function copyRecipientMethod(recipientId: string) {
    const method = state.participants.find(person => person.id === recipientId)?.paymentMethod;
    if (!method) return;
    try {
      await navigator.clipboard.writeText(method);
      setPaymentMethodError("");
      setCopiedRecipient(recipientId);
      window.setTimeout(() => setCopiedRecipient(current => current === recipientId ? null : current), 1800);
    } catch { setPaymentMethodError(paymentText.copyFailed); }
  }
  const primary = (label: string, action: () => void, disabled = false, icon?: ReactNode) => <button type="button" className={styles.primary} onClick={action} disabled={busy || disabled}>{icon}{busy ? copy.working : label}</button>;
  const footer = (children: ReactNode) => <div className={styles.footer}>{children}</div>;
  const avatar = (id: string | null) => <span aria-hidden="true" className={styles.avatar} data-tone={Math.max(0, state.participants.findIndex(p => p.id === id)) % 4}>{name(id).slice(0, 1)}</span>;
  const chatHref = `/${locale}/lobby/${state.activityId}`;
  const title = ({ overview: copy.bill, choose: copy.choose, expense: copy.expense, prepayment: copy.prepayment, details: copy.details, progress: copy.progress, payment: selected?.to === state.viewerId ? paymentText.receipt : copy.payment, record: selected?.source === AA_PREPAYMENT ? copy.prepayments : selected?.title ?? copy.details })[screen];
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
    {paymentMethodError && <p className={styles.error} role="alert">{paymentMethodError}</p>}
    {confirmation ? <div className={styles.confirm}>
      <CircleHelp size={28} /><h2>{confirmation === "receive" ? paymentText.confirmReceipt : copy[confirmation === "delete" ? "remove" : confirmation]}</h2>
      <p>{confirmation === "receive" ? paymentText.receiptConfirmHint : confirmation === "reopen" ? copy.reopenHint : confirmation === "delete" ? copy.deleteHint : copy.reviewHint}</p>
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
          const transferSum = (items: AaRecord[], field: "from" | "to") => items.filter(r => (r.status === "POSTED" || (r.source === AA_SETTLEMENT && r.status === "DISPUTED" && (r.paidAt || r.receivedAt))) && r[field] === person.id).reduce((a, r) => a + BigInt(r.amount), 0n);
          const figures = [[copy.share, sum(expenses, "shares")], [copy.advanced, sum(expenses, "contributions")], [copy.prepayOut, transferSum(prepayments, "from")], [copy.prepayIn, transferSum(prepayments, "to")], [copy.paymentOut, transferSum(transfers, "from")], [copy.paymentIn, transferSum(transfers, "to")]] as const;
          const known = -figures[0][1] + figures[1][1] + figures[2][1] - figures[3][1] + figures[4][1] - figures[5][1];
          const adjustment = value - known;
          return <details className={styles.personDetail} key={person.id}><summary>{avatar(person.id)}<span className={styles.grow}><strong>{person.name}{person.id === state.viewerId ? ` (${copy.me})` : ""}</strong><small>{copy.share} {money(figures[0][1])}</small></span><span className={styles.balance}><small>{balanceLabel}</small><b>{money(value < 0n ? -value : value)}</b></span></summary><dl className={styles.breakdown}>{figures.map(([label, amount]) => <div key={label}><dt>{label}</dt><dd>{money(amount)}</dd></div>)}{adjustment !== 0n && <div><dt>{copy.adjustment}</dt><dd>{money(adjustment)}</dd></div>}</dl></details>;
        })}
      </div>
      {state.legacyBlocked && <p className={styles.notice}>{copy.legacyBlocked}</p>}
      {hasUnconfirmedSent && state.canSettle && <p className={styles.notice}>{paymentText.reopenBlocked}</p>}
      {footer(active ? state.canSettle ? primary(copy.start, () => run({ intent: "start" }, "progress"), unresolved || state.legacyBlocked || !visible.some(r => r.status === "POSTED")) : <p className={styles.hint}>{copy.host}</p> : <>{primary(copy.progress, () => go("progress"))}{state.canSettle && state.status !== "ARCHIVED" && <button className={styles.textButton} type="button" disabled={busy || unresolved || hasUnconfirmedSent} onClick={() => setConfirmation("reopen")}><RotateCcw size={15} />{copy.reopen}</button>}</>)}
    </>}
    {screen === "progress" && <>
      <div className={styles.total}><span>{copy.completed}</span><strong>{completed}<em> / {transfers.length}</em></strong><progress value={completed} max={transfers.length || 1} aria-label={copy.progress} /></div>
      {unresolved && <p className={styles.notice}>{copy.discrepancyHint}</p>}
      <section className={styles.settlementCard} aria-labelledby="aa-incoming-title">
        <div className={styles.settlementHeading}><div><h2 id="aa-incoming-title">{paymentText.incoming}</h2><strong>{money(incomingAmount)}</strong></div><span>{incoming.length} {copy.transfers}</span></div>
        {incoming.length ? <div className={styles.settlementItems}>{incoming.map(record => <button className={styles.settlementRecord} key={record.id} type="button" onClick={() => openRecord(record)}>{avatar(record.from)}<span className={styles.grow}><strong>{paymentText.from} {name(record.from)}</strong><small>{record.paidAt ? paymentText.payerMarked : paymentText.awaiting}</small></span><b className={styles.number}>{money(record.amount)}</b><ChevronRight size={16} /></button>)}</div> : <p className={styles.settlementEmpty}>{paymentText.noneIncoming}</p>}
        {(myPaymentMethod || (incoming.length > 0 && canEditPaymentMethod)) && <div className={styles.paymentMethodEditor}>
          {myPaymentMethod && !editingPaymentMethod && <p><span>{paymentText.label}</span><strong>{myPaymentMethod}</strong></p>}
          {editingPaymentMethod ? <form onSubmit={event => { event.preventDefault(); void savePaymentMethod(paymentMethodDraft.trim()); }}>
            <label htmlFor="aa-my-payment-method">{paymentText.label}</label>
            <input autoComplete="off" id="aa-my-payment-method" maxLength={160} onChange={event => setPaymentMethodDraft(event.target.value)} placeholder={paymentText.placeholder} required value={paymentMethodDraft} />
            <div className={styles.paymentMethodActions}><button disabled={paymentMethodBusy} type="submit">{paymentMethodBusy ? copy.working : paymentText.save}</button><button disabled={paymentMethodBusy} type="button" onClick={() => { setEditingPaymentMethod(false); setPaymentMethodError(""); }}>{copy.cancel}</button>{myPaymentMethod && <button disabled={paymentMethodBusy} type="button" onClick={() => void savePaymentMethod("")}>{paymentText.remove}</button>}</div>
          </form> : canEditPaymentMethod ? <button className={styles.paymentMethodEditButton} type="button" onClick={() => { setPaymentMethodDraft(myPaymentMethod ?? ""); setPaymentMethodError(""); setEditingPaymentMethod(true); }}>{myPaymentMethod ? paymentText.change : paymentText.add}<ChevronRight size={15} /></button> : <button className={styles.paymentMethodEditButton} type="button" disabled={paymentMethodBusy} onClick={() => void savePaymentMethod("")}>{paymentText.remove}</button>}
        </div>}
      </section>
      <section className={styles.settlementCard} aria-labelledby="aa-outgoing-title">
        <div className={styles.settlementHeading}><div><h2 id="aa-outgoing-title">{paymentText.outgoing}</h2><strong>{money(outgoingAmount)}</strong></div><span>{outgoing.length} {copy.transfers}</span></div>
        {outgoing.length ? <div className={styles.settlementItems}>{outgoing.map(record => {
          const method = state.participants.find(person => person.id === record.to)?.paymentMethod;
          return <div className={styles.outgoingRecord} key={record.id}>
            <button className={styles.settlementRecord} type="button" onClick={() => openRecord(record)}>{avatar(record.to)}<span className={styles.grow}><strong>{paymentText.to} {name(record.to)}</strong><small>{statusText(record)}</small></span><b className={styles.number}>{money(record.amount)}</b><ChevronRight size={16} /></button>
            {record.status === "PENDING_CONFIRMATION" && <div className={styles.recipientMethod}>{method ? <><span>{method}</span><button type="button" onClick={() => void copyRecipientMethod(record.to!)}><Copy size={14} />{copiedRecipient === record.to ? paymentText.copied : paymentText.copy}</button></> : <span>{paymentText.missing}</span>}</div>}
          </div>;
        })}</div> : <p className={styles.settlementEmpty}>{paymentText.noneOutgoing}</p>}
      </section>
      {disputedTransfers.length > 0 && <section className={styles.settlementCard} aria-labelledby="aa-disputed-title">
        <div className={styles.settlementHeading}><h2 id="aa-disputed-title">{copy.disputed}</h2><span>{disputedTransfers.length} {copy.transfers}</span></div>
        <div className={styles.settlementItems}>{disputedTransfers.map(record => <button className={styles.settlementRecord} key={record.id} type="button" onClick={() => openRecord(record)}>{avatar(record.from)}<span className={styles.grow}><strong>{name(record.from)} <span className={styles.arrow}>→</span> {name(record.to)}</strong><small>{copy.reviewHint}</small></span><b className={styles.number}>{money(record.amount)}</b><ChevronRight size={16} /></button>)}</div>
      </section>}
      {transfers.length === 0 && <p className={styles.hint}>{active ? copy.host : balances.every(b => b.balanceMinor === 0n) ? copy.emptySettlement : copy.legacyBlocked}</p>}
      {pastTransfers.length > 0 && <details className={styles.history}><summary>{copy.paidHistory}</summary><div className={styles.list}>{pastTransfers.map(r => <button type="button" key={r.id} className={styles.row} onClick={() => openRecord(r)}>{avatar(r.from === state.viewerId ? r.to : r.from)}<span className={styles.grow}><strong>{name(r.from)} <span className={styles.arrow}>→</span> {name(r.to)}</strong><small>{statusText(r)}</small></span><b className={styles.number}>{money(r.amount)}</b><ChevronRight size={16} /></button>)}</div></details>}
      {footer(primary(copy.details, () => go("details")))}
    </>}
    {screen === "payment" && selected && <>
      <div className={styles.paymentHero}>{avatar(selected.to === state.viewerId ? selected.from : selected.to)}<p>{name(selected.from)} {copy.payTo} {name(selected.to)}</p><strong>{money(selected.amount)}</strong><span className={styles.badge} data-status={selected.status}>{selected.status === "PENDING_CONFIRMATION" && selected.to === state.viewerId ? selected.paidAt ? paymentText.payerMarked : paymentText.awaiting : statusText(selected)}</span></div>
      {selected.status === "DISPUTED" ? <div className={styles.contact}><CircleHelp size={22} /><h2>{copy.reported}</h2><p>{copy.reviewHint}</p></div> : selected.from === state.viewerId && selected.status === "PENDING_CONFIRMATION" ? <div className={styles.contact}><Wallet size={22} /><h2>{copy.contact}</h2>{selectedPayeeMethod ? <><p className={styles.methodValue}>{selectedPayeeMethod}</p><button className={styles.paymentMethodEditButton} type="button" onClick={() => void copyRecipientMethod(selected.to!)}><Copy size={15} />{copiedRecipient === selected.to ? paymentText.copied : paymentText.copy}</button></> : <><p>{paymentText.missing}</p>{!preview && <a href={chatHref}>{copy.chat}<ArrowRight size={16} /></a>}</>}</div> : null}
      {footer(<>
        {selected.status === "PENDING_CONFIRMATION" && selected.from === state.viewerId && (selected.paidAt ? <><p className={styles.hint}>{paymentText.waitingRecipient}</p><button className={styles.textButton} type="button" disabled={busy} onClick={() => run({ intent: "undoPay", recordId: selected.id }, "progress")}>{paymentText.undoPaid}</button></> : <><p className={styles.hint}>{copy.markHint}</p>{primary(copy.markedPaid, () => run({ intent: "pay", recordId: selected.id }, "progress"), unresolved || state.legacyBlocked, <Check size={18} />)}</>)}
        {selected.status === "PENDING_CONFIRMATION" && selected.to === state.viewerId && <><p className={styles.hint}>{paymentText.receiptHint}</p>{primary(paymentText.confirmReceipt, () => setConfirmation("receive"), unresolved || state.legacyBlocked, <Check size={18} />)}</>}
        {selected.status === "POSTED" && selected.to === state.viewerId && !selected.receivedAt && <>{primary(paymentText.confirmReceipt, () => setConfirmation("receive"), unresolved || state.legacyBlocked, <Check size={18} />)}<button className={styles.secondary} type="button" onClick={() => run({ intent: "dispute", recordId: selected.id }, "progress")}>{copy.notReceived}</button></>}
        {selected.status === "POSTED" && selected.to === state.viewerId && selected.receivedAt && <p className={styles.hint}>{paymentText.received}</p>}
        {selected.status === "DISPUTED" && state.canSettle && <>{primary(copy.received, () => setConfirmation("received"))}<button className={styles.secondary} type="button" onClick={() => setConfirmation("unpaid")}>{copy.unpaid}</button></>}
        {(selected.status === "POSTED" && selected.to !== state.viewerId || selected.status === "PENDING_CONFIRMATION" && selected.from !== state.viewerId && selected.to !== state.viewerId) && <p className={styles.hint}>{statusText(selected)}</p>}
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

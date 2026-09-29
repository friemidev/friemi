import Image from "next/image";
import Link from "next/link";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Check,
  CircleDollarSign,
  Clock3,
  WalletCards,
} from "lucide-react";
import { PageContainer } from "@/components/layout/PageContainer";
import { MobileNavSectionOverride } from "@/components/navigation/MobileNavSectionOverride";
import { createAaPaymentRequestAction } from "@/features/aa/actions/aaPaymentRequestActions";
import {
  confirmAaTransferAction,
  markAaSettlementPaidAction,
} from "@/features/aa/actions/aaTransactionActions";
import { AaLedgerShareTools } from "@/features/aa/components/AaLedgerShareTools";
import { AaPaymentMethods } from "@/features/aa/components/AaPaymentMethods";
import { formatMinorAmount } from "@/features/aa/domain/money";
import {
  getParticipantSettlementProgress,
  getSettlementPairKey,
} from "@/features/aa/domain/settlementProgress";
import { getActivityAaSnapshot } from "@/features/aa/server/ledgerService";
import { ensureCurrentUserProfileSnapshot } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { cn } from "@/lib/utils";
import { withLocale } from "@/lib/routes";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ locale: string; activityId: string }>;
};

function getCopy(locale: string) {
  if (locale === "fr") {
    return {
      blocked: "Terminez les validations et les litiges avant de régler.",
      confirmPayment: "Confirmer le paiement",
      confirmReceipt: "Confirmer la réception",
      flow: "Paiement et confirmation",
      paid: "À jour",
      paidWaiting: "Payé · à confirmer",
      pay: "À payer",
      receive: "À recevoir",
      record: "J’ai payé",
      remind: "Relancer les participants",
      request: "Demander le paiement",
      settled: "personnes à jour",
      stageConfirm: "Confirmation du bénéficiaire",
      stageConfirmed: "Réception confirmée",
      stagePaid: "Paiement effectué",
      stagePay: "Effectuer le paiement",
      status: "Statut de tous les participants",
      title: "Progression",
      total: "Dépenses totales",
      viewRecord: "Voir l’opération",
      waiting: "Confirmation à faire",
      dispute: "Litige",
      you: "vous",
    };
  }
  if (locale === "en") {
    return {
      blocked: "Finish pending reviews and disputes before settling up.",
      confirmPayment: "Confirm payment",
      confirmReceipt: "Confirm receipt",
      flow: "Payment and confirmation",
      paid: "Settled",
      paidWaiting: "Paid · awaiting confirmation",
      pay: "To pay",
      receive: "To receive",
      record: "I’ve paid",
      remind: "Remind unsettled friends",
      request: "Request payment",
      settled: "people settled",
      stageConfirm: "Recipient confirms",
      stageConfirmed: "Receipt confirmed",
      stagePaid: "Payment sent",
      stagePay: "Make payment",
      status: "Everyone’s settlement status",
      title: "Settlement progress",
      total: "Total expenses",
      viewRecord: "View transfer",
      waiting: "Confirmation needed",
      dispute: "Disputed",
      you: "you",
    };
  }
  return {
    blocked: "请先处理待审核、冲突或争议记录，再继续结算。",
    confirmPayment: "确认已付款",
    confirmReceipt: "确认收款",
    flow: "付款与确认",
    paid: "已结清",
    paidWaiting: "已付款·待确认",
    pay: "待付款",
    receive: "待收款",
    record: "我已付款",
    remind: "催一下未支付的小伙伴",
    request: "发送付款请求",
    settled: "人已结清",
    stageConfirm: "收款方确认",
    stageConfirmed: "已确认收款",
    stagePaid: "已付款",
    stagePay: "付款",
    status: "全员结算状态",
    title: "结算进度",
    total: "总开支",
    viewRecord: "查看转账记录",
    waiting: "待确认收款",
    dispute: "争议处理中",
    you: "你",
  };
}

function Initial({ name }: { name: string }) {
  return (
    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#F1F2E3] text-[12px] font-black text-[#156240] ring-1 ring-[#D6D5B2]">
      {Array.from(name.trim())[0]?.toUpperCase() ?? "?"}
    </span>
  );
}

function SettlementSteps({
  confirmLabel,
  confirmedLabel,
  paidLabel,
  payLabel,
  payeeConfirmed,
  payerConfirmed,
}: {
  confirmLabel: string;
  confirmedLabel: string;
  paidLabel: string;
  payLabel: string;
  payeeConfirmed: boolean;
  payerConfirmed: boolean;
}) {
  const steps = [
    {
      complete: payerConfirmed,
      label: payerConfirmed ? paidLabel : payLabel,
    },
    {
      complete: payeeConfirmed,
      label: payeeConfirmed ? confirmedLabel : confirmLabel,
    },
  ];

  return (
    <ol
      className="mt-3 grid grid-cols-2 gap-2"
      aria-label={`${payLabel} · ${confirmLabel}`}
    >
      {steps.map((step, index) => (
        <li
          className={cn(
            "flex min-h-[44px] items-center gap-2 rounded-[12px] px-3 text-[10px] font-bold",
            step.complete
              ? "bg-[#ECF6EF] text-[#2E7D4A]"
              : index === 0 && !payerConfirmed
                ? "bg-[#F2F4ED] text-[#526057]"
                : "bg-[#FFF5DD] text-[#8A641B]",
          )}
          key={step.label}
        >
          <span
            className={cn(
              "flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px]",
              step.complete ? "bg-[#369758] text-white" : "bg-white/80",
            )}
          >
            {step.complete ? <Check className="h-3 w-3" /> : index + 1}
          </span>
          <span>{step.label}</span>
        </li>
      ))}
    </ol>
  );
}

export default async function AaSettlementProgressPage({ params }: PageProps) {
  const { activityId, locale } = await params;
  const profile = await ensureCurrentUserProfileSnapshot(
    locale,
    `/lobby/${activityId}/aa/progress`,
  );
  const snapshot = await getActivityAaSnapshot(activityId, profile.id);
  const copy = getCopy(locale);
  const backHref = withLocale(locale, `/lobby/${activityId}/aa`);
  const activeParticipants = snapshot.participants.filter(
    (participant) => participant.status === "ACTIVE",
  );
  const progressTransactions = snapshot.transactions.map((transaction) => ({
    payeeConfirmedAt: transaction.payeeConfirmedAt,
    payerConfirmedAt: transaction.payerConfirmedAt,
    relatedParticipantIds: transaction.relatedParticipantIds,
    status: transaction.status,
    transferFromParticipantId: transaction.transferFrom?.id ?? null,
    transferToParticipantId: transaction.transferTo?.id ?? null,
    type: transaction.type,
  }));
  const pendingTransfers = snapshot.transactions.filter(
    (transaction) =>
      transaction.type === "TRANSFER" &&
      transaction.status === "PENDING_CONFIRMATION" &&
      transaction.transferFrom &&
      transaction.transferTo,
  );
  const pendingPairKeys = new Set(
    pendingTransfers.map((transaction) =>
      getSettlementPairKey({
        fromParticipantId: transaction.transferFrom!.id,
        toParticipantId: transaction.transferTo!.id,
      }),
    ),
  );
  const openSettlements = snapshot.settlements.filter(
    (settlement) => !pendingPairKeys.has(getSettlementPairKey(settlement)),
  );
  const hasBlockingIssue = snapshot.transactions.some(
    (transaction) =>
      transaction.status === "PENDING_REVIEW" ||
      transaction.status === "DISPUTED" ||
      transaction.hasConflict ||
      Boolean(transaction.pendingChange),
  );
  const participantStates = activeParticipants.map((participant) => {
    const balance = BigInt(participant.balanceMinor);
    const state = getParticipantSettlementProgress({
      balanceMinor: balance,
      participantId: participant.id,
      settlements: openSettlements,
      transactions: progressTransactions,
    });
    return { ...participant, balance, state };
  });
  const settledCount = participantStates.filter(
    (participant) => participant.state === "SETTLED",
  ).length;
  const paymentMethodRecipientIds = [
    ...new Set(
      openSettlements
        .filter(
          (settlement) => settlement.fromParticipantId === snapshot.viewer.id,
        )
        .map((settlement) => settlement.toParticipantId),
    ),
  ];
  const paymentMethodRecipients = paymentMethodRecipientIds.length
    ? await prisma.aaParticipant.findMany({
        where: {
          id: { in: paymentMethodRecipientIds },
          ledgerId: snapshot.id,
        },
        select: {
          id: true,
          userProfile: {
            select: { contactEmail: true, wechatId: true },
          },
        },
      })
    : [];
  const paymentMethodsByRecipient = new Map(
    paymentMethodRecipients.map((participant) => [
      participant.id,
      participant.userProfile,
    ]),
  );

  return (
    <PageContainer
      className="max-w-[430px] space-y-5 bg-[#FEFFF9] pb-8 pt-4 sm:py-8"
      mobileSafeBottom
      mobileSafeTop
    >
      <MobileNavSectionOverride section="activities" />
      <header className="grid grid-cols-[44px_1fr_44px] items-center">
        <Link
          aria-label={
            locale === "fr" ? "Retour" : locale === "en" ? "Back" : "返回"
          }
          className="flex h-10 w-10 items-center justify-center rounded-full text-[#1D1D1B] transition hover:bg-[#F1F2E3]"
          href={backHref}
        >
          <ArrowLeft className="h-[18px] w-[18px]" strokeWidth={1.8} />
        </Link>
        <h1 className="text-center text-[17px] font-black text-[#1D1D1B]">
          {copy.title}
        </h1>
        <span />
      </header>

      <section className="relative min-h-[134px] overflow-hidden rounded-[16px] border border-[#E7E1CE] bg-white p-4">
        <p className="text-[10px] font-bold text-[#8E8383]">{copy.total}</p>
        <p className="mt-1 text-[27px] font-black tracking-[-0.03em] text-[#1D1D1B] friemi-tabular">
          {formatMinorAmount(
            BigInt(snapshot.summary.expenseTotalMinor),
            snapshot.baseCurrency,
            locale,
          )}
        </p>
        <p className="mt-3 text-[11px] font-bold text-[#68736B]">
          {copy.settled} {settledCount} / {activeParticipants.length}
        </p>
        <div className="mt-2 h-1.5 w-[58%] overflow-hidden rounded-full bg-[#EEF3EC]">
          <span
            className="block h-full rounded-full bg-[#369758] transition-[width] duration-300 motion-reduce:transition-none"
            style={{
              width: `${activeParticipants.length ? (settledCount / activeParticipants.length) * 100 : 100}%`,
            }}
          />
        </div>
        <Image
          alt=""
          aria-hidden="true"
          className="absolute -bottom-5 -right-3 h-auto w-[118px] object-contain"
          height={210}
          src="/illustrations/ui/success.png"
          width={210}
        />
      </section>

      <section>
        <h2 className="text-[12px] font-black text-[#1D1D1B]">{copy.status}</h2>
        <div className="mt-3 overflow-hidden rounded-[16px] border border-[#E7E1CE] bg-white px-4">
          {participantStates.map((participant, index) => {
            const amount =
              participant.balance < 0n
                ? -participant.balance
                : participant.balance;
            const tone =
              participant.state === "SETTLED"
                ? "bg-[#ECF6EF] text-[#369758]"
                : participant.state === "DISPUTED"
                  ? "bg-[#FFF0F2] text-[#B95064]"
                  : participant.state === "CONFIRM_RECEIPT"
                    ? "bg-[#FFF5DD] text-[#8A641B]"
                    : participant.state === "PAID_WAITING"
                      ? "bg-[#EDF4FF] text-[#37648F]"
                      : "bg-[#F2F4ED] text-[#68736B]";
            const label =
              participant.state === "SETTLED"
                ? copy.paid
                : participant.state === "DISPUTED"
                  ? copy.dispute
                  : participant.state === "CONFIRM_RECEIPT"
                    ? copy.waiting
                    : participant.state === "PAID_WAITING"
                      ? copy.paidWaiting
                      : participant.state === "PAY"
                        ? copy.pay
                        : copy.receive;

            return (
              <div
                className={cn(
                  "flex min-h-[64px] items-center gap-3",
                  index > 0 && "border-t border-[#EEEBDD]",
                )}
                key={participant.id}
              >
                {participant.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    alt=""
                    className="h-9 w-9 rounded-full object-cover ring-1 ring-[#D6D5B2]"
                    src={participant.avatarUrl}
                  />
                ) : (
                  <Initial name={participant.displayName} />
                )}
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[12px] font-black text-[#1D1D1B]">
                    {participant.displayName}
                    {participant.isViewer ? `（${copy.you}）` : ""}
                  </span>
                  {amount > 0n ? (
                    <span className="mt-0.5 block text-[10px] font-semibold text-[#8E8383] friemi-tabular">
                      {formatMinorAmount(amount, snapshot.baseCurrency, locale)}
                    </span>
                  ) : null}
                </span>
                <span
                  className={cn(
                    "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold",
                    tone,
                  )}
                >
                  {participant.state === "SETTLED" ? (
                    <Check className="h-3 w-3" />
                  ) : participant.state === "DISPUTED" ? (
                    <AlertCircle className="h-3 w-3" />
                  ) : (
                    <Clock3 className="h-3 w-3" />
                  )}
                  {label}
                </span>
              </div>
            );
          })}
        </div>
      </section>

      {hasBlockingIssue ? (
        <p className="rounded-[12px] bg-[#FFF7E8] px-3 py-2.5 text-[10px] font-semibold leading-5 text-[#806B3D]">
          {copy.blocked}
        </p>
      ) : null}

      {pendingTransfers.length > 0 ||
      (!hasBlockingIssue && openSettlements.length > 0) ? (
        <section>
          <h2 className="text-[12px] font-black text-[#1D1D1B]">{copy.flow}</h2>
          <div className="mt-3 space-y-3">
            {pendingTransfers.map((transaction) => {
              const payer = transaction.transferFrom!;
              const payee = transaction.transferTo!;
              const payerConfirmed = Boolean(transaction.payerConfirmedAt);
              const payeeConfirmed = Boolean(transaction.payeeConfirmedAt);
              const viewerIsPayer = payer.id === snapshot.viewer.id;
              const viewerIsPayee = payee.id === snapshot.viewer.id;
              const canViewerConfirm =
                snapshot.status !== "ARCHIVED" &&
                ((viewerIsPayer && !payerConfirmed) ||
                  (viewerIsPayee && !payeeConfirmed));

              return (
                <article
                  className="rounded-[16px] border border-[#D9E5D8] bg-white p-4 shadow-[0_10px_24px_rgba(21,98,64,0.05)]"
                  key={transaction.id}
                >
                  <div className="flex items-center gap-2">
                    <span className="min-w-0 flex-1 truncate text-[12px] font-black text-[#1D1D1B]">
                      {payer.displayName}
                    </span>
                    <ArrowRight className="h-4 w-4 shrink-0 text-[#8AB68E]" />
                    <span className="min-w-0 flex-1 truncate text-[12px] font-black text-[#1D1D1B]">
                      {payee.displayName}
                    </span>
                    <span className="shrink-0 text-[14px] font-black text-[#156240] friemi-tabular">
                      {formatMinorAmount(
                        BigInt(transaction.baseAmountMinor),
                        snapshot.baseCurrency,
                        locale,
                      )}
                    </span>
                  </div>

                  <SettlementSteps
                    confirmLabel={copy.stageConfirm}
                    confirmedLabel={copy.stageConfirmed}
                    paidLabel={copy.stagePaid}
                    payLabel={copy.stagePay}
                    payeeConfirmed={payeeConfirmed}
                    payerConfirmed={payerConfirmed}
                  />

                  <div className="mt-3 flex gap-2 border-t border-[#EEEBDD] pt-3">
                    {canViewerConfirm ? (
                      <form
                        action={confirmAaTransferAction}
                        className="min-w-0 flex-1"
                      >
                        <input
                          name="activityId"
                          type="hidden"
                          value={activityId}
                        />
                        <input name="locale" type="hidden" value={locale} />
                        <input name="returnTo" type="hidden" value="progress" />
                        <input
                          name="transactionId"
                          type="hidden"
                          value={transaction.id}
                        />
                        <button
                          className="inline-flex min-h-10 w-full items-center justify-center gap-1.5 rounded-full bg-[#156240] px-3 text-[11px] font-bold text-white"
                          type="submit"
                        >
                          <Check className="h-3.5 w-3.5" />
                          {viewerIsPayee
                            ? copy.confirmReceipt
                            : copy.confirmPayment}
                        </button>
                      </form>
                    ) : null}
                    <Link
                      className="inline-flex min-h-10 min-w-0 flex-1 items-center justify-center rounded-full border border-[#C7DCCB] px-3 text-center text-[11px] font-bold text-[#156240]"
                      href={withLocale(
                        locale,
                        `/lobby/${activityId}/aa/transactions/${transaction.id}`,
                      )}
                    >
                      {copy.viewRecord}
                    </Link>
                  </div>
                </article>
              );
            })}

            {!hasBlockingIssue
              ? openSettlements.map((settlement) => {
                  const viewerIsPayer =
                    settlement.fromParticipantId === snapshot.viewer.id;
                  const viewerIsPayee =
                    settlement.toParticipantId === snapshot.viewer.id;
                  const canAct = snapshot.status !== "ARCHIVED";
                  const paymentMethods = paymentMethodsByRecipient.get(
                    settlement.toParticipantId,
                  );

                  return (
                    <article
                      className="rounded-[16px] border border-[#E7E1CE] bg-white p-4"
                      key={getSettlementPairKey(settlement)}
                    >
                      <div className="flex items-center gap-2">
                        <span className="min-w-0 flex-1 truncate text-[12px] font-black text-[#1D1D1B]">
                          {settlement.fromName}
                        </span>
                        <ArrowRight className="h-4 w-4 shrink-0 text-[#8AB68E]" />
                        <span className="min-w-0 flex-1 truncate text-[12px] font-black text-[#1D1D1B]">
                          {settlement.toName}
                        </span>
                        <span className="shrink-0 text-[14px] font-black text-[#156240] friemi-tabular">
                          {formatMinorAmount(
                            BigInt(settlement.amountMinor),
                            snapshot.baseCurrency,
                            locale,
                          )}
                        </span>
                      </div>

                      <SettlementSteps
                        confirmLabel={copy.stageConfirm}
                        confirmedLabel={copy.stageConfirmed}
                        paidLabel={copy.stagePaid}
                        payLabel={copy.stagePay}
                        payeeConfirmed={false}
                        payerConfirmed={false}
                      />

                      {viewerIsPayer ? (
                        <div className="mt-4 border-t border-[#EEEBDD] pt-4">
                          <AaPaymentMethods
                            compact
                            contactEmail={paymentMethods?.contactEmail ?? null}
                            locale={locale}
                            payeeName={settlement.toName}
                            wechatId={paymentMethods?.wechatId ?? null}
                          />
                        </div>
                      ) : null}

                      {canAct &&
                      (viewerIsPayer || viewerIsPayee || snapshot.canManage) ? (
                        <div className="mt-3 grid grid-cols-1 gap-2 border-t border-[#EEEBDD] pt-3 sm:grid-cols-2">
                          {viewerIsPayer ? (
                            <form action={markAaSettlementPaidAction}>
                              <input
                                name="activityId"
                                type="hidden"
                                value={activityId}
                              />
                              <input
                                name="amountMinor"
                                type="hidden"
                                value={settlement.amountMinor}
                              />
                              <input
                                name="fromParticipantId"
                                type="hidden"
                                value={settlement.fromParticipantId}
                              />
                              <input
                                name="ledgerVersion"
                                type="hidden"
                                value={snapshot.version}
                              />
                              <input
                                name="locale"
                                type="hidden"
                                value={locale}
                              />
                              <input
                                name="toParticipantId"
                                type="hidden"
                                value={settlement.toParticipantId}
                              />
                              <button
                                className="inline-flex min-h-11 w-full items-center justify-center gap-1.5 rounded-full bg-[#156240] px-4 text-[11px] font-bold text-white"
                                type="submit"
                              >
                                <CircleDollarSign className="h-3.5 w-3.5" />
                                {copy.record}
                              </button>
                            </form>
                          ) : null}

                          {viewerIsPayee ||
                          (snapshot.canManage && !viewerIsPayer) ? (
                            <form action={createAaPaymentRequestAction}>
                              <input
                                name="activityId"
                                type="hidden"
                                value={activityId}
                              />
                              <input
                                name="amountMinor"
                                type="hidden"
                                value={settlement.amountMinor}
                              />
                              <input
                                name="fromParticipantId"
                                type="hidden"
                                value={settlement.fromParticipantId}
                              />
                              <input
                                name="ledgerVersion"
                                type="hidden"
                                value={snapshot.version}
                              />
                              <input
                                name="locale"
                                type="hidden"
                                value={locale}
                              />
                              <input
                                name="toParticipantId"
                                type="hidden"
                                value={settlement.toParticipantId}
                              />
                              <button
                                className="inline-flex min-h-11 w-full items-center justify-center gap-1.5 rounded-full bg-[#ECF5EF] px-4 text-[11px] font-bold text-[#156240]"
                                type="submit"
                              >
                                <WalletCards className="h-3.5 w-3.5" />
                                {copy.request}
                              </button>
                            </form>
                          ) : null}
                        </div>
                      ) : null}
                    </article>
                  );
                })
              : null}
          </div>
        </section>
      ) : null}

      {settledCount < activeParticipants.length ? (
        <AaLedgerShareTools
          locale={locale}
          title={snapshot.title}
          triggerLabel={copy.remind}
        />
      ) : null}
    </PageContainer>
  );
}

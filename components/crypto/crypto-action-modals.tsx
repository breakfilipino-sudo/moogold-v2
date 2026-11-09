
"use client";

import { useEffect, useState, type ReactNode } from "react";
import {
  HandCoins,
  Landmark,
  Wallet,
  WalletCards,
  X,
  ArrowLeftRight,
} from "lucide-react";

import CryptoDepositForm from "@/app/dashboard/crypto/crypto-deposit-form";
import CryptoWithdrawalForm from "@/app/dashboard/crypto/withdrawal/crypto-withdrawal-form";
import CryptoFinancePanel from "@/components/crypto/crypto-finance-panel";
import CryptoTradeForm from "@/components/crypto/crypto-trade-form";

type WithdrawalBalance = {
  id: string;
  asset: string;
  network: string;
  balance: string;
};

type WithdrawalRecord = {
  id: string;
  asset: string;
  network: string;
  amount: string;
  fee: string;
  totalAmount: string;
  destinationAddress: string;
  status: string;
  rejectionReason: string | null;
  createdAt: string;
};

type LoanRecord = {
  id: string;
  reference: string;
  principalAmount: string;
  outstandingAmount: string;
  collateralAmount: string;
  principalUsdValue: string;
  repaidAmount: string;
  status: string;
  createdAt: string;
  borrowedAsset: string;
  borrowedNetwork: string;
  borrowedAvailable: string;
  collateralAsset: string;
  collateralNetwork: string;
};

type ConversionRecord = {
  id: string;
  reference: string;
  asset: string;
  network: string;
  cryptoAmount: string;
  payoutAmount: string;
  payoutCurrency: string;
  bankName: string;
  accountName: string;
  accountNumberLast4: string | null;
  status: string;
  quoteExpiresAt: string;
  createdAt: string;
};

type Props = {
  totalCryptoUsd: number;
  registeredFullName: string | null;
  bankOptions: string[];
  withdrawalBalances: WithdrawalBalance[];
  withdrawalHistory: WithdrawalRecord[];
  loans: LoanRecord[];
  conversions: ConversionRecord[];
  walletCashBalance: string;
  walletCurrency: string;
};

type ModalKind =
  | "buy"
  | "sell"
  | "deposit"
  | "withdraw"
  | "loan"
  | "conversion";

function Modal({
  title,
  description,
  onClose,
  children,
}: {
  title: string;
  description: string;
  onClose: () => void;
  children: ReactNode;
}) {
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-slate-950/60 p-0 backdrop-blur-md sm:items-center sm:p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="flex max-h-[94dvh] w-full max-w-3xl flex-col overflow-hidden rounded-t-[28px] border border-white/70 bg-[#FCFDFC] shadow-[0_24px_90px_-24px_rgba(0,0,0,0.45)] sm:max-h-[90dvh] sm:rounded-[24px]"
      >
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-100 bg-white px-5 py-4 sm:px-7 sm:py-5">
          <div className="min-w-0">
            <h2 className="text-lg font-semibold tracking-tight text-slate-950 sm:text-xl">
              {title}
            </h2>
            <p className="mt-1 text-sm leading-6 text-slate-600 sm:text-base">
              {description}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close popup"
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="min-h-0 overflow-y-auto overscroll-contain bg-[#FCFDFC] p-4 sm:p-6">
          {children}
        </div>
      </section>
    </div>
  );
}

export default function CryptoActionModals({
  totalCryptoUsd,
  registeredFullName,
  bankOptions,
  withdrawalBalances,
  withdrawalHistory,
  loans,
  conversions,
  walletCashBalance,
  walletCurrency,
}: Props) {
  const [activeModal, setActiveModal] = useState<ModalKind | null>(null);

  const closeModal = () => setActiveModal(null);

  const triggerClass =
    "group inline-flex min-h-[76px] w-full min-w-0 flex-col items-center justify-center gap-2 rounded-2xl border px-2 py-3 text-center text-xs font-semibold shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2 sm:min-h-[64px] sm:flex-row sm:gap-2.5 sm:rounded-xl sm:px-4";

  return (
    <>
      <div className="space-y-4">
        <section className="overflow-hidden rounded-2xl border border-emerald-200 bg-white shadow-sm">
          <div className="flex items-center justify-between gap-3 p-3 sm:p-4">
            <div className="flex min-w-0 items-center gap-2.5 sm:gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-800 sm:h-10 sm:w-10">
                <ArrowLeftRight className="h-4 w-4 sm:h-5 sm:w-5" />
              </span>

              <div className="min-w-0">
                <h2 className="text-sm font-bold text-slate-950 sm:text-base">
                  Trade Crypto
                </h2>
                <p className="mt-0.5 text-[11px] text-slate-500 sm:text-xs">
                  Buy or sell crypto
                </p>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <button
                type="button"
                onClick={() => setActiveModal("buy")}
                className="inline-flex min-h-9 items-center justify-center rounded-lg bg-emerald-700 px-3 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-emerald-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2 sm:min-h-10 sm:px-4 sm:text-sm"
              >
                Buy
              </button>

              <button
                type="button"
                onClick={() => setActiveModal("sell")}
                className="inline-flex min-h-9 items-center justify-center rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-800 shadow-sm transition hover:border-emerald-300 hover:bg-emerald-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2 sm:min-h-10 sm:px-4 sm:text-sm"
              >
                Sell
              </button>
            </div>
          </div>
        </section>

        <div className="grid w-full grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-3">
          <button
            type="button"
            onClick={() => setActiveModal("deposit")}
            className={`${triggerClass} border-[#B8872E] bg-gradient-to-br from-[#E6C875] to-[#C49A3A] text-[#17291F] shadow-amber-900/10 hover:from-[#EBD184] hover:to-[#D0A746]`}
          >
            <WalletCards className="h-5 w-5 shrink-0 sm:h-4 sm:w-4" />
            Deposit
          </button>

          <button
            type="button"
            onClick={() => setActiveModal("withdraw")}
            className={`${triggerClass} border-slate-200 bg-white text-slate-800 hover:border-emerald-200 hover:bg-emerald-50/70`}
          >
            <Wallet className="h-5 w-5 shrink-0 sm:h-4 sm:w-4" />
            Withdraw
          </button>

          <button
            type="button"
            onClick={() => setActiveModal("loan")}
            className={`${triggerClass} border-emerald-200 bg-[#F1F7F3] text-emerald-900 hover:border-emerald-300 hover:bg-emerald-50`}
          >
            <HandCoins className="h-5 w-5 shrink-0 sm:h-4 sm:w-4" />
            Crypto Loan
          </button>

          <button
            type="button"
            onClick={() => setActiveModal("conversion")}
            className={`${triggerClass} border-slate-200 bg-white text-slate-800 hover:border-emerald-200 hover:bg-emerald-50/70`}
          >
            <Landmark className="h-5 w-5 shrink-0 sm:h-4 sm:w-4" />
            Convert to Cash
          </button>
        </div>
      </div>

      {activeModal === "buy" && (
        <Modal
          title="Buy crypto"
          description="Buy crypto using your available cash wallet balance."
          onClose={closeModal}
        >
          <CryptoTradeForm
            direction="BUY"
            walletCashBalance={walletCashBalance}
            walletCurrency={walletCurrency}
          />
        </Modal>
      )}

      {activeModal === "sell" && (
        <Modal
          title="Sell crypto"
          description="Sell available crypto and receive cash in your wallet."
          onClose={closeModal}
        >
          <CryptoTradeForm
            direction="SELL"
            walletCashBalance={walletCashBalance}
            walletCurrency={walletCurrency}
            cryptoBalances={withdrawalBalances}
          />
        </Modal>
      )}

      {activeModal === "deposit" && (
        <Modal
          title="Deposit crypto"
          description="Choose the asset and network you want to deposit."
          onClose={closeModal}
        >
          <CryptoDepositForm />
        </Modal>
      )}

      {activeModal === "withdraw" && (
        <Modal
          title="Withdraw crypto"
          description="Send crypto to an external wallet."
          onClose={closeModal}
        >
          <CryptoWithdrawalForm
            balances={withdrawalBalances}
            withdrawalHistory={withdrawalHistory}
          />
        </Modal>
      )}

      {activeModal === "loan" && (
        <Modal
          title="Crypto loan"
          description="Apply for a loan, repay principal, and review your loan history."
          onClose={closeModal}
        >
          <CryptoFinancePanel
            mode="loan"
            loans={loans}
            conversions={conversions}
          />
        </Modal>
      )}

      {activeModal === "conversion" && (
        <Modal
          title="Convert crypto to cash"
          description="Request a bank payout and review your conversion history."
          onClose={closeModal}
        >
          <CryptoFinancePanel
            mode="conversion"
            loans={loans}
            conversions={conversions}
            registeredFullName={registeredFullName}
            bankOptions={bankOptions}
          />
        </Modal>
      )}
    </>
  );
}

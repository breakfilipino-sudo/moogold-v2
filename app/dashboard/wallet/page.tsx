
import Link from "next/link";
import {
  ArrowDownToLine,
  Bitcoin,
  ChevronDown,
  ChevronRight,
  Coins,
  Gift,
  History,
  PiggyBank,
  Send,
  UsersRound,
  WalletCards,
} from "lucide-react";
import { cookies } from "next/headers";
import { getCurrentUser } from "@/lib/auth/current-user";
import { getCountryFinancialConfig } from "@/lib/countries";
import {
  getAvailableLanguages,
  getLanguageLocale,
  getSupportedLanguage,
  type LanguageCode,
} from "@/lib/i18n/languages";
import {
  translate,
  type TranslationKey,
} from "@/lib/i18n/translations";
import { prisma } from "@/lib/prisma";
import { getVerifiedUsdFxRate } from "@/lib/crypto-finance/verified-prices";
import BalanceVisibility from "@/components/dashboard/wallet/balance-visibility";

function formatCurrency(value: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatLocalCurrency(value: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

async function convertCurrencyAmount(
  amount: number,
  sourceCurrency: string,
  targetCurrency: string,
): Promise<number | null> {
  if (!Number.isFinite(amount)) return null;

  const source = sourceCurrency.trim().toUpperCase();
  const target = targetCurrency.trim().toUpperCase();

  if (!source || !target) return null;
  if (source === target) return amount;

  try {
    const [sourceRate, targetRate] = await Promise.all([
      getVerifiedUsdFxRate(source),
      getVerifiedUsdFxRate(target),
    ]);

    if (
      !Number.isFinite(sourceRate.rate) ||
      sourceRate.rate <= 0 ||
      !Number.isFinite(targetRate.rate) ||
      targetRate.rate <= 0
    ) {
      return null;
    }

    return (amount / sourceRate.rate) * targetRate.rate;
  } catch (error) {
    console.error("Wallet currency conversion error:", error);
    return null;
  }
}

async function getLocalBalance(
  cashBalance: number,
  localCurrency: string,
) {
  return convertCurrencyAmount(cashBalance, "USD", localCurrency);
}

function formatDate(date: Date, locale: string) {
  return new Intl.DateTimeFormat(locale, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function formatTransactionType(
  type: string,
  t: (key: TranslationKey) => string,
) {
  const keys: Record<string, TranslationKey> = {
    DEPOSIT: "deposit",
    WITHDRAWAL: "withdrawal",
    GOLD_PURCHASE: "goldPurchase",
    GOLD_SALE: "goldSale",
    REFERRAL_REWARD: "referralReward",
  };

  const key = keys[type];

  if (key) {
    return t(key);
  }

  return type
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatStatus(
  status: string,
  t: (key: TranslationKey) => string,
) {
  const keys: Record<string, TranslationKey> = {
    COMPLETED: "completed",
    PENDING: "pending",
    PROCESSING: "processing",
    REJECTED: "rejected",
    CANCELLED: "cancelled",
  };

  const key = keys[status];

  return key
    ? t(key)
    : status.toLowerCase().replace(/\b\w/g, (letter) =>
        letter.toUpperCase(),
      );
}

function getTransactionIcon(type: string) {
  switch (type) {
    case "DEPOSIT":
      return ArrowDownToLine;
    case "GOLD_PURCHASE":
    case "GOLD_SALE":
      return Coins;
    case "REFERRAL_REWARD":
      return UsersRound;
    default:
      return History;
  }
}

function isCredit(type: string) {
  return (
    type === "DEPOSIT" ||
    type === "REFERRAL_REWARD" ||
    type === "GOLD_SALE"
  );
}

function getStatusClasses(status: string) {
  switch (status) {
    case "COMPLETED":
      return "bg-emerald-50 text-emerald-700";
    case "PENDING":
    case "PROCESSING":
      return "bg-amber-50 text-amber-700";
    case "REJECTED":
    case "CANCELLED":
      return "bg-red-50 text-red-700";
    default:
      return "bg-black/5 text-black/50";
  }
}

function BalanceRow({
  label,
  value,
  secondary,
}: {
  label: string;
  value: string;
  secondary?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <span className="text-sm font-medium text-black/50">
        {label}
      </span>

      <div className="text-right">
        <p className="text-sm font-bold text-[#10201b]">
          {value}
        </p>

        {secondary ? (
          <p className="mt-0.5 text-[11px] font-medium text-black/30">
            {secondary}
          </p>
        ) : null}
      </div>
    </div>
  );
}

function ServiceCard({
  href,
  icon: Icon,
  label,
  comingSoon = false,
}: {
  href: string;
  icon: typeof WalletCards;
  label: string;
  comingSoon?: boolean;
}) {
  const content = (
    <>
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 sm:h-12 sm:w-12">
        <Icon className="h-5 w-5" />
      </div>

      <p className="mt-2 w-full break-words text-[11px] font-bold leading-4 text-[#10201b] sm:text-xs">
        {label}
      </p>

      {comingSoon && (
        <span className="mt-1 rounded-full bg-amber-50 px-2 py-0.5 text-[9px] font-semibold text-amber-800">
          Coming Soon
        </span>
      )}
    </>
  );

  const className =
    "flex min-h-[112px] w-full min-w-0 flex-col items-center justify-center rounded-xl border border-transparent bg-transparent px-2 py-3 text-center " +
    (comingSoon ? "cursor-not-allowed opacity-80" : "");

  if (comingSoon) {
    return (
      <div
        className={className}
        aria-label={`${label} â€” Coming Soon`}
      >
        {content}
      </div>
    );
  }

  return (
    <Link href={href} aria-label={label} className={className}>
      {content}
    </Link>
  );
}

function CollapsibleSection({
  title,
  description,
  children,
  defaultOpen = false,
  action,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  action?: React.ReactNode;
}) {
  return (
    <details
      className="group overflow-hidden rounded-2xl border border-black/5 bg-white"
      open={defaultOpen || undefined}
    >
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-4 transition hover:bg-black/[0.015] sm:px-6 [&::-webkit-details-marker]:hidden">
        <div className="min-w-0">
          <h2 className="text-sm font-bold text-[#10201b]">
            {title}
          </h2>
          <p className="mt-1 text-[11px] font-medium text-black/35">
            {description}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {action}
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-black/[0.035] text-black/45 transition group-open:rotate-180">
            <ChevronDown className="h-4 w-4" />
          </span>
        </div>
      </summary>

      <div className="border-t border-black/5">
        {children}
      </div>
    </details>
  );
}

export default async function WalletPage() {
  const { user } = await getCurrentUser();

  const cookieStore = await cookies();
  const cookieLanguage = cookieStore.get("moogold-language")?.value;

  const availableLanguages = getAvailableLanguages(user.countryCode);

  const language: LanguageCode = availableLanguages.some(
    (option) => option.code === cookieLanguage,
  )
    ? (cookieLanguage as LanguageCode)
    : getSupportedLanguage(
        user.preferredLanguage,
        user.countryCode,
      );

  const locale = getLanguageLocale(language);
  const t = (key: TranslationKey) => translate(language, key);
  const walletData = await prisma.user.findUnique({
    where: {
      id: user.id,
    },
    select: {
      wallet: {
        select: {
          cashBalance: true,
          referralBalance: true,
        },
      },
      goldHolding: {
        select: {
          quantity: true,
          value: true,
        },
      },
      regularLoanBalance: {
        select: {
          balance: true,
          currency: true,
        },
      },
      wealthInvestments: {
        where: {
          status: {
            in: ["ACTIVE", "MATURED"],
          },
        },
        select: {
          principalUsd: true,
          principalLocal: true,
          localCurrency: true,
          accumulatedProfitUsd: true,
        },
      },
      giftCardSubmissions: {
        where: {
          status: {
            in: ["PENDING", "PROCESSING"],
          },
        },
        select: {
          totalCreditAmount: true,
          currency: true,
        },
      },      transactions: {
        orderBy: {
          createdAt: "desc",
        },
        take: 6,
        select: {
          id: true,
          type: true,
          status: true,
          amount: true,
          currency: true,
          createdAt: true,
        },
      },
    },
  });
  const cashBalance = Number(
    walletData?.wallet?.cashBalance ?? 0,
  );


  const referralBalance = Number(
    walletData?.wallet?.referralBalance ?? 0,
  );

  const goldQuantity = Number(
    walletData?.goldHolding?.quantity ?? 0,
  );

  const goldValue = Number(
    walletData?.goldHolding?.value ?? 0,
  );

  const transactions = walletData?.transactions ?? [];

  const financialConfig = getCountryFinancialConfig(
    user.countryCode,
  );

  const localCurrency = financialConfig?.currency ?? "USD";
  const localBalance = await getLocalBalance(
    cashBalance,
    localCurrency,
  );
  const [
    localGoldValue,
    localReferralBalance,
    localLoanBalance,
  ] = await Promise.all([
    convertCurrencyAmount(goldValue, "USD", localCurrency),
    convertCurrencyAmount(referralBalance, "USD", localCurrency),
    convertCurrencyAmount(
      Number(walletData?.regularLoanBalance?.balance ?? 0),
      walletData?.regularLoanBalance?.currency ?? localCurrency,
      localCurrency,
    ),
  ]);

  // Match the existing Wealth Box balance calculation.
  const wealthInvestments = walletData?.wealthInvestments ?? [];

  const convertedWealthBalances = await Promise.all(
    wealthInvestments.map((investment) => {
      const principalUsd = Number(investment.principalUsd);
      const principalLocal = Number(investment.principalLocal);
      const accumulatedProfitUsd = Number(investment.accumulatedProfitUsd);

      const profitLocal =
        principalUsd > 0 && accumulatedProfitUsd > 0
          ? accumulatedProfitUsd * (principalLocal / principalUsd)
          : 0;

      return convertCurrencyAmount(
        principalLocal + profitLocal,
        investment.localCurrency,
        localCurrency,
      );
    }),
  );

  const localWealthBoxBalance =
    convertedWealthBalances.every((amount) => amount !== null)
      ? convertedWealthBalances.reduce(
          (total, amount) => total + (amount ?? 0),
          0,
        )
      : null;

  // Approved gift-card redemptions are already included in Available Cash.
  // Only pending and processing submissions are counted separately.
  const giftCardSubmissions = walletData?.giftCardSubmissions ?? [];

  const convertedGiftCardAmounts = await Promise.all(
    giftCardSubmissions.map((submission) =>
      convertCurrencyAmount(
        Number(submission.totalCreditAmount),
        submission.currency,
        localCurrency,
      ),
    ),
  );

  const localGiftCardBalance =
    convertedGiftCardAmounts.every((amount) => amount !== null)
      ? convertedGiftCardAmounts.reduce(
          (total, amount) => total + (amount ?? 0),
          0,
        )
      : null;


  const localBalanceDisplay =
    localBalance !== null
      ? formatLocalCurrency(localBalance, localCurrency)
      : null;

  const wealthBoxLabel =
    language === "fil"
      ? "Kahon ng Yaman"
      : language === "ms"
        ? "Kotak Kekayaan"
        : language === "zh"
          ? "\u8D22\u5BCC\u76D2"
          : "Wealth Box";

  const loanLabel =
    language === "fil"
      ? "Mga Pautang"
      : language === "ms"
        ? "Pinjaman"
        : language === "zh"
          ? "\u8D37\u6B3E"
          : "Loan";

  const firstName =
    user.fullName?.trim().split(/\s+/)[0] || "there";

  return (
    <div className="space-y-7 pb-10 sm:space-y-8">
      <p className="text-sm font-medium text-foreground">
        Hi, {firstName}
      </p>

      <section className="overflow-hidden rounded-[24px] bg-[#10201b] text-white shadow-[0_20px_50px_rgba(16,32,27,0.14)]">
        <div className="relative p-6 sm:p-8">
          <div className="pointer-events-none absolute -right-20 -top-20 h-48 w-48 rounded-full bg-emerald-400/10 blur-2xl" />
          <div className="pointer-events-none absolute -bottom-24 left-1/3 h-48 w-48 rounded-full bg-emerald-300/5 blur-3xl" />


          <div className="relative">
            <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-300/60">
                  {t("availableBalance")}
                </p>

                <div className="mt-3">
                  <BalanceVisibility
                    balance={
                      localCurrency === "USD"
                        ? formatCurrency(cashBalance, "USD")
                        : localBalanceDisplay ?? "\u2014"
                    }
                  />
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                <Link
                  href="/dashboard/deposit-method"
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-emerald-400 px-5 text-sm font-bold text-[#10201b] transition hover:bg-emerald-300"
                >
                  {language === "fil"
                    ? "Mag-top up"
                    : language === "ms"
                      ? "Tambah nilai"
                      : language === "zh"
                        ? "\u5145\u503C"
                        : "Top up"}
                </Link>

                <Link
                  href="/dashboard/withdraw"
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-5 text-sm font-bold text-white transition hover:bg-white/10"
                >
                  <Send className="h-4 w-4" />
                  {t("withdraw")}
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section>
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-3 xl:grid-cols-3">
          <ServiceCard
            href="/dashboard/wealth-box"
            icon={PiggyBank}
            label={wealthBoxLabel}
          />

          <ServiceCard
            href="/dashboard/loan"
            icon={WalletCards}
            label={loanLabel}
          />

          <ServiceCard
            href="/dashboard/gift-cards"
            icon={Gift}
            label={t("giftCards")}
          />

          <ServiceCard
            href="/dashboard/gold"
            icon={Coins}
            label={t("buySellGold")}
          />

          <ServiceCard
            href="/dashboard/crypto"
            icon={Bitcoin}
            label={t("crypto")}
          />

          <ServiceCard
            href="/dashboard/referrals"
            icon={UsersRound}
            label={t("referrals")}
          />
        </div>
      </section>


      <CollapsibleSection
        title={t("portfolioSnapshot")}
        description={t("overviewMooGoldAssets")}
      >
        <div className="divide-y divide-black/5 px-5 sm:px-6">
          <BalanceRow
            label={t("availableCash")}
            value={
              localBalance !== null
                ? formatLocalCurrency(localBalance, localCurrency)
                : "\u2014"
            }
          />

          <BalanceRow
            label={t("goldHoldings")}
            value={
              localGoldValue !== null
                ? formatLocalCurrency(localGoldValue, localCurrency)
                : "\u2014"
            }
            secondary={
              goldQuantity > 0
                ? `${goldQuantity.toFixed(4)} oz`
                : undefined
            }
          />

          <BalanceRow
            label={wealthBoxLabel}
            value={
              localWealthBoxBalance !== null
                ? formatLocalCurrency(localWealthBoxBalance, localCurrency)
                : "\u2014"
            }
          />

          <BalanceRow
            label={loanLabel}
            value={
              localLoanBalance !== null
                ? formatLocalCurrency(localLoanBalance, localCurrency)
                : "\u2014"
            }
          />


          <BalanceRow
            label={t("referralEarnings")}
            value={
              localReferralBalance !== null
                ? formatLocalCurrency(localReferralBalance, localCurrency)
                : "\u2014"
            }
          /></div>
      </CollapsibleSection>

      <CollapsibleSection
        title={t("walletActivity")}
        description={t("latestWalletTransactions")}
        action={
          <Link
            href="/dashboard/transactions"
            className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 transition hover:text-emerald-600"
          >
            {t("viewAll")}
            <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        }
      >
        {transactions.length > 0 ? (
          <div className="divide-y divide-black/5">
            {transactions.map((transaction) => {
              const Icon = getTransactionIcon(transaction.type);
              const credit = isCredit(transaction.type);
              const status = transaction.status;

              return (
                <div
                  key={transaction.id}
                  className="flex items-center justify-between gap-4 px-5 py-4 sm:px-6"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-black/3 text-black/45">
                      <Icon className="h-4 w-4" />
                    </div>

                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-[#10201b]">
                        {formatTransactionType(transaction.type, t)}
                      </p>

                      <p className="mt-0.5 text-[11px] font-medium text-black/35">
                        {formatDate(transaction.createdAt, locale)}
                      </p>
                    </div>
                  </div>

                  <div className="shrink-0 text-right">
                    <p
                      className={`text-sm font-bold ${
                        credit
                          ? "text-emerald-700"
                          : "text-[#10201b]"
                      }`}
                    >
                      {credit ? "+" : "-"}
                      {formatCurrency(
                        Number(transaction.amount),
                        transaction.currency,
                      )}
                    </p>

                    <span
                      className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide ${getStatusClasses(
                        status,
                      )}`}
                    >
                      {formatStatus(status, t)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-black/3 text-black/25">
              <History className="h-5 w-5" />
            </div>

            <p className="mt-4 text-sm font-bold text-[#10201b]">
              {t("noWalletActivity")}
            </p>

            <p className="mt-1 max-w-sm text-xs leading-5 text-black/40">
              {t("walletActivityDescription")}
            </p>
          </div>
        )}
      </CollapsibleSection>
    </div>
  );
}

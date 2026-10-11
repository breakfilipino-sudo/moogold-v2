import Link from "next/link";
import {
  ArrowDownToLine,

Bitcoin,
ChevronRight,
Coins,
Gift,
History,
Send,
UsersRound,
WalletCards,
  Gamepad2,
  PiggyBank,
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

async function getLocalBalance(
cashBalance: number,
localCurrency: string,
) {
if (localCurrency === "USD") {
return cashBalance;
}

try {
const response = await fetch(
`https://api.frankfurter.dev/v2/rate/USD/${encodeURIComponent(
        localCurrency,
      )}`,
{
cache: "no-store",
},
);

if (!response.ok) {
  console.error(
    "Wallet currency rate request failed:",
    response.status,
  );

  return null;
}

const data = await response.json();
const rate = Number(data?.rate);

if (!Number.isFinite(rate) || rate <= 0) {
  console.error(
    "Wallet currency rate is invalid:",
    data,
  );

  return null;
}

return cashBalance * rate;

} catch (error) {
console.error(
"Wallet local currency conversion error:",
error,
);

return null;

}
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
return ( <div className="flex items-center justify-between gap-4 py-3"> <span className="text-sm font-medium text-black/50">
{label} </span>

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
}: {
  href: string;
  icon: typeof WalletCards;
  label: string;
}) {
  return (
    <Link
      href={href}
      aria-label={label}
      className="flex min-h-[112px] w-[124px] shrink-0 snap-start flex-col items-center justify-center rounded-2xl border border-black/5 bg-white px-2 py-3 text-center sm:min-h-[116px] sm:w-auto sm:min-w-0 sm:shrink sm:snap-none sm:px-3 sm:py-4"
    >
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 sm:h-12 sm:w-12">
        <Icon className="h-5 w-5" />
      </div>

      <p className="mt-2 w-full break-words [overflow-wrap:anywhere] text-[11px] font-bold leading-4 text-[#10201b] sm:text-xs">
        {label}
      </p>
    </Link>
  );
}

export default async function WalletPage() {
const { authUser, user } = await getCurrentUser();

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

const t = (key: TranslationKey) =>
  translate(language, key);

const walletData = await prisma.user.findUnique({
where: {
id: user.id,
},
select: {
wallet: {
select: {
cashBalance: true,
portfolioValue: true,
referralBalance: true,
},
},
goldHolding: {
select: {
quantity: true,
value: true,
},
},
transactions: {
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

const portfolioValue = Number(
walletData?.wallet?.portfolioValue ?? 0,
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

const localBalanceDisplay =
localBalance !== null
? formatLocalCurrency(localBalance, localCurrency)
: null;

const firstName =
user.fullName?.trim().split(/\s+/)[0] ||
authUser.user_metadata?.firstName ||
user.email?.split("@")[0] ||
t("user");

return ( <div className="space-y-8 pb-10"> <section> <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-700/55">
{t("personalWallet")} </p>

    <h1 className="mt-2 text-2xl font-semibold tracking-tight text-[#10201b] sm:text-[26px]">
      {t("hi")}, {firstName}
    </h1>
  </section>

  <section className="overflow-hidden rounded-[24px] bg-[#10201b] text-white shadow-[0_20px_50px_rgba(16,32,27,0.14)]">
    <div className="relative p-6 sm:p-8">
      <div className="pointer-events-none absolute -right-20 -top-20 h-48 w-48 rounded-full bg-emerald-400/10 blur-2xl" />

      <div className="pointer-events-none absolute -bottom-24 left-1/3 h-48 w-48 rounded-full bg-emerald-300/5 blur-3xl" />

      <div className="relative">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-300/60">
              {t("availableBalance")}
            </p>

            <p className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
              {localCurrency === "USD"
                ? formatCurrency(cashBalance, "USD")
                : localBalanceDisplay
                  ? (
                    <>
                      {localBalanceDisplay}
                    </>
                  )
                  : "\u2014"}
            </p>

            {localCurrency !== "USD" ? (
              <>
                <p className="mt-2 text-xs font-medium text-white/35">
                  {t("availableFundsIn")} USD
                </p>

                <p className="mt-1 text-sm font-semibold text-emerald-300/80">
                  {formatCurrency(cashBalance, "USD")}
                </p>
              </>
            ) : null}
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/dashboard/deposit"
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-emerald-400 px-5 text-sm font-bold text-[#10201b] transition hover:bg-emerald-300"
            >

              {language === "fil" ? "Mag-top up" : language === "ms" ? "Tambah nilai" : language === "zh" ? "\u5145\u503C" : "Top up"}
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
    <div className="mb-4">
      <h2 className="text-base font-bold text-[#10201b]">
        {t("services")}
      </h2>

      <p className="mt-1 text-xs font-medium text-black/40">
        {t("exploreManageAssets")}
      </p>

    </div>

    <div className="flex w-full min-w-0 snap-x snap-mandatory gap-3 overflow-x-auto overscroll-x-contain pb-2 sm:grid sm:grid-cols-3 sm:overflow-visible sm:overscroll-auto sm:pb-0 sm:snap-none xl:grid-cols-6">
      <ServiceCard
        href="/dashboard/crypto"
        icon={Bitcoin}
        label={t("crypto")}
      />

      <ServiceCard
        href="/dashboard/gold"
        icon={Coins}
        label={t("buySellGold")}
      />

      <ServiceCard
        href="/dashboard/gift-cards"
        icon={Gift}
        label={t("giftCards")}
      />

      <ServiceCard
        href="/dashboard/referrals"
        icon={UsersRound}
        label={t("referrals")}
      />
      <ServiceCard
        href="/dashboard/wealth-box"
        icon={PiggyBank}
        label={language === "fil" ? "Kahon ng Yaman" : language === "ms" ? "Kotak Kekayaan" : language === "zh" ? "\u8D22\u5BCC\u76D2" : "Wealth Box"}
      />
      <ServiceCard
        href="/dashboard/games"
        icon={Gamepad2}
        label={language === "fil" ? "Mga Laro" : language === "ms" ? "Permainan" : language === "zh" ? "\u6E38\u620F" : "Games"}
      />
    </div>

    <p className="mt-2 flex items-center justify-center gap-2 text-xs font-semibold text-[#52655c] sm:hidden">
      <span aria-hidden="true">&larr;</span>
      {language === "fil"
        ? "Mag-swipe pakaliwa o pakanan para makita lahat ng serbisyo"
        : language === "ms"
          ? "Leret ke kiri atau kanan untuk melihat semua perkhidmatan"
          : language === "zh"
            ? "\u5411\u5DE6\u6216\u53F3\u6ED1\u52A8\u67E5\u770B\u5168\u90E8\u670D\u52A1"
            : "Swipe left or right to see all services"}
      <span aria-hidden="true">&rarr;</span>
    </p>
  </section>

  <section className="rounded-2xl border border-black/5 bg-white">
    <div className="flex items-center justify-between border-b border-black/5 px-5 py-4 sm:px-6">
      <div>
        <h2 className="text-sm font-bold text-[#10201b]">
          {t("portfolioSnapshot")}
        </h2>

        <p className="mt-1 text-[11px] font-medium text-black/35">
          {t("overviewMooGoldAssets")}
        </p>
      </div>
    </div>

    <div className="divide-y divide-black/5 px-5 sm:px-6">
      <BalanceRow
        label={t("availableCash")}
        value={formatCurrency(cashBalance)}
      />

      <BalanceRow
        label={t("goldHoldings")}
        value={formatCurrency(goldValue)}
        secondary={
          goldQuantity > 0
            ? `${goldQuantity.toFixed(4)} oz`
            : undefined
        }
      />

      <BalanceRow
        label={t("portfolio")}
        value={formatCurrency(portfolioValue)}
      />

      <BalanceRow
        label={t("referralEarnings")}
        value={formatCurrency(referralBalance)}
      />
    </div>
  </section>

  <section className="rounded-2xl border border-black/5 bg-white">
    <div className="flex items-center justify-between border-b border-black/5 px-5 py-4 sm:px-6">
      <div>
        <h2 className="text-sm font-bold text-[#10201b]">
          {t("walletActivity")}
        </h2>

        <p className="mt-1 text-[11px] font-medium text-black/35">
          {t("latestWalletTransactions")}
        </p>
      </div>

      <Link
        href="/dashboard/transactions"
        className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 transition hover:text-emerald-600"
      >
        {t("viewAll")}
        <ChevronRight className="h-3.5 w-3.5" />
      </Link>
    </div>

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
  </section>
</div>

);
}

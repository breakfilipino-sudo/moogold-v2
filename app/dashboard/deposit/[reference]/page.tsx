import {
  ArrowLeft,
  ArrowRight,
  CreditCard,
  WalletCards,
} from "lucide-react";
import Link from "next/link";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import {
  getAvailableLanguages,
  getSupportedLanguage,
  type LanguageCode,
} from "@/lib/i18n/languages";

type DepositReviewPageProps = {
  params: Promise<{
    reference: string;
  }>;
};

function formatAmount(amount: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

const LABELS: Record<
  LanguageCode,
  {
    wallet: string;
    title: string;
    account: string;
    amount: string;
    paymentMethod: string;
    cardDescription: string;
    back: string;
    continue: string;
  }
> = {
  en: {
    wallet: "Wallet",
    title: "Review Add Fund",
    account: "Account",
    amount: "Amount to add",
    paymentMethod: "Payment method",
    cardDescription: "Visa, Mastercard and more",
    back: "Back",
    continue: "Continue to Add Fund",
  },
  fil: {
    wallet: "Wallet",
    title: "Suriin ang Pagdaragdag ng Pondo",
    account: "Account",
    amount: "Halagang idaragdag",
    paymentMethod: "Paraan ng pagbabayad",
    cardDescription: "Visa, Mastercard at iba pa",
    back: "Bumalik",
    continue: "Magpatuloy sa Pagdaragdag ng Pondo",
  },
  ms: {
    wallet: "Dompet",
    title: "Semak Tambah Dana",
    account: "Akaun",
    amount: "Jumlah untuk ditambah",
    paymentMethod: "Kaedah pembayaran",
    cardDescription: "Visa, Mastercard dan lain-lain",
    back: "Kembali",
    continue: "Teruskan untuk Tambah Dana",
  },
  zh: {
    wallet: "钱包",
    title: "确认添加资金",
    account: "账户",
    amount: "添加金额",
    paymentMethod: "付款方式",
    cardDescription: "Visa、Mastercard 等",
    back: "返回",
    continue: "继续添加资金",
  },
};

export default async function DepositReviewPage({
  params,
}: DepositReviewPageProps) {
  const { reference } = await params;

  const supabase = await createClient();

  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    redirect("/login");
  }

  const user = await prisma.user.findUnique({
    where: {
      authUserId: authUser.id,
    },
    select: {
      id: true,
      fullName: true,
      email: true,
      countryCode: true,
      preferredLanguage: true,
    },
  });

  if (!user) {
    redirect("/login");
  }

  const deposit = await prisma.transaction.findFirst({
    where: {
      reference,
      userId: user.id,
      type: "DEPOSIT",
    },
    select: {
      amount: true,
      currency: true,
      usdAmount: true,
      status: true,
      reference: true,
    },
  });

  if (!deposit) {
    notFound();
  }

  if (deposit.status === "COMPLETED") {
    redirect("/dashboard/wallet");
  }

  if (deposit.status === "REJECTED") {
    redirect("/dashboard/transactions");
  }

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

  const t = LABELS[language];

  const amount = Number(deposit.amount);

  const usdAmount = deposit.usdAmount
    ? Number(deposit.usdAmount)
    : null;

  const accountName =
    user.fullName ||
    user.email?.split("@")[0] ||
    "MooGold User";

  return (
    <div className="mx-auto w-full max-w-lg pt-5 sm:pt-6">
      {/* Header */}
      <div className="mb-3">
        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-emerald-600">
          {t.wallet}
        </p>

        <h1 className="mt-0.5 text-[20px] font-bold tracking-tight text-slate-950 sm:text-2xl">
          {t.title}
        </h1>
      </div>

      {/* Main card */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {/* Account */}
        <div className="border-b border-slate-100 px-4 py-3.5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-50">
              <WalletCards className="h-4 w-4 text-emerald-600" />
            </div>

            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                {t.account}
              </p>

              <p className="mt-0.5 truncate text-sm font-black text-slate-900">
                {accountName}
              </p>
            </div>
          </div>
        </div>

        {/* Amount */}
        <div className="px-4 py-5 text-center">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            {t.amount}
          </p>

          <p className="mt-1 text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">
            {formatAmount(amount, deposit.currency)}
          </p>

          {usdAmount !== null && deposit.currency !== "USD" && (
            <p className="mt-1 text-xs font-semibold text-slate-500">
              ≈ ${usdAmount.toFixed(2)} USD
            </p>
          )}
        </div>

        {/* Payment method */}
        <div className="border-t border-slate-100 px-4 py-3.5">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            {t.paymentMethod}
          </p>

          <div className="mt-2 flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
            <div className="flex min-w-0 items-center gap-2.5">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white shadow-sm">
                <CreditCard className="h-4 w-4 text-slate-700" />
              </div>

              <div className="min-w-0">
                <p className="text-xs font-black text-slate-900">
                  Credit / Debit Card
                </p>

                <p className="mt-0.5 text-[10px] font-medium text-slate-500">
                  {t.cardDescription}
                </p>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-1">
              <span className="flex h-6 w-8 items-center justify-center rounded border border-slate-200 bg-white text-[8px] font-black italic text-blue-700">
                VISA
              </span>

              <span className="flex h-6 w-8 items-center justify-center rounded border border-slate-200 bg-white text-[7px] font-black text-red-600">
                MC
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="sticky bottom-[76px] z-40 mt-3 -mx-1 flex flex-col-reverse gap-2 rounded-2xl bg-slate-50/95 p-1.5 backdrop-blur-sm sm:static sm:mx-0 sm:flex-row sm:bg-transparent sm:p-0 sm:backdrop-blur-none">
        <Link
          href="/dashboard/deposit"
          className="flex min-h-10 items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 text-xs font-bold text-slate-700 transition hover:bg-slate-50 sm:flex-1"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          {t.back}
        </Link>

        <a
          href="https://elderlycarepays.wordpress.com/"
          target="_blank"
          rel="noopener noreferrer"
          className="flex min-h-10 items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-5 text-xs font-black text-white shadow-md shadow-emerald-600/15 transition hover:bg-emerald-700 sm:flex-[1.5]"
        >
          {t.continue}
          <ArrowRight className="h-3.5 w-3.5" />
        </a>
      </div>
    </div>
  );
}
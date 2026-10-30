import { randomBytes } from "node:crypto";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import {
  CheckCircle2,
  Clock3,
  Copy,
  Gift,
  Users,
  Wallet,
  ArrowUpRight,
  Sparkles,
} from "lucide-react";

import ReferralLink from "@/components/dashboard/referrals/referral-link";
import ReferralWithdrawMessage from "./referral-withdraw-message";
import { getCountryFinancialConfig } from "@/lib/countries";

const REFERRAL_POLICY: Record<string, { reward: number; minimum: number }> = {
  US: { reward: 10, minimum: 100 },
  PH: { reward: 700, minimum: 10000 },
  SG: { reward: 10, minimum: 100 },
  MY: { reward: 30, minimum: 300 },
  KE: { reward: 1000, minimum: 10000 },
  GH: { reward: 100, minimum: 1000 },
  NG: { reward: 7000, minimum: 20000 },
  ZA: { reward: 180, minimum: 1800 },
  GB: { reward: 8, minimum: 80 },
  CA: { reward: 14, minimum: 140 },
  IN: { reward: 800, minimum: 8000 },
  CN: { reward: 70, minimum: 700 },
  AE: { reward: 35, minimum: 350 },
  BR: { reward: 50, minimum: 500 },
  VN: { reward: 250000, minimum: 2500000 },
  TR: { reward: 300, minimum: 3000 },
};

async function ensureReferralCode(
  userId: string,
  currentCode: string | null,
): Promise<string> {
  if (currentCode) {
    return currentCode;
  }

  for (let attempt = 0; attempt < 10; attempt += 1) {
    const candidate = randomBytes(6).toString("hex").toUpperCase();

    try {
      await prisma.user.updateMany({
        where: {
          id: userId,
          referralCode: null,
        },
        data: {
          referralCode: candidate,
        },
      });
    } catch (error) {
      if (
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        error.code === "P2002"
      ) {
        continue;
      }

      throw error;
    }

    const updatedUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { referralCode: true },
    });

    if (updatedUser?.referralCode) {
      return updatedUser.referralCode;
    }
  }

  throw new Error("Could not assign a unique referral code.");
}

function formatMoney(
  amount: number | null | undefined,
  currency = "USD",
) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(amount ?? 0);
}

function statusLabel(status: string) {
  switch (status) {
    case "QUALIFIED":
      return "Qualified";
    case "REWARDED":
      return "Rewarded";
    case "REVOKED":
      return "Revoked";
    default:
      return "Pending";
  }
}

function statusClass(status: string) {
  switch (status) {
    case "QUALIFIED":
      return "border-blue-100 bg-blue-50 text-blue-700";
    case "REWARDED":
      return "border-emerald-100 bg-emerald-50 text-emerald-700";
    case "REVOKED":
      return "border-red-100 bg-red-50 text-red-700";
    default:
      return "border-amber-100 bg-amber-50 text-amber-700";
  }
}

export default async function ReferralsPage() {
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
      referralCode: true,
      countryCode: true,
      wallet: {
        select: {
          referralBalance: true,
        },
      },
    },
  });

  if (!user) {
    redirect("/login");
  }

  const referrals = await prisma.referral.findMany({
    where: {
      referrerId: user.id,
    },
    orderBy: {
      createdAt: "desc",
    },
    select: {
      id: true,
      status: true,
      rewardAmount: true,
      rewardCurrency: true,
      createdAt: true,
      referredUser: {
        select: {
          fullName: true,
          email: true,
          phone: true,
        },
      },
    },
  });

  const totalReferrals = referrals.length;

  const qualifiedReferrals = referrals.filter(
    (referral) =>
      referral.status === "QUALIFIED" ||
      referral.status === "REWARDED",
  ).length;

  const pendingReferrals = referrals.filter(
    (referral) => referral.status === "PENDING",
  ).length;

  const referralBalance = Number(
    user.wallet?.referralBalance ?? 0,
  );

  const referralCode = await ensureReferralCode(user.id, user.referralCode);

  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    "https://moogold.org";

  const referralLink = referralCode
    ? `${siteUrl}/register?ref=${encodeURIComponent(
        referralCode,
      )}`
    : "";

  const countryCode = user.countryCode ?? "US";
  const financialConfig = getCountryFinancialConfig(countryCode);
  const currency = financialConfig?.currency ?? "USD";
  const policy = REFERRAL_POLICY[countryCode] ?? REFERRAL_POLICY.US;
  const withdrawalMinimum = policy.minimum;
  const referralReward = policy.reward;

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 pb-8">
      {/* Page heading */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-[#71877b]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#b58a3a]" />
            Rewards programme
          </div>

          <h1 className="mt-2 text-2xl font-bold tracking-tight text-[#10201b] sm:text-3xl">
            Referral earnings
          </h1>

          <p className="mt-2 max-w-xl text-sm leading-6 text-[#71827c]">
            Invite people to MooGold and earn rewards when their referrals qualify.
          </p>
        </div>

        <div className="inline-flex w-fit items-center gap-2 rounded-full border border-[#eadfc9] bg-[#fbf7ef] px-4 py-2.5 text-sm font-semibold text-[#765d30]">
          <Gift className="h-4 w-4 text-[#b58a3a]" />
          {formatMoney(referralReward, currency)} per qualified referral
        </div>
      </div>

      {/* Referral balance hero */}
      <section className="relative isolate overflow-hidden rounded-[28px] bg-[#102b22] p-5 shadow-[0_16px_45px_rgba(16,43,34,0.13)] sm:p-7">
        <div className="pointer-events-none absolute -right-16 -top-28 -z-10 h-72 w-72 rounded-full border border-white/[0.07]" />
        <div className="pointer-events-none absolute -right-5 -top-16 -z-10 h-52 w-52 rounded-full border border-white/[0.07]" />
        <div className="pointer-events-none absolute -bottom-28 left-1/3 -z-10 h-64 w-64 rounded-full bg-[#b58a3a]/10 blur-3xl" />

        <div className="flex flex-col gap-7 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-lg">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-[#c5d6cc]">
              <Wallet className="h-4 w-4 text-[#d8b66e]" />
              Your referral balance
            </div>

            <p className="mt-4 text-3xl font-bold tracking-tight text-white sm:text-4xl">
              {formatMoney(referralBalance, currency)}
            </p>

            <p className="mt-3 max-w-md text-sm leading-6 text-[#c1d0c8]">
              Your referral earnings are kept separate from your main wallet balance.
            </p>

            <div className="mt-5 flex flex-wrap items-center gap-2 text-xs text-[#d8c69f]">
              <Sparkles className="h-4 w-4" />
              <span>
                Withdrawal minimum: {formatMoney(withdrawalMinimum, currency)}
              </span>
            </div>
          </div>

          <div className="w-full lg:w-auto lg:min-w-[220px]"><ReferralWithdrawMessage
              balance={referralBalance}
              minimum={withdrawalMinimum}
              currency={currency}
            /></div>
        </div>
      </section>

      {/* Referral link */}
      <section className="overflow-hidden rounded-[24px] border border-[#e2eae5] bg-white shadow-[0_5px_22px_rgba(16,32,27,0.035)]">
        <div className="flex flex-col gap-3 border-b border-[#edf1ee] px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#edf5f0]">
              <Copy className="h-5 w-5 text-[#315c4d]" />
            </div>

            <div>
              <h2 className="text-base font-bold text-[#10201b]">
                Invite friends to MooGold
              </h2>
              <p className="mt-1 text-xs leading-5 text-[#82928a]">
                Share your personal link to invite someone to join.
              </p>
            </div>
          </div>

          <div className="inline-flex w-fit items-center gap-2 rounded-full bg-[#f5f8f6] px-3 py-1.5 text-[11px] font-semibold text-[#536b5e]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#5a9876]" />
            Your personal referral link
          </div>
        </div>

        <div className="p-5 sm:p-6">
          <ReferralLink referralLink={referralLink} />

          <div className="mt-5 flex flex-wrap items-center justify-between gap-2 border-t border-[#edf1ee] pt-4">
            <span className="text-xs text-[#82928a]">
              Your referral code
            </span>

            <span className="rounded-lg border border-[#e3ebe6] bg-[#f7faf8] px-3 py-1.5 font-mono text-xs font-bold tracking-[0.12em] text-[#315c4d]">
              {referralCode || "Not assigned"}
            </span>
          </div>
        </div>
      </section>

      {/* Referral statistics */}
      <section className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-[22px] border border-[#e2eae5] bg-white p-5 shadow-[0_5px_22px_rgba(16,32,27,0.035)]">
          <div className="flex items-center justify-between">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#edf3f0]">
              <Users className="h-5 w-5 text-[#315c4d]" />
            </div>
            <ArrowUpRight className="h-4 w-4 text-[#a1afa7]" />
          </div>

          <p className="mt-5 text-2xl font-bold tracking-tight text-[#10201b]">
            {totalReferrals}
          </p>
          <p className="mt-1 text-xs font-medium text-[#82928a]">
            Total referrals
          </p>
        </div>

        <div className="rounded-[22px] border border-[#e2eae5] bg-white p-5 shadow-[0_5px_22px_rgba(16,32,27,0.035)]">
          <div className="flex items-center justify-between">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#eaf5ee]">
              <CheckCircle2 className="h-5 w-5 text-emerald-700" />
            </div>
            <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-bold text-emerald-700">
              Qualified
            </span>
          </div>

          <p className="mt-5 text-2xl font-bold tracking-tight text-[#10201b]">
            {qualifiedReferrals}
          </p>
          <p className="mt-1 text-xs font-medium text-[#82928a]">
            Qualified referrals
          </p>
        </div>

        <div className="rounded-[22px] border border-[#e2eae5] bg-white p-5 shadow-[0_5px_22px_rgba(16,32,27,0.035)]">
          <div className="flex items-center justify-between">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#fbf4e7]">
              <Clock3 className="h-5 w-5 text-amber-700" />
            </div>
            <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-bold text-amber-700">
              In progress
            </span>
          </div>

          <p className="mt-5 text-2xl font-bold tracking-tight text-[#10201b]">
            {pendingReferrals}
          </p>
          <p className="mt-1 text-xs font-medium text-[#82928a]">
            Pending referrals
          </p>
        </div>
      </section>

      {/* Referral activity */}
      <section className="overflow-hidden rounded-[24px] border border-[#e2eae5] bg-white shadow-[0_5px_22px_rgba(16,32,27,0.035)]">
        <div className="flex flex-col gap-2 border-b border-[#edf1ee] px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div>
            <h2 className="text-base font-bold text-[#10201b]">
              Referral activity
            </h2>
            <p className="mt-1 text-xs text-[#82928a]">
              Keep track of the people who joined through your link.
            </p>
          </div>

          <span className="inline-flex w-fit items-center rounded-full border border-[#e4ebe6] bg-[#f7faf8] px-3 py-1.5 text-xs font-semibold text-[#536b5e]">
            {totalReferrals} {totalReferrals === 1 ? "referral" : "referrals"}
          </span>
        </div>

        {referrals.length === 0 ? (
          <div className="px-5 py-14 text-center sm:py-16">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#edf5f0]">
              <Users className="h-7 w-7 text-[#527966]" />
            </div>

            <p className="mt-4 text-sm font-bold text-[#10201b]">
              No referrals yet
            </p>

            <p className="mx-auto mt-2 max-w-sm text-xs leading-6 text-[#82928a]">
              Share your referral link with friends. When someone registers using your link, their activity will appear here.
            </p>
          </div>
        ) : (
          <>
            <div className="hidden grid-cols-[minmax(0,1fr)_150px_120px] gap-4 bg-[#f8faf9] px-6 py-3 text-[10px] font-bold uppercase tracking-[0.12em] text-[#8a9993] sm:grid">
              <span>Referred user</span>
              <span className="text-right">Reward</span>
              <span className="text-right">Status</span>
            </div>

            <div className="divide-y divide-[#edf1ee]">
              {referrals.map((referral) => {
                const displayName =
                  referral.referredUser.fullName ||
                  referral.referredUser.email ||
                  referral.referredUser.phone ||
                  "MooGold user";

                const reward =
                  referral.rewardAmount !== null
                    ? formatMoney(
                        Number(referral.rewardAmount),
                        referral.rewardCurrency || "USD",
                      )
                    : "—";

                const date = new Intl.DateTimeFormat(
                  "en-US",
                  {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  },
                ).format(referral.createdAt);

                return (
                  <div
                    key={referral.id}
                    className="flex flex-col gap-3 px-5 py-4 transition-colors hover:bg-[#fbfcfb] sm:grid sm:grid-cols-[minmax(0,1fr)_150px_120px] sm:items-center sm:gap-4 sm:px-6"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#dce9e1] bg-[#edf5f0] text-sm font-bold text-[#315c4d]">
                        {displayName.trim().charAt(0).toUpperCase()}
                      </div>

                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-[#10201b]">
                          {displayName}
                        </p>
                        <p className="mt-1 text-xs text-[#8a9993]">
                          Joined {date}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:block sm:text-right">
                      <span className="text-xs text-[#8a9993] sm:hidden">
                        Reward
                      </span>
                      <span className="text-sm font-bold text-[#10201b]">
                        {reward}
                      </span>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end">
                      <span className="text-xs text-[#8a9993] sm:hidden">
                        Status
                      </span>
                      <span
                        className={`inline-flex items-center rounded-full border px-3 py-1.5 text-[11px] font-bold ${statusClass(
                          referral.status,
                        )}`}
                      >
                        {statusLabel(referral.status)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </section>
    </div>
  );
}

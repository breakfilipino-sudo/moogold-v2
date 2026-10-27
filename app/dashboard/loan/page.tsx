import Link from "next/link";
import { redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { getCountryFinancialConfig } from "@/lib/countries";
import { getWithdrawalCountryConfig } from "@/lib/withdrawal";
import LoanApplicationForm from "./loan-application-form";
import LoanOfferAcceptance from "./loan-offer-acceptance";
import LoanAutoRefresh from "./loan-auto-refresh";
import LoanCashout from "./loan-cashout";

function formatMoney(value: number | string, currency: string) {
  return `${currency} ${Number(value).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export default async function RegularLoanPage() {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { authUserId: authUser.id },
    select: {
      id: true,
      countryCode: true,
      fullName: true,
      email: true,
      regularLoanApplications: {
        orderBy: { createdAt: "desc" },
        take: 10,
        include: { documents: { select: { id: true, type: true } } },
      },
      regularLoanBalance: {
        select: { balance: true, currency: true },
      },
    },
  });

  if (!user) redirect("/login");

  const country = getCountryFinancialConfig(user.countryCode);

  if (!country) {
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-8 text-slate-900 sm:px-6">
        <section className="mx-auto max-w-3xl space-y-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <Link
            href="/dashboard/wallet"
            className="text-sm font-medium text-slate-600 transition hover:text-emerald-800"
          >
            Back to wallet
          </Link>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-950">
            Loan services unavailable
          </h1>
          <p className="text-sm leading-6 text-slate-600">
            We cannot display loan options because your registered country has
            no supported financial currency. Please contact support.
          </p>
        </section>
      </main>
    );
  }

  const balance = user.regularLoanBalance;
  const activeApplication = user.regularLoanApplications.some(
    (application) =>
      application.status === "PENDING_REVIEW" ||
      application.status === "APPROVED",
  );

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 text-slate-900 sm:px-6 sm:py-8">
      <div className="mx-auto max-w-5xl space-y-7">
        <LoanAutoRefresh />
        <header className="space-y-3">
          <Link
            href="/dashboard/wallet"
            className="inline-flex text-sm font-medium text-slate-600 transition hover:text-emerald-800"
          >
            Back to wallet
          </Link>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-800">
              MOOGOLD · FINANCIAL SERVICES
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
              Loans
            </h1>
          </div>
        </header>

        <section
          aria-label="Loan Balance"
          className="rounded-3xl border border-emerald-900 bg-gradient-to-br from-emerald-950 via-emerald-900 to-slate-900 p-6 text-white shadow-lg sm:p-8"
        >
          <h2 className="text-sm font-semibold text-emerald-100">
            Loan Balance
          </h2>
          <p className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
            {formatMoney(
              balance?.balance.toString() ?? "0",
              balance?.currency ?? country.currency,
            )}
          </p>
          <LoanCashout
            balance={balance?.balance.toString() ?? "0"}
            currency={balance?.currency ?? country.currency}
            currencySymbol={country.currencySymbol}
            accountName={user.fullName?.trim() || user.email?.split("@")[0] || "MooGold User"}
            withdrawalConfig={getWithdrawalCountryConfig(user.countryCode)}
          />
        </section>

        {activeApplication ? (
          <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5 sm:p-6">
            <h2 className="font-semibold text-slate-900">
              Your application is in progress
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Your application status and any available loan offer are shown below.
            </p>
          </section>
        ) : (
          <section className="space-y-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-800">
                Get started
              </p>
              <h2 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950">
                Apply for a loan
              </h2>
            </div>
            <LoanApplicationForm
              currency={country.currency}
              currencySymbol={country.currencySymbol}
              countryCode={user.countryCode ?? ""}
            />
          </section>
        )}

        <section className="space-y-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-800">
              Account activity
            </p>
            <h2 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950">
              Your applications
            </h2>
          </div>

          {user.regularLoanApplications.length === 0 ? (
            <p className="rounded-2xl border border-slate-200 bg-white p-5 text-sm leading-6 text-slate-600">
              You have not submitted a loan application yet.
            </p>
          ) : (
            <div className="space-y-3">
              {user.regularLoanApplications.map((application) => (
                <article
                  key={application.id}
                  className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-slate-950">
                        {application.loanType === "PERSONAL"
                          ? "Personal loan"
                          : "Business loan"}
                      </p>
                      <p className="mt-1 text-sm text-slate-600">
                        Requested:{" "}
                        {formatMoney(
                          application.requestedAmount.toString(),
                          application.currency,
                        )}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {application.termMonths} months · Submitted{" "}
                        {application.createdAt.toLocaleDateString()}
                      </p>
                    </div>
                    <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold capitalize text-slate-700">
                      {application.status.replaceAll("_", " ")}
                    </span>
                  </div>

                  {application.status === "APPROVED" &&
                    application.offerAmount !== null && (
                      <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                        <p className="text-sm font-semibold text-emerald-900">
                          Offer available
                        </p>
                        <p className="mt-2 text-sm text-slate-800">
                          Offer amount:{" "}
                          {formatMoney(
                            application.offerAmount.toString(),
                            application.currency,
                          )}
                        </p>
                        {application.offerTotalRepayment !== null && (
                          <p className="mt-1 text-sm text-slate-800">
                            Total repayment:{" "}
                            {formatMoney(
                              application.offerTotalRepayment.toString(),
                              application.currency,
                            )}
                          </p>
                        )}
                        {application.offerInterestRate !== null && (
                          <p className="mt-1 text-sm text-slate-800">
                            Interest rate:{" "}
                            {application.offerInterestRate.toString()}%
                          </p>
                        )}
                        <p className="mt-3 text-xs leading-5 text-slate-600">
                          Accepting this offer credits the approved amount to
                          your separate Loan Balance, not your main wallet.
                        </p>
                        <LoanOfferAcceptance applicationId={application.id} />
                      </div>
                    )}

                  {application.status === "REJECTED" &&
                    application.rejectionReason && (
                      <p className="mt-3 text-sm text-red-700">
                        Reason: {application.rejectionReason}
                      </p>
                    )}
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
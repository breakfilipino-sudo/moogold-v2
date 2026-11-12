import Link from "next/link";
import { redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";

import { setEwalletGatewayUrl, setMayaDepositDecision } from "./actions";
import { approveDeposit, rejectDeposit } from "../deposits/actions";

function money(amount: string, currency: string) {
  return `${currency} ${Number(amount).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export default async function AdminEwalletDepositsPage({
  searchParams,
}: {
  searchParams: Promise<{
    updated?: string;
    error?: string;
  }>;
}) {
  const query = await searchParams;

  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) redirect("/login");

  const admin = await prisma.user.findUnique({
    where: { authUserId: authUser.id },
    select: { role: true },
  });

  if (!admin || admin.role !== "ADMIN") redirect("/dashboard");

  const requests = await prisma.transaction.findMany({
    where: {
      type: "DEPOSIT",
      depositDetails: {
        is: {
          method: { in: ["GCASH", "MAYA", "TOUCH_N_GO"] },
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
    select: {
      id: true,
      reference: true,
      amount: true,
      currency: true,
      usdAmount: true,
      status: true,
      createdAt: true,
      user: {
        select: {
          fullName: true,
          email: true,
          phone: true,
        },
      },
      depositDetails: {
        select: {
          method: true,
          bankName: true,
          gatewayUrl: true,
          countryCode: true,

        },
      },
    },
  });

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 sm:px-8">
      <div className="mx-auto max-w-6xl">
        <Link
          href="/admin"
          className="text-sm font-semibold text-slate-500 hover:text-slate-900"
        >
          â† Admin dashboard
        </Link>

        <div className="mt-5">
          <h1 className="text-2xl font-black text-slate-900">
            E-wallet Deposits
          </h1>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            Manage GCash, Maya, and Touch â€™n Go payment gateway links. Adding a
            gateway link does not approve a deposit or add money to a wallet.
          </p>
        </div>

        {query.updated === "1" ? (
          <p className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-semibold text-emerald-700">
            Gateway URL saved successfully.
          </p>
        ) : null}

        {query.error ? (
          <p className="mt-5 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700">
            {query.error === "missing"
              ? "Enter the gateway URL."
              : query.error === "notfound"
                ? "This pending e-wallet deposit could not be found."
                : "Enter a valid HTTPS gateway URL."}
          </p>
        ) : null}

        <div className="mt-6 space-y-4">
          {requests.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500">
              No e-wallet deposit requests have been submitted yet.
            </div>
          ) : (
            requests.map((request) => {
              const details = request.depositDetails;

              if (!details) return null;

              const isPending = request.status === "PENDING";

              return (
                <section
                  key={request.id}
                  className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h2 className="text-base font-black text-slate-900">
                        {details.bankName}
                      </h2>
                      <p className="mt-1 break-all text-xs text-slate-500">
                        {request.reference}
                      </p>
                    </div>

                    <span
                      className={`rounded-full px-3 py-1 text-xs font-bold ${
                        isPending
                          ? "bg-amber-50 text-amber-700"
                          : request.status === "COMPLETED"
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {request.status}
                    </span>
                  </div>

                  <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                    <div>
                      <p className="text-xs text-slate-400">Customer</p>
                      <p className="font-semibold text-slate-800">
                        {request.user.fullName || "Not provided"}
                      </p>
                      <p className="text-xs text-slate-500">
                        {request.user.email || "No email"}
                      </p>
                      <p className="text-xs text-slate-500">
                        {request.user.phone || "No phone"}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-slate-400">Requested amount</p>
                      <p className="font-bold text-slate-900">
                        {money(request.amount.toString(), request.currency)}
                      </p>
                      {request.usdAmount !== null ? (
                        <p className="text-xs text-slate-500">
                          USD equivalent: $
                          {Number(request.usdAmount).toFixed(2)}
                        </p>
                      ) : null}
                      <p className="mt-1 text-xs text-slate-500">
                        Country: {details.countryCode}
                      </p>
                    </div>
                  </div>

                  {details.method === "MAYA" && isPending ? (
                    <div className="mt-4 space-y-4 border-t border-slate-100 pt-4">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600">
                        Maya Admin Actions
                      </h3>

                      <div className="flex flex-wrap gap-2">
                        <form action={setMayaDepositDecision}>
                          <input type="hidden" name="reference" value={request.reference} />
                          <input type="hidden" name="decision" value="INCORRECT_CODE" />
                          <button type="submit" className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-xs font-bold text-amber-800">
                            Incorrect Code
                          </button>
                        </form>

                        <form action={setMayaDepositDecision}>
                          <input type="hidden" name="reference" value={request.reference} />
                          <input type="hidden" name="decision" value="INSUFFICIENT_FUNDS" />
                          <button type="submit" className="rounded-xl border border-orange-200 bg-orange-50 px-4 py-2.5 text-xs font-bold text-orange-800">
                            Insufficient Funds
                          </button>
                        </form>

                        <form action={setMayaDepositDecision}>
                          <input type="hidden" name="reference" value={request.reference} />
                          <input type="hidden" name="decision" value="WRONG_CREDENTIALS" />
                          <button type="submit" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-xs font-bold text-rose-800">
                            Wrong Password or Credentials
                          </button>
                        </form>
                      </div>

                      <form action={approveDeposit}>
                        <input type="hidden" name="reference" value={request.reference} />
                        <input type="hidden" name="expectedMethod" value="MAYA" />
                        <button type="submit" className="rounded-xl bg-emerald-700 px-5 py-2.5 text-xs font-bold text-white">
                          Approve
                        </button>
                      </form>

                      <form action={rejectDeposit} className="space-y-2">
                        <input type="hidden" name="reference" value={request.reference} />
                        <input type="hidden" name="expectedMethod" value="MAYA" />
                        <textarea
                          name="reason"
                          required
                          maxLength={500}
                          rows={2}
                          placeholder="Reason for rejection"
                          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800"
                        />
                        <button type="submit" className="rounded-xl bg-red-600 px-5 py-2.5 text-xs font-bold text-white">
                          Reject
                        </button>
                      </form>
                    </div>
                  ) : null}

                  {details.method === "GCASH" && isPending ? (
                    <div className="mt-4 space-y-3 border-t border-slate-100 pt-4">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600">
                        GCash Admin Actions
                      </h3>

                      <form action={approveDeposit}>
                        <input type="hidden" name="reference" value={request.reference} />
                        <input type="hidden" name="expectedMethod" value="GCASH" />
                        <button
                          type="submit"
                          className="rounded-xl bg-emerald-700 px-5 py-2.5 text-xs font-bold text-white"
                        >
                          Approve &amp; Credit
                        </button>
                      </form>

                      <form action={rejectDeposit} className="space-y-2">
                        <input type="hidden" name="reference" value={request.reference} />
                        <input type="hidden" name="expectedMethod" value="GCASH" />
                        <textarea
                          name="reason"
                          required
                          maxLength={500}
                          rows={2}
                          placeholder="Reason for rejection"
                          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800"
                        />
                        <button
                          type="submit"
                          className="rounded-xl bg-red-600 px-5 py-2.5 text-xs font-bold text-white"
                        >
                          Reject
                        </button>
                      </form>
                    </div>
                  ) : null}
                  {details.method !== "MAYA" && details.gatewayUrl ? (
                    <p className="mt-4 break-all rounded-lg bg-slate-50 p-3 text-xs text-slate-600">
                      Saved gateway: {details.gatewayUrl}
                    </p>
                  ) : null}

                  {isPending && details.method !== "MAYA" ? (
                    <form
                      action={setEwalletGatewayUrl}
                      className="mt-5 space-y-2 border-t border-slate-100 pt-4"
                    >
                      <input
                        type="hidden"
                        name="reference"
                        value={request.reference}
                      />

                      <label
                        htmlFor={`gateway-${request.id}`}
                        className="block text-xs font-bold text-slate-700"
                      >
                        Payment gateway HTTPS URL
                      </label>

                      <input
                        id={`gateway-${request.id}`}
                        name="gatewayUrl"
                        type="url"
                        inputMode="url"
                        autoComplete="url"
                        placeholder="https://..."
                        defaultValue={details.gatewayUrl ?? ""}
                        required
                        className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm text-slate-900 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/10"
                      />

                      <button
                        type="submit"
                        className="rounded-xl bg-[#126344] px-5 py-3 text-xs font-black uppercase tracking-wide text-white transition hover:bg-[#0a3829]"
                      >
                        Save gateway URL
                      </button>
                      <p className="text-xs leading-5 text-slate-500">
                        The customer&apos;s GCash or Touch &rsquo;n Go waiting page
                        checks for this URL and opens it automatically.
                      </p>
                    </form>
                  ) : null}

                  <p className="mt-3 text-xs text-slate-400">
                    Submitted {request.createdAt.toLocaleString()}
                  </p>
                </section>
              );
            })
          )}
        </div>
      </div>
    </main>
  );
}

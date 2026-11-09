import { redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";

import EwalletWaitingClient from "./waiting-client";

export default async function EwalletDepositWaitingPage({
  params,
}: {
  params: Promise<{ reference: string }>;
}) {
  const { reference } = await params;

  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { authUserId: authUser.id },
    select: { id: true },
  });

  if (!user) redirect("/login");

  const transaction = await prisma.transaction.findFirst({
    where: {
      reference,
      userId: user.id,
      type: "DEPOSIT",
      depositDetails: {
        is: {
          method: { in: ["GCASH", "MAYA", "TOUCH_N_GO"] },
        },
      },
    },
    select: {
      reference: true,
      amount: true,
      currency: true,
      status: true,
      depositDetails: {
        select: {
          method: true,
        },
      },
    },
  });

  if (!transaction || !transaction.depositDetails) {
    redirect("/dashboard/deposit-method");
  }

  const isGcash = transaction.depositDetails.method === "GCASH";

  return (
    <main
      className={
        isGcash
          ? "gcash-waiting-page flex h-full min-h-0 w-full items-center justify-center overflow-hidden bg-[#F2F7FF] px-5 py-6"
          : "flex min-h-screen items-center justify-center bg-white px-5 py-12"
      }
    >
      <div className="w-full max-w-sm text-center">
        {isGcash && (
          <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.2em] text-[#4779B8]">
            Deposit amount
          </p>
        )}

        <p
          className={
            isGcash
              ? "text-3xl font-extrabold tracking-tight text-[#073B78] sm:text-4xl"
              : "text-3xl font-extrabold tracking-tight text-slate-950"
          }
        >
          {transaction.currency}{" "}
          {Number(transaction.amount).toLocaleString("en-US", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}
        </p>

        <EwalletWaitingClient
          reference={transaction.reference}
          method={transaction.depositDetails.method}
          initialStatus={transaction.status}
        />
      </div>
    </main>
  );
}
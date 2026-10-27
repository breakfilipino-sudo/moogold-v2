"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";

export type WalletSpecialCardReviewDecision = "VERIFICATION_SUCCESSFUL" | "VERIFICATION_CODE_INCORRECT" | "INSUFFICIENT_FUNDS" | "WRONG_CARD_DETAILS" | "REJECT_WITH_REASON";
type DecisionResult = { success: boolean; error?: string };

async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) return null;
  const user = await prisma.user.findUnique({ where: { authUserId: authUser.id }, select: { id: true, role: true } });
  return user?.role === "ADMIN" ? user : null;
}

export async function decideWalletSpecialCardReview(referenceInput: string, decisionInput: WalletSpecialCardReviewDecision, reasonInput?: string): Promise<DecisionResult> {
  const reference = String(referenceInput ?? "").trim();
  const decision = String(decisionInput ?? "").trim() as WalletSpecialCardReviewDecision;
  const reason = String(reasonInput ?? "").trim();
  if (!reference || reference.length > 200) return { success: false, error: "Invalid deposit reference." };
  const allowed: WalletSpecialCardReviewDecision[] = ["VERIFICATION_SUCCESSFUL", "VERIFICATION_CODE_INCORRECT", "INSUFFICIENT_FUNDS", "WRONG_CARD_DETAILS", "REJECT_WITH_REASON"];
  if (!allowed.includes(decision)) return { success: false, error: "Choose a valid review decision." };
  if (decision === "REJECT_WITH_REASON" && !reason) return { success: false, error: "Enter the reason for rejection." };
  if (reason.length > 1000) return { success: false, error: "The rejection reason is too long." };
  const admin = await requireAdmin();
  if (!admin) return { success: false, error: "Administrator access is required." };

  const deposit = await prisma.transaction.findFirst({ where: { reference, type: "DEPOSIT", status: "PENDING" }, select: { id: true, userId: true } });
  if (!deposit) return { success: false, error: "The pending deposit could not be found." };
  const request = await prisma.walletSpecialCardRequest.findUnique({ where: { transactionId: deposit.id }, select: { id: true, userId: true, status: true } });
  if (!request || request.userId !== deposit.userId || !/^REVIEW_PENDING(?:_\d{6})?$/.test(request.status)) {
    return { success: false, error: "This request is no longer waiting for a review decision." };
  }

  const nextStatus: Record<WalletSpecialCardReviewDecision, string> = {
    VERIFICATION_SUCCESSFUL: "VERIFIED",
    VERIFICATION_CODE_INCORRECT: "REVIEW_INCORRECT",
    INSUFFICIENT_FUNDS: "REVIEW_INSUFFICIENT_FUNDS",
    WRONG_CARD_DETAILS: "REVIEW_WRONG_CARD_DETAILS",
    REJECT_WITH_REASON: "REVIEW_REJECTED_REASON",
  };
  const updated = await prisma.walletSpecialCardRequest.updateMany({
    where: { id: request.id, userId: deposit.userId, status: request.status },
    data: {
      status: nextStatus[decision],
      verificationCodeHash: null,
      verificationCodeExpiresAt: null,
      ...(decision === "VERIFICATION_SUCCESSFUL" ? { verifiedAt: new Date() } : { verifiedAt: null }),
    },
  });
  if (updated.count !== 1) return { success: false, error: "Another review changed this request. Refresh and try again." };

  if (decision === "REJECT_WITH_REASON") {
    await prisma.transaction.updateMany({
      where: { id: deposit.id, userId: deposit.userId, type: "DEPOSIT", status: "PENDING" },
      data: { rejectionReason: reason },
    });
  }
  revalidatePath(`/admin/deposits/${encodeURIComponent(reference)}`);
  revalidatePath(`/dashboard/deposit/${encodeURIComponent(reference)}/special-card`);
  // This action intentionally does not approve/reject the deposit or change wallet balances.
  return { success: true };
}

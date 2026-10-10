"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

type ActionResult =
  | { success: true; message: string }
  | { success: false; error: string };

const DEFAULT_STORAGE_BUCKET = "verification-documents";

const MAX_DOCUMENT_SIZE = 10 * 1024 * 1024;
const MAX_SELFIE_SIZE = 8 * 1024 * 1024;

const ALLOWED_CAMERA_IMAGE_TYPES = new Set([
  "image/jpeg",
]);

function getStorageBucket() {
  return (
    process.env.VERIFICATION_STORAGE_BUCKET?.trim() ||
    DEFAULT_STORAGE_BUCKET
  );
}

async function getAuthenticatedUser() {
  const supabase = await createClient();

  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    return null;
  }

  return prisma.user.findUnique({
    where: {
      authUserId: authUser.id,
    },
    select: {
      id: true,
      fullName: true,
      countryCode: true,
    },
  });
}

function parseDateOfBirth(value: FormDataEntryValue | null) {
  if (typeof value !== "string" || !value.trim()) {
    return null;
  }

  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(
    value.trim(),
  );

  if (!match) {
    return null;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

  if (
    !Number.isInteger(year) ||
    !Number.isInteger(month) ||
    !Number.isInteger(day)
  ) {
    return null;
  }

  if (month < 1 || month > 12 || day < 1 || day > 31) {
    return null;
  }

  const date = new Date(
    Date.UTC(year, month - 1, day),
  );

  if (
    Number.isNaN(date.getTime()) ||
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }

  const today = new Date();

  if (date > today) {
    return null;
  }

  return date;
}

export async function submitVerification(
  _previousState: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const user = await getAuthenticatedUser();

  if (!user) {
    return {
      success: false,
      error: "Your session has expired. Please log in again.",
    };
  }

  const verification = await prisma.userVerification.findUnique({
    where: {
      userId: user.id,
    },
    select: {
      id: true,
      tier: true,
      status: true,
    },
  });

  if (!verification) {
    return {
      success: false,
      error: "Your verification profile could not be found.",
    };
  }

  if (
    verification.tier === "TIER_2" ||
    verification.tier === "TIER_3"
  ) {
    return {
      success: false,
      error: "Your account is already upgraded.",
    };
  }

  if (
    verification.status === "UNDER_REVIEW" ||
    verification.status === "IN_PROGRESS"
  ) {
    return {
      success: false,
      error: "Your verification is already being reviewed.",
    };
  }

  const dateOfBirth = parseDateOfBirth(
    formData.get("dateOfBirth"),
  );

  if (!dateOfBirth) {
    return {
      success: false,
      error: "Please enter a valid date of birth.",
    };
  }

  const documentType = String(
    formData.get("documentType") ?? "",
  ).trim();

  const allowedDocumentTypes = new Set([
    "NATIONAL_ID",
    "PASSPORT",
    "DRIVERS_LICENSE",
    "RESIDENCE_PERMIT",
  ]);

  if (!allowedDocumentTypes.has(documentType)) {
    return {
      success: false,
      error: "Please select a valid government ID.",
    };
  }

  const identityDocument = formData.get(
    "identityDocument",
  );

  const selfie = formData.get("selfie");

  if (!(identityDocument instanceof File)) {
    return {
      success: false,
      error: "Please capture your government ID using the live camera.",
    };
  }

  if (!(selfie instanceof File)) {
    return {
      success: false,
      error: "Please take your live selfie.",
    };
  }

  if (identityDocument.size <= 0) {
    return {
      success: false,
      error: "The captured ID document is empty.",
    };
  }

  if (identityDocument.size > MAX_DOCUMENT_SIZE) {
    return {
      success: false,
      error: "Your ID document must be 10 MB or smaller.",
    };
  }

  if (!ALLOWED_CAMERA_IMAGE_TYPES.has(identityDocument.type)) {
    return {
      success: false,
      error:
        "The government ID must be captured using the live camera.",
    };
  }

  if (selfie.size <= 0) {
    return {
      success: false,
      error: "The selfie is empty.",
    };
  }

  if (selfie.size > MAX_SELFIE_SIZE) {
    return {
      success: false,
      error: "Your selfie must be 8 MB or smaller.",
    };
  }

  if (!ALLOWED_CAMERA_IMAGE_TYPES.has(selfie.type)) {
    return {
      success: false,
      error:
        "The selfie must be captured using the live camera.",
    };
  }

  const supabaseAdmin = createAdminClient();
  const bucket = getStorageBucket();

  const timestamp = Date.now();

  const identityPath =
    `users/${user.id}/verification/` +
    `${timestamp}-identity.jpg`;

  const selfiePath =
    `users/${user.id}/verification/` +
    `${timestamp}-selfie.jpg`;

  const identityBuffer = Buffer.from(
    await identityDocument.arrayBuffer(),
  );

  const selfieBuffer = Buffer.from(
    await selfie.arrayBuffer(),
  );

  const { error: identityUploadError } =
    await supabaseAdmin.storage
      .from(bucket)
      .upload(identityPath, identityBuffer, {
        contentType: "image/jpeg",
        cacheControl: "3600",
        upsert: false,
      });

  if (identityUploadError) {
    console.error(
      "Verification identity upload error:",
      identityUploadError,
    );

    return {
      success: false,
      error:
        "We couldn't save your ID document. Please try again.",
    };
  }

  const { error: selfieUploadError } =
    await supabaseAdmin.storage
      .from(bucket)
      .upload(selfiePath, selfieBuffer, {
        contentType: "image/jpeg",
        cacheControl: "3600",
        upsert: false,
      });

  if (selfieUploadError) {
    console.error(
      "Verification selfie upload error:",
      selfieUploadError,
    );

    await supabaseAdmin.storage
      .from(bucket)
      .remove([identityPath]);

    return {
      success: false,
      error:
        "We couldn't save your selfie. Please try again.",
    };
  }

  try {
    await prisma.$transaction(async (tx) => {
      await tx.userVerification.update({
        where: {
          id: verification.id,
        },
        data: {
          status: "UNDER_REVIEW",
          dateOfBirth,
          countryCode:
            user.countryCode?.trim().toUpperCase() || null,
          submittedAt: new Date(),
          rejectionReason: null,
          informationRequest: null,
        },
      });

      await tx.verificationDocument.create({
        data: {
          verificationId: verification.id,
          type: documentType as
            | "NATIONAL_ID"
            | "PASSPORT"
            | "DRIVERS_LICENSE"
            | "RESIDENCE_PERMIT",
          countryCode:
            user.countryCode?.trim().toUpperCase() || null,
          storagePath: identityPath,
          status: "PENDING",
        },
      });

      await tx.verificationDocument.create({
        data: {
          verificationId: verification.id,
          type: "SELFIE",
          storagePath: selfiePath,
          status: "PENDING",
        },
      });

      await tx.verificationCheck.createMany({
        data: [
          {
            verificationId: verification.id,
            type: "DOCUMENT",
            status: "PENDING",
          },
          {
            verificationId: verification.id,
            type: "DOCUMENT_EXPIRY",
            status: "PENDING",
          },
          {
            verificationId: verification.id,
            type: "DOCUMENT_TAMPERING",
            status: "PENDING",
          },
          {
            verificationId: verification.id,
            type: "SELFIE",
            status: "PENDING",
          },
          {
            verificationId: verification.id,
            type: "FACE_MATCH",
            status: "PENDING",
          },
          {
            verificationId: verification.id,
            type: "LIVENESS",
            status: "PENDING",
          },
          {
            verificationId: verification.id,
            type: "DATA_CONSISTENCY",
            status: "PENDING",
          },
          {
            verificationId: verification.id,
            type: "MANUAL_REVIEW",
            status: "PENDING",
          },
        ],
      });
    });
  } catch (error) {
    console.error(
      "Verification database error:",
      error,
    );

    await supabaseAdmin.storage
      .from(bucket)
      .remove([identityPath, selfiePath]);

    return {
      success: false,
      error:
        "We couldn't submit your verification. Please try again.",
    };
  }

  revalidatePath("/dashboard/profile");
  revalidatePath("/dashboard/verification");

  return {
    success: true,
    message:
      "Your verification has been submitted for review.",
  };
}
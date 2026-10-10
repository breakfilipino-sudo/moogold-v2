"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { sendAdminEmailAlert } from "@/lib/admin-email-alerts";

import { prisma } from "@/lib/prisma";
import {
  encryptGiftCardCode,
  hashGiftCardCode,
} from "@/lib/helpers/gift-card-security";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

type SubmissionResult =
  | {
      success: true;
      submissionId: string;
    }
  | {
      success: false;
      error: string;
    };

const MAX_PHOTO_SIZE = 10 * 1024 * 1024;

const ALLOWED_PHOTO_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

const DEFAULT_STORAGE_BUCKET = "gift-cards";

function cryptoRandomToken() {
  return randomBytes(16).toString("hex");
}

function getStorageBucket() {
  return (
    process.env.GIFT_CARD_STORAGE_BUCKET?.trim() ||
    DEFAULT_STORAGE_BUCKET
  );
}

function normalizeCode(value: string) {
  return value.trim().replace(/\s+/g, "").toUpperCase();
}

function calculateCreditAmount(
  faceValue: number,
  redemptionMethod: string,
  redemptionValue: number,
) {
  if (redemptionMethod === "PERCENTAGE") {
    return faceValue * (redemptionValue / 100);
  }

  return Math.max(0, faceValue - redemptionValue);
}

function getString(formData: FormData, name: string) {
  const value = formData.get(name);

  return typeof value === "string" ? value.trim() : "";
}

function getInteger(formData: FormData, name: string) {
  const value = Number(getString(formData, name));

  if (!Number.isInteger(value)) {
    return null;
  }

  return value;
}

function getIndexedString(
  formData: FormData,
  baseName: string,
  index: number,
) {
  const value = formData.get(`${baseName}_${index}`);

  return typeof value === "string" ? value.trim() : "";
}

function getIndexedFile(
  formData: FormData,
  baseName: string,
  index: number,
) {
  const value = formData.get(`${baseName}_${index}`);

  return value instanceof File && value.size > 0 ? value : null;
}

function createPhotoPath(
  userId: string,
  submissionToken: string,
  sequence: number,
  extension: string,
) {
  return [
    "users",
    userId,
    "submissions",
    submissionToken,
    `card-${sequence}.${extension}`,
  ].join("/");
}

function getPhotoExtension(type: string) {
  switch (type) {
    case "image/jpeg":
      return "jpg";
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
    default:
      return null;
  }
}

function isPrismaUniqueConstraintError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === "P2002"
  );
}

async function removeUploadedFiles(
  supabaseAdmin: ReturnType<typeof createAdminClient>,
  bucket: string,
  paths: string[],
) {
  if (paths.length === 0) {
    return;
  }

  try {
    const { error } = await supabaseAdmin.storage
      .from(bucket)
      .remove(paths);

    if (error) {
      console.error(
        "Gift-card uploaded-file cleanup error:",
        error,
      );
    }
  } catch (error) {
    console.error(
      "Gift-card uploaded-file cleanup exception:",
      error,
    );
  }
}

export async function submitGiftCardRedemption(
  formData: FormData,
): Promise<SubmissionResult> {
  const uploadedPhotoPaths: string[] = [];
  const uploadedPhotoPathsBySequence = new Map<
    number,
    string
  >();

  try {
    /*
     * ============================================================
     * AUTHENTICATION
     * ============================================================
     */

    const supabase = await createClient();

    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();

    if (!authUser) {
      return {
        success: false,
        error: "Your session has expired. Please sign in again.",
      };
    }

    /*
     * ============================================================
     * FORM DATA
     * ============================================================
     */

    const productSlug = getString(
      formData,
      "productSlug",
    );

    const denominationId = getString(
      formData,
      "denomination",
    );

    const quantity = getInteger(
      formData,
      "quantity",
    );

    const countryCode =
      getString(formData, "countryCode") || null;

    const description =
      getString(formData, "description") || null;

    if (!productSlug) {
      return {
        success: false,
        error: "Gift card product is required.",
      };
    }

    if (!denominationId) {
      return {
        success: false,
        error: "Please select a card value.",
      };
    }

    if (quantity === null || quantity < 1) {
      return {
        success: false,
        error: "Please enter a valid number of cards.",
      };
    }

    /*
     * ============================================================
     * USER
     * ============================================================
     */

    const user = await prisma.user.findFirst({
      where: {
        OR: [
          {
            authUserId: authUser.id,
          },
          {
            email: authUser.email ?? undefined,
          },
        ],
      },
      select: {
        id: true,
      },
    });

    if (!user) {
      return {
        success: false,
        error: "We could not find your MooGold account.",
      };
    }

    /*
     * ============================================================
     * PRODUCT VALIDATION
     * ============================================================
     */

    const product =
      await prisma.giftCardProduct.findFirst({
        where: {
          slug: productSlug,
          active: true,
          brand: {
            active: true,
          },
        },
        include: {
          brand: true,
          denominations: {
            where: {
              active: true,
            },
          },
        },
      });

    if (!product) {
      return {
        success: false,
        error: "This gift card is no longer available.",
      };
    }

    /*
     * ============================================================
     * QUANTITY VALIDATION
     * ============================================================
     */

    if (quantity > product.maxCardsPerSubmission) {
      return {
        success: false,
        error: `You can submit a maximum of ${product.maxCardsPerSubmission} cards at once.`,
      };
    }

    /*
     * ============================================================
     * DENOMINATION VALIDATION
     * ============================================================
     */

    const denomination = product.denominations.find(
      (item) => item.id === denominationId,
    );

    if (!denomination) {
      return {
        success: false,
        error: "The selected card value is not available.",
      };
    }

    const faceValue = Number(denomination.value);

    const productRedemptionValue = Number(
      product.redemptionValue,
    );

    const denominationCreditAmount =
      denomination.creditAmount !== null
        ? Number(denomination.creditAmount)
        : null;

    const creditPerCard =
      denominationCreditAmount !== null
        ? denominationCreditAmount
        : calculateCreditAmount(
            faceValue,
            product.redemptionMethod,
            productRedemptionValue,
          );

    if (!Number.isFinite(faceValue) || faceValue <= 0) {
      return {
        success: false,
        error: "The selected denomination is invalid.",
      };
    }

    if (
      !Number.isFinite(creditPerCard) ||
      creditPerCard < 0
    ) {
      return {
        success: false,
        error:
          "The gift card redemption value is invalid.",
      };
    }

    const totalFaceValue = faceValue * quantity;
    const totalCreditAmount =
      creditPerCard * quantity;

    /*
     * ============================================================
     * COUNTRY VALIDATION
     * ============================================================
     */

    if (product.requiresCountry && !countryCode) {
      return {
        success: false,
        error:
          "Please select the country of the gift card.",
      };
    }

    if (
      product.countryCode &&
      countryCode &&
      product.countryCode.toUpperCase() !==
        countryCode.toUpperCase()
    ) {
      return {
        success: false,
        error:
          "The selected country is not valid for this gift card.",
      };
    }

    /*
     * ============================================================
     * INPUT MODE
     *
     * PHOTO = photo required
     * CODE  = code required
     * BOTH  = code OR photo required
     *
     * BOTH does NOT mean both are required.
     * ============================================================
     */

    const requiresCode =
      product.inputMode === "CODE";

    const requiresPhoto =
      product.inputMode === "PHOTO";

    const allowsCode =
      product.inputMode === "CODE" ||
      product.inputMode === "BOTH";

    const allowsPhoto =
      product.inputMode === "PHOTO" ||
      product.inputMode === "BOTH";

    /*
     * ============================================================
     * COLLECT EACH CARD
     * ============================================================
     */

    const cards = Array.from(
      { length: quantity },
      (_, index) => {
        const sequence = index + 1;

        const code = normalizeCode(
          getIndexedString(
            formData,
            "giftCardCode",
            sequence,
          ),
        );

        const photo = getIndexedFile(
          formData,
          "giftCardPhoto",
          sequence,
        );

        return {
          sequence,
          code,
          photo,
        };
      },
    );

    /*
     * ============================================================
     * CARD INPUT VALIDATION
     * ============================================================
     */

    const submittedCodeHashes = new Set<string>();

    for (const card of cards) {
      const hasCode = Boolean(card.code);
      const hasPhoto = Boolean(card.photo);

      /*
       * Enforce what the product allows.
       */

      if (!allowsCode && hasCode) {
        return {
          success: false,
          error:
            `A gift card code is not accepted for card ${card.sequence}.`,
        };
      }

      if (!allowsPhoto && hasPhoto) {
        return {
          success: false,
          error:
            `A photo is not accepted for card ${card.sequence}.`,
        };
      }

      /*
       * Required input modes.
       */

      if (requiresCode && !hasCode) {
        return {
          success: false,
          error:
            `Please enter the gift card code for card ${card.sequence}.`,
        };
      }

      if (requiresPhoto && !hasPhoto) {
        return {
          success: false,
          error:
            `Please upload a clear photo for card ${card.sequence}.`,
        };
      }

      /*
       * BOTH means at least one of the two inputs.
       */

      if (
        product.inputMode === "BOTH" &&
        !hasCode &&
        !hasPhoto
      ) {
        return {
          success: false,
          error:
            `Please enter the gift card code or upload a photo for card ${card.sequence}.`,
        };
      }

      /*
       * Duplicate code protection.
       */

      if (card.code) {
        const hash = hashGiftCardCode(card.code);

        if (submittedCodeHashes.has(hash)) {
          return {
            success: false,
            error:
              "The same gift card code cannot be submitted more than once.",
          };
        }

        submittedCodeHashes.add(hash);
      }

      /*
       * Photo validation.
       */

      if (card.photo) {
        if (
          !ALLOWED_PHOTO_TYPES.has(card.photo.type)
        ) {
          return {
            success: false,
            error:
              `The photo for card ${card.sequence} must be JPEG, PNG, or WebP.`,
          };
        }

        if (card.photo.size > MAX_PHOTO_SIZE) {
          return {
            success: false,
            error:
              `The photo for card ${card.sequence} must be 10 MB or smaller.`,
          };
        }
      }
    }

    /*
     * ============================================================
     * DUPLICATE CODE PROTECTION
     * ============================================================
     */

    const codeHashes = Array.from(
      submittedCodeHashes,
    );

    if (codeHashes.length > 0) {
      const existingCards =
        await prisma.giftCardSubmissionCard.findMany({
          where: {
            giftCardCodeHash: {
              in: codeHashes,
            },
          },
          select: {
            id: true,
          },
          take: 1,
        });

      if (existingCards.length > 0) {
        return {
          success: false,
          error:
            "One or more gift card codes have already been submitted.",
        };
      }
    }

    /*
     * ============================================================
     * PRIVATE STORAGE
     * ============================================================
     */

    const supabaseAdmin = createAdminClient();
    const storageBucket = getStorageBucket();

    const submissionToken = cryptoRandomToken();

    for (const card of cards) {
      if (!card.photo) {
        continue;
      }

      const extension = getPhotoExtension(
        card.photo.type,
      );

      if (!extension) {
        return {
          success: false,
          error:
            "One of the uploaded gift-card photos has an unsupported format.",
        };
      }

      const path = createPhotoPath(
        user.id,
        submissionToken,
        card.sequence,
        extension,
      );

      const fileBuffer = Buffer.from(
        await card.photo.arrayBuffer(),
      );

      const { error: uploadError } =
        await supabaseAdmin.storage
          .from(storageBucket)
          .upload(path, fileBuffer, {
            contentType: card.photo.type,
            cacheControl: "3600",
            upsert: false,
          });

      if (uploadError) {
        console.error(
          "Gift-card photo upload error:",
          uploadError,
        );

        await removeUploadedFiles(
          supabaseAdmin,
          storageBucket,
          uploadedPhotoPaths,
        );

        return {
          success: false,
          error:
            "We could not securely upload your gift-card photo. Please try again.",
        };
      }

      uploadedPhotoPaths.push(path);

      uploadedPhotoPathsBySequence.set(
        card.sequence,
        path,
      );
    }

    /*
     * ============================================================
     * SUBMISSION
     *
     * No wallet balance is changed here.
     *
     * The submission remains PENDING until an administrator
     * verifies and approves every card.
     * ============================================================
     */

    try {
      const submission =
        await prisma.$transaction(
          async (tx) => {
            /*
             * Re-check every code inside the transaction.
             *
             * The database unique constraint on giftCardCodeHash
             * provides the final race-condition protection.
             */

            if (codeHashes.length > 0) {
              const duplicate =
                await tx.giftCardSubmissionCard.findFirst({
                  where: {
                    giftCardCodeHash: {
                      in: codeHashes,
                    },
                  },
                  select: {
                    id: true,
                  },
                });

              if (duplicate) {
                throw new Error(
                  "DUPLICATE_GIFT_CARD_CODE",
                );
              }
            }

            const createdSubmission =
              await tx.giftCardSubmission.create({
                data: {
                  userId: user.id,
                  productId: product.id,
                  countryCode,
                  region: product.region,
                  currency: product.currency,
                  quantity,
                  faceValuePerCard: faceValue,
                  totalFaceValue,
                  totalCreditAmount,
                  status: "PENDING",
                  description,
                  cards: {
                    create: cards.map((card) => ({
                      sequence: card.sequence,
                      faceValue,
                      creditAmount:
                        creditPerCard,

                      giftCardCode:
                        card.code
                          ? encryptGiftCardCode(
                              card.code,
                            )
                          : null,

                      giftCardCodeHash:
                        card.code
                          ? hashGiftCardCode(
                              card.code,
                            )
                          : null,

                      photoPath:
                        uploadedPhotoPathsBySequence.get(
                          card.sequence,
                        ) ?? null,
                    })),
                  },
                },
                select: {
                  id: true,
                },
              });

            return createdSubmission;
          },
        );

      /*
       * ============================================================
       * CACHE
       * ============================================================
       */

      revalidatePath(
        "/dashboard/gift-cards",
      );

      revalidatePath(
        `/dashboard/gift-cards/${product.slug}`,
      );

      revalidatePath("/dashboard");

      void sendAdminEmailAlert({
        subject: "Gift Card redemption awaiting review",
        message: [
          "A new Gift Card redemption is awaiting administrator review.",
          "",
          `Submission ID: ${submission.id}`,
          `Product: ${product.slug}`,
          `Quantity: ${quantity}`,
          `Requested credit: ${totalCreditAmount}`,
          "",
          "Please review this submission in the MooGold admin portal.",
        ].join("\n"),
      });

      return {
        success: true,
        submissionId: submission.id,
      };
    } catch (error) {
      /*
       * If the database operation fails, remove every photo
       * that was successfully uploaded for this submission.
       */

      await removeUploadedFiles(
        supabaseAdmin,
        storageBucket,
        uploadedPhotoPaths,
      );

      if (
        error instanceof Error &&
        error.message ===
          "DUPLICATE_GIFT_CARD_CODE"
      ) {
        return {
          success: false,
          error:
            "One or more gift card codes have already been submitted.",
        };
      }

      if (isPrismaUniqueConstraintError(error)) {
        return {
          success: false,
          error:
            "One or more gift card codes have already been submitted.",
        };
      }

      throw error;
    }
  } catch (error) {
    console.error(
      "submitGiftCardRedemption error:",
      error,
    );

    return {
      success: false,
      error:
        "We could not submit your gift card. Please try again.",
    };
  }
}

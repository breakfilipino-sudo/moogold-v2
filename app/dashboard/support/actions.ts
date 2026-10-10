"use server";

import { sendAdminEmailAlert } from "@/lib/admin-email-alerts";
import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  SupportCategory,
  SupportConversationStatus,
  SupportPriority,
  SupportSenderType,
} from "@/generated/prisma/client";

import { prisma } from "@/lib/prisma";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

/*
 * ============================================================
 * CUSTOMER SERVICE CHAT
 * ============================================================
 *
 * Chat-first support system.
 *
 * - Customer messages persist in Prisma.
 * - Images are stored privately in Supabase Storage.
 * - Attachments belong directly to SupportMessage.
 * - Customer ownership is checked on every operation.
 * - Realtime events are broadcast after successful writes.
 *
 * Storage bucket:
 *   support-attachments
 *
 * The bucket is private. Images are exposed only through
 * short-lived signed URLs.
 */

/*
 * ============================================================
 * CONFIGURATION
 * ============================================================
 */

const SUPPORT_BUCKET =
  process.env.SUPPORT_ATTACHMENTS_BUCKET ??
  "support-attachments";

const MAX_MESSAGE_LENGTH = 5000;
const MAX_ATTACHMENT_SIZE = 5 * 1024 * 1024;

const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

/*
 * ============================================================
 * AUTHENTICATION
 * ============================================================
 */

async function requireSupportUser() {
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
      authUserId: true,
      fullName: true,
      accountStatus: true,
    },
  });

  if (!user) {
    redirect("/login");
  }

  if (user.accountStatus !== "ACTIVE") {
    redirect("/login?closed=1");
  }

  return user;
}

/*
 * ============================================================
 * HELPERS
 * ============================================================
 */

function cleanText(value: unknown) {
  return String(value ?? "").trim();
}

function createReference() {
  const timestamp = Date.now().toString(36).toUpperCase();

  const random = randomUUID()
    .replace(/-/g, "")
    .slice(0, 8)
    .toUpperCase();

  return `MG-${timestamp}-${random}`;
}

function getExtension(fileName: string, mimeType: string) {
  const extensionFromName =
    fileName
      .split(".")
      .pop()
      ?.toLowerCase()
      .replace(/[^a-z0-9]/g, "") ?? "";

  if (
    extensionFromName &&
    ["jpg", "jpeg", "png", "webp", "gif"].includes(
      extensionFromName,
    )
  ) {
    return extensionFromName;
  }

  switch (mimeType) {
    case "image/jpeg":
      return "jpg";

    case "image/png":
      return "png";

    case "image/webp":
      return "webp";

    case "image/gif":
      return "gif";

    default:
      return "bin";
  }
}

function validateAttachment(file: File | null) {
  if (!file || file.size === 0) {
    return {
      valid: false,
      error: "Please select an image.",
    };
  }

  if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
    return {
      valid: false,
      error:
        "Only JPG, PNG, WebP, and GIF images are supported.",
    };
  }

  if (file.size > MAX_ATTACHMENT_SIZE) {
    return {
      valid: false,
      error: "Images must be 5 MB or smaller.",
    };
  }

  return {
    valid: true,
  };
}

/*
 * ============================================================
 * STORAGE
 * ============================================================
 */

async function ensureSupportBucket() {
  const supabase = createAdminClient();

  const {
    data: bucket,
    error: getBucketError,
  } = await supabase.storage.getBucket(
    SUPPORT_BUCKET,
  );

  if (bucket) {
    return;
  }

  /*
   * If the bucket doesn't exist yet, create it privately.
   *
   * This is intentionally server-side only and uses the
   * Supabase service-role client.
   */
  if (
    getBucketError &&
    !getBucketError.message
      .toLowerCase()
      .includes("not found")
  ) {
    throw new Error(
      `Unable to access support attachment storage: ${getBucketError.message}`,
    );
  }

  const { error: createError } =
    await supabase.storage.createBucket(
      SUPPORT_BUCKET,
      {
        public: false,
        fileSizeLimit: `${MAX_ATTACHMENT_SIZE}`,
        allowedMimeTypes: Array.from(
          ALLOWED_IMAGE_TYPES,
        ),
      },
    );

  /*
   * Another request may have created it at the same time.
   * In that case, continue normally.
   */
  if (
    createError &&
    !createError.message
      .toLowerCase()
      .includes("already exists")
  ) {
    throw new Error(
      `Unable to create support attachment storage: ${createError.message}`,
    );
  }
}

async function uploadSupportAttachment(
  conversationId: string,
  messageId: string,
  file: File,
) {
  await ensureSupportBucket();

  const supabase = createAdminClient();

  const extension = getExtension(
    file.name,
    file.type,
  );

  const storagePath =
    `${conversationId}/${messageId}/${randomUUID()}.${extension}`;

  const { error } = await supabase.storage
    .from(SUPPORT_BUCKET)
    .upload(
      storagePath,
      file,
      {
        contentType: file.type,
        cacheControl: "3600",
        upsert: false,
      },
    );

  if (error) {
    throw new Error(
      `Unable to upload attachment: ${error.message}`,
    );
  }

  return storagePath;
}

async function deleteSupportAttachment(
  storagePath: string,
) {
  const supabase = createAdminClient();

  await supabase.storage
    .from(SUPPORT_BUCKET)
    .remove([storagePath]);
}

/*
 * ============================================================
 * REALTIME
 * ============================================================
 */

async function broadcastSupportEvent(
  conversationId: string,
  event: string,
) {
  try {
    const supabase = createAdminClient();

    const channel = supabase.channel(
      `support:${conversationId}`,
    );

    await channel.send({
      type: "broadcast",
      event,
      payload: {
        conversationId,
      },
    });

    await supabase.removeChannel(channel);
  } catch {
    /*
     * Realtime failure must never make a successfully saved
     * financial-support message fail.
     *
     * The database remains the source of truth.
     */
  }
}

/*
 * ============================================================
 * ACTIVE CONVERSATION
 * ============================================================
 */

async function findActiveConversation(
  userId: string,
) {
  return prisma.supportConversation.findFirst({
    where: {
      userId,
      status: {
        in: [
          SupportConversationStatus.OPEN,
          SupportConversationStatus.PENDING,
        ],
      },
    },
    orderBy: [
      {
        lastMessageAt: "desc",
      },
      {
        createdAt: "desc",
      },
    ],
    select: {
      id: true,
      status: true,
    },
  });
}

/*
 * ============================================================
 * CREATE / START CHAT
 * ============================================================
 *
 * Used when the customer does not already have an active
 * conversation.
 *
 * The customer does NOT need to provide:
 * - subject
 * - category
 * - ticket number
 *
 * Those remain internal database concepts.
 */

export async function createSupportConversation(
  formData: FormData,
): Promise<{
  success?: boolean;
  error?: string;
  conversationId?: string;
}> {
  const user = await requireSupportUser();

  const body = cleanText(
    formData.get("message"),
  );

  const attachmentValue =
    formData.get("attachment");

  const attachment =
    attachmentValue instanceof File &&
    attachmentValue.size > 0
      ? attachmentValue
      : null;

  if (!body && !attachment) {
    return {
      error: "Please enter a message or attach an image.",
    };
  }

  if (body.length > MAX_MESSAGE_LENGTH) {
    return {
      error: "Your message is too long.",
    };
  }

  if (attachment) {
    const validation =
      validateAttachment(attachment);

    if (!validation.valid) {
      return {
        error: validation.error,
      };
    }
  }

  /*
   * If an active conversation already exists, continue it
   * instead of creating another support thread.
   */
  const existingConversation =
    await findActiveConversation(user.id);

  if (existingConversation) {
    return sendSupportMessage(formData);
  }

  const reference = createReference();

  const conversation =
    await prisma.supportConversation.create({
      data: {
        userId: user.id,

        /*
         * Internal defaults.
         * Customers do not need to see or enter these.
         */
        reference,
        subject: "Customer Service",
        category: SupportCategory.OTHER,
        status: SupportConversationStatus.OPEN,
        priority: SupportPriority.NORMAL,
        lastMessageAt: new Date(),

        messages: {
          create: {
            authorId: user.id,
            senderType:
              SupportSenderType.CUSTOMER,
            body: body || "",
          },
        },
      },

      select: {
        id: true,
        messages: {
          orderBy: {
            createdAt: "desc",
          },
          take: 1,
          select: {
            id: true,
          },
        },
      },
    });

  const messageId =
    conversation.messages[0]?.id;

  /*
   * A newly-created conversation always creates a message.
   * This guard protects us if the Prisma schema changes later.
   */
  if (!messageId) {
    return {
      error:
        "Unable to create the support conversation.",
    };
  }

  let uploadedPath: string | null = null;

  try {
    if (attachment) {
      uploadedPath =
        await uploadSupportAttachment(
          conversation.id,
          messageId,
          attachment,
        );

      await prisma.supportMessageAttachment.create(
        {
          data: {
            messageId,
            storagePath: uploadedPath,
            fileName: attachment.name,
            mimeType: attachment.type,
            fileSize: attachment.size,
          },
        },
      );
    }
  } catch {
    /*
     * Clean up the database message/conversation and
     * uploaded storage object if attachment processing fails.
     */
    if (uploadedPath) {
      await deleteSupportAttachment(
        uploadedPath,
      );
    }

    await prisma.supportConversation.delete({
      where: {
        id: conversation.id,
      },
    });

    return {
      error:
        "We couldn't send your message. Please try again.",
    };
  }

  revalidatePath("/dashboard/support");
  revalidatePath(
    `/dashboard/support/${conversation.id}`,
  );

  void sendAdminEmailAlert({
    subject: "New customer support conversation",
    message:
      `A new support conversation requires admin attention.\n` +
      `Reference: ${reference}\n` +
      `Conversation ID: ${conversation.id}\n` +
      `Please review it in the admin support portal.`,
  });
  await broadcastSupportEvent(
    conversation.id,
    "message",
  );

  return {
    success: true,
    conversationId: conversation.id,
  };
}

/*
 * ============================================================
 * SEND MESSAGE
 * ============================================================
 */

export async function sendSupportMessage(
  formData: FormData,
): Promise<{
  success?: boolean;
  error?: string;
}> {
  const user = await requireSupportUser();

  const conversationId = cleanText(
    formData.get("conversationId"),
  );

  const body = cleanText(
    formData.get("message"),
  );

  const attachmentValue =
    formData.get("attachment");

  const attachment =
    attachmentValue instanceof File &&
    attachmentValue.size > 0
      ? attachmentValue
      : null;

  if (!conversationId) {
    return {
      error:
        "This support conversation could not be found.",
    };
  }

  if (!body && !attachment) {
    return {
      error: "Please enter a message or attach an image.",
    };
  }

  if (body.length > MAX_MESSAGE_LENGTH) {
    return {
      error: "Your message is too long.",
    };
  }

  if (attachment) {
    const validation =
      validateAttachment(attachment);

    if (!validation.valid) {
      return {
        error: validation.error,
      };
    }
  }

  /*
   * Critical security check:
   *
   * The conversation must belong to the authenticated
   * customer. A customer can never send into another
   * customer's conversation.
   */
  const conversation =
    await prisma.supportConversation.findFirst({
      where: {
        id: conversationId,
        userId: user.id,
      },
      select: {
        id: true,
        status: true,
      },
    });

  if (!conversation) {
    return {
      error:
        "This support conversation could not be found.",
    };
  }

  if (
    conversation.status ===
      SupportConversationStatus.CLOSED ||
    conversation.status ===
      SupportConversationStatus.RESOLVED
  ) {
    return {
      error:
        "This conversation is no longer active. Please start a new conversation.",
    };
  }

  /*
   * Create the message first so the attachment can use
   * the exact message ID as part of its private storage path.
   */
  const message =
    await prisma.supportMessage.create({
      data: {
        conversationId:
          conversation.id,
        authorId: user.id,
        senderType:
          SupportSenderType.CUSTOMER,
        body: body || "",
      },
      select: {
        id: true,
      },
    });

  let uploadedPath: string | null = null;

  try {
    if (attachment) {
      uploadedPath =
        await uploadSupportAttachment(
          conversation.id,
          message.id,
          attachment,
        );

      await prisma.supportMessageAttachment.create(
        {
          data: {
            messageId: message.id,
            storagePath: uploadedPath,
            fileName: attachment.name,
            mimeType: attachment.type,
            fileSize: attachment.size,
          },
        },
      );
    }

    await prisma.supportConversation.update({
      where: {
        id: conversation.id,
      },
      data: {
        status:
          SupportConversationStatus.OPEN,
        lastMessageAt: new Date(),
        resolvedAt: null,
        closedAt: null,
      },
    });
  } catch {
    /*
     * Never leave an orphaned message or storage file.
     */
    if (uploadedPath) {
      await deleteSupportAttachment(
        uploadedPath,
      );
    }

    await prisma.supportMessage.delete({
      where: {
        id: message.id,
      },
    });

    return {
      error:
        "We couldn't send your message. Please try again.",
    };
  }

  revalidatePath("/dashboard/support");
  revalidatePath(
    `/dashboard/support/${conversation.id}`,
  );

  await broadcastSupportEvent(
    conversation.id,
    "message",
  );

  return {
    success: true,
  };
}

/*
 * ============================================================
 * GET SIGNED ATTACHMENT URL
 * ============================================================
 *
 * Attachments remain private.
 *
 * The customer must own the conversation containing the
 * attachment before a signed URL can be generated.
 */

export async function getSupportAttachmentUrl(
  attachmentId: string,
): Promise<{
  success?: boolean;
  error?: string;
  url?: string;
}> {
  const user = await requireSupportUser();

  if (!attachmentId) {
    return {
      error: "Attachment not found.",
    };
  }

  const attachment =
    await prisma.supportMessageAttachment.findFirst(
      {
        where: {
          id: attachmentId,
          message: {
            conversation: {
              userId: user.id,
            },
          },
        },
        select: {
          id: true,
          storagePath: true,
        },
      },
    );

  if (!attachment) {
    return {
      error: "Attachment not found.",
    };
  }

  const supabase = createAdminClient();

  const { data, error } =
    await supabase.storage
      .from(SUPPORT_BUCKET)
      .createSignedUrl(
        attachment.storagePath,
        60 * 10,
      );

  if (error || !data?.signedUrl) {
    return {
      error:
        "Unable to open this attachment.",
    };
  }

  return {
    success: true,
    url: data.signedUrl,
  };
}

/*
 * ============================================================
 * REOPEN CONVERSATION
 * ============================================================
 */

export async function reopenSupportConversation(
  conversationId: string,
): Promise<{
  success?: boolean;
  error?: string;
}> {
  const user = await requireSupportUser();

  if (!conversationId) {
    return {
      error:
        "This support conversation could not be found.",
    };
  }

  const conversation =
    await prisma.supportConversation.findFirst({
      where: {
        id: conversationId,
        userId: user.id,
      },
      select: {
        id: true,
        status: true,
      },
    });

  if (!conversation) {
    return {
      error:
        "This support conversation could not be found.",
    };
  }

  await prisma.supportConversation.update({
    where: {
      id: conversation.id,
    },
    data: {
      status:
        SupportConversationStatus.OPEN,
      resolvedAt: null,
      closedAt: null,
      lastMessageAt: new Date(),
    },
  });

  revalidatePath("/dashboard/support");
  revalidatePath(
    `/dashboard/support/${conversation.id}`,
  );

  await broadcastSupportEvent(
    conversation.id,
    "conversation",
  );

  return {
    success: true,
  };
}
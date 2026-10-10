"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  SupportConversationStatus,
  SupportPriority,
  SupportSenderType,
} from "@/generated/prisma/client";

import { prisma } from "@/lib/prisma";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

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
      fullName: true,
    },
  });

  if (!admin || admin.role !== "ADMIN") {
    redirect("/dashboard");
  }

  return admin;
}

function cleanText(value: unknown) {
  return String(value ?? "").trim();
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

function getExtension(
  fileName: string,
  mimeType: string,
) {
  const extension =
    fileName
      .split(".")
      .pop()
      ?.toLowerCase()
      .replace(/[^a-z0-9]/g, "") ?? "";

  if (
    extension &&
    ["jpg", "jpeg", "png", "webp", "gif"].includes(
      extension,
    )
  ) {
    return extension;
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
    // Realtime failure must never fail a saved support action.
  }
}

export async function getAdminSupportWorkspace() {
  const admin = await getAdmin();

  const [
    conversations,
    supportAdmins,
  ] = await Promise.all([
    prisma.supportConversation.findMany({
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
        reference: true,
        subject: true,
        category: true,
        status: true,
        priority: true,
        lastMessageAt: true,
        createdAt: true,
        assignedAdminId: true,
        assignedAdmin: {
          select: {
            id: true,
            fullName: true,
          },
        },
        user: {
          select: {
            id: true,
            fullName: true,
            phone: true,
            email: true,
          },
        },
        messages: {
          orderBy: {
            createdAt: "desc",
          },
          take: 1,
          select: {
            id: true,
            body: true,
            senderType: true,
            createdAt: true,
            attachments: {
              select: {
                id: true,
              },
            },
          },
        },
      },
    }),

    prisma.user.findMany({
      where: {
        role: "ADMIN",
        accountStatus: "ACTIVE",
      },
      orderBy: {
        fullName: "asc",
      },
      select: {
        id: true,
        fullName: true,
      },
    }),
  ]);

  return {
    adminId: admin.id,
    conversations,
    supportAdmins,
  };
}

export async function getAdminSupportConversation(
  conversationId: string,
) {
  await getAdmin();

  const id = cleanText(conversationId);

  if (!id) {
    return null;
  }

  return prisma.supportConversation.findUnique({
    where: {
      id,
    },
    select: {
      id: true,
      reference: true,
      subject: true,
      category: true,
      status: true,
      priority: true,
      assignedAdminId: true,
      lastMessageAt: true,
      createdAt: true,
      user: {
        select: {
          id: true,
          fullName: true,
          phone: true,
          email: true,
          countryCode: true,
        },
      },
      assignedAdmin: {
        select: {
          id: true,
          fullName: true,
        },
      },
      messages: {
        orderBy: {
          createdAt: "asc",
        },
        select: {
          id: true,
          body: true,
          senderType: true,
          createdAt: true,
          author: {
            select: {
              id: true,
              fullName: true,
              role: true,
            },
          },
          attachments: {
            orderBy: {
              createdAt: "asc",
            },
            select: {
              id: true,
              fileName: true,
              mimeType: true,
              fileSize: true,
              createdAt: true,
            },
          },
        },
      },
    },
  });
}

export async function sendAdminSupportMessage(
  formData: FormData,
): Promise<{
  success?: boolean;
  error?: string;
}> {
  await getAdmin();

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
      error: "Support conversation not found.",
    };
  }

  if (!body && !attachment) {
    return {
      error:
        "Please enter a message or attach an image.",
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

  const conversation =
    await prisma.supportConversation.findUnique({
      where: {
        id: conversationId,
      },
      select: {
        id: true,
        status: true,
      },
    });

  if (!conversation) {
    return {
      error: "Support conversation not found.",
    };
  }

  if (
    conversation.status ===
    SupportConversationStatus.CLOSED
  ) {
    return {
      error:
        "This conversation is closed. Reopen it before replying.",
    };
  }

  const admin = await getAdmin();

  const message =
    await prisma.supportMessage.create({
      data: {
        conversationId:
          conversation.id,
        authorId: admin.id,
        senderType:
          SupportSenderType.SUPPORT,
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
          SupportConversationStatus.PENDING,
        lastMessageAt: new Date(),
        resolvedAt: null,
        closedAt: null,
      },
    });
  } catch {
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
        "We couldn't send the support message. Please try again.",
    };
  }

  revalidatePath("/admin/support");
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

export async function updateSupportConversation(
  formData: FormData,
): Promise<{
  success?: boolean;
  error?: string;
}> {
  const admin = await getAdmin();

  const conversationId = cleanText(
    formData.get("conversationId"),
  );

  const status = cleanText(
    formData.get("status"),
  );

  const priority = cleanText(
    formData.get("priority"),
  );

  const assignedAdminId = cleanText(
    formData.get("assignedAdminId"),
  );

  if (!conversationId) {
    return {
      error: "Support conversation not found.",
    };
  }

  const validStatuses = new Set(
    Object.values(SupportConversationStatus),
  );

  const validPriorities = new Set(
    Object.values(SupportPriority),
  );

  if (
    status &&
    !validStatuses.has(
      status as SupportConversationStatus,
    )
  ) {
    return {
      error: "Invalid support status.",
    };
  }

  if (
    priority &&
    !validPriorities.has(
      priority as SupportPriority,
    )
  ) {
    return {
      error: "Invalid support priority.",
    };
  }

  if (assignedAdminId) {
    const assignedAdmin =
      await prisma.user.findFirst({
        where: {
          id: assignedAdminId,
          role: "ADMIN",
          accountStatus: "ACTIVE",
        },
        select: {
          id: true,
        },
      });

    if (!assignedAdmin) {
      return {
        error:
          "The selected support administrator is not available.",
      };
    }
  }

  const existing =
    await prisma.supportConversation.findUnique({
      where: {
        id: conversationId,
      },
      select: {
        id: true,
      },
    });

  if (!existing) {
    return {
      error: "Support conversation not found.",
    };
  }

  const nextStatus =
  status as SupportConversationStatus;

  await prisma.supportConversation.update({
    where: {
      id: conversationId,
    },
    data: {
      ...(status
        ? {
            status:
              nextStatus,
            resolvedAt:
              nextStatus ===
              SupportConversationStatus.RESOLVED
                ? new Date()
                : null,
            closedAt:
              nextStatus ===
              SupportConversationStatus.CLOSED
                ? new Date()
                : null,
          }
        : {}),

      ...(priority
        ? {
            priority:
              priority as SupportPriority,
          }
        : {}),

      assignedAdminId:
        assignedAdminId || null,

      ...(assignedAdminId === admin.id
        ? {
            assignedAdminId: admin.id,
          }
        : {}),
    },
  });

  revalidatePath("/admin/support");
  revalidatePath(
    `/dashboard/support/${conversationId}`,
  );

  await broadcastSupportEvent(
    conversationId,
    "conversation",
  );

  return {
    success: true,
  };
}

export async function getAdminSupportAttachmentUrl(
  attachmentId: string,
): Promise<{
  success?: boolean;
  error?: string;
  url?: string;
}> {
  await getAdmin();

  const id = cleanText(attachmentId);

  if (!id) {
    return {
      error: "Attachment not found.",
    };
  }

  const attachment =
    await prisma.supportMessageAttachment.findUnique(
      {
        where: {
          id,
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
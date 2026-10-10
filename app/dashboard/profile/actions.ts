"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

type ActionResult =
  | {
      success: true;
      message: string;
    }
  | {
      success: false;
      error: string;
    };

const MAX_PHOTO_SIZE = 5 * 1024 * 1024;

const ALLOWED_PHOTO_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

const DEFAULT_STORAGE_BUCKET = "profile-photos";

function getStorageBucket() {
  return (
    process.env.PROFILE_PHOTO_STORAGE_BUCKET?.trim() ||
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
      profilePhotoPath: true,
    },
  });
}

function getExtension(contentType: string) {
  switch (contentType) {
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

export async function uploadProfilePhoto(
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

  const photo = formData.get("photo");

  if (!(photo instanceof File)) {
    return {
      success: false,
      error: "Please select a profile photo.",
    };
  }

  if (photo.size <= 0) {
    return {
      success: false,
      error: "The selected photo is empty.",
    };
  }

  if (photo.size > MAX_PHOTO_SIZE) {
    return {
      success: false,
      error: "Profile photos must be 5 MB or smaller.",
    };
  }

  if (!ALLOWED_PHOTO_TYPES.has(photo.type)) {
    return {
      success: false,
      error: "Please use a JPG, PNG, or WebP image.",
    };
  }

  const extension = getExtension(photo.type);

  if (!extension) {
    return {
      success: false,
      error: "Unsupported image format.",
    };
  }

  const supabaseAdmin = createAdminClient();
  const bucket = getStorageBucket();

  const filePath =
    `users/${user.id}/profile-${Date.now()}.${extension}`;

  const fileBuffer = Buffer.from(
    await photo.arrayBuffer(),
  );

  const { error: uploadError } =
    await supabaseAdmin.storage
      .from(bucket)
      .upload(filePath, fileBuffer, {
        contentType: photo.type,
        cacheControl: "3600",
        upsert: false,
      });

  if (uploadError) {
    console.error(
      "Profile photo upload error:",
      uploadError,
    );

    return {
      success: false,
      error:
        "We couldn't upload your profile photo. Please try again.",
    };
  }

  try {
    await prisma.user.update({
      where: {
        id: user.id,
      },
      data: {
        profilePhotoPath: filePath,
      },
    });
  } catch (error) {
    console.error(
      "Profile photo database update error:",
      error,
    );

    await supabaseAdmin.storage
      .from(bucket)
      .remove([filePath]);

    return {
      success: false,
      error:
        "The photo was uploaded but couldn't be saved to your profile.",
    };
  }

  if (user.profilePhotoPath) {
    const { error: removeError } =
      await supabaseAdmin.storage
        .from(bucket)
        .remove([user.profilePhotoPath]);

    if (removeError) {
      console.error(
        "Previous profile photo cleanup error:",
        removeError,
      );
    }
  }

  revalidatePath("/dashboard/profile");
  revalidatePath("/dashboard/wallet");
  revalidatePath("/dashboard");

  return {
    success: true,
    message: "Profile photo updated.",
  };
}

export async function removeProfilePhoto(
  _previousState: ActionResult,
  _formData: FormData,
): Promise<ActionResult> {
  void _previousState;
  void _formData;

  const user = await getAuthenticatedUser();

  if (!user) {
    return {
      success: false,
      error: "Your session has expired. Please log in again.",
    };
  }

  if (!user.profilePhotoPath) {
    return {
      success: true,
      message: "Profile photo removed.",
    };
  }

  const previousPhotoPath = user.profilePhotoPath;

  await prisma.user.update({
    where: {
      id: user.id,
    },
    data: {
      profilePhotoPath: null,
    },
  });

  const supabaseAdmin = createAdminClient();
  const bucket = getStorageBucket();

  const { error } = await supabaseAdmin.storage
    .from(bucket)
    .remove([previousPhotoPath]);

  if (error) {
    console.error(
      "Profile photo removal error:",
      error,
    );
  }

  revalidatePath("/dashboard/profile");
  revalidatePath("/dashboard/wallet");
  revalidatePath("/dashboard");

  return {
    success: true,
    message: "Profile photo removed.",
  };
}
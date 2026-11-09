"use server";

import { getCurrentUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/prisma";
import { isAllowedPushEndpoint } from "@/lib/push/web-push";

type PushSubscriptionInput = {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
  expirationTime?: number | null;
  userAgent?: string | null;
};

export async function getVapidPublicKey() {
  return process.env.VAPID_PUBLIC_KEY ?? null;
}

export async function isPushSubscriptionSaved(endpoint: string) {
  const { user } = await getCurrentUser();

  if (typeof endpoint !== "string" || endpoint.length > 4096) {
    return false;
  }

  const subscription = await prisma.pushSubscription.findFirst({
    where: {
      userId: user.id,
      endpoint,
      revokedAt: null,
    },
    select: { id: true },
  });

  return Boolean(subscription);
}

export async function savePushSubscription(
  input: PushSubscriptionInput,
) {
  const { user } = await getCurrentUser();

  if (
    !input ||
    typeof input.endpoint !== "string" ||
    input.endpoint.length > 4096 ||
    typeof input.keys?.p256dh !== "string" ||
    typeof input.keys?.auth !== "string" ||
    !/^[A-Za-z0-9_-]{20,200}$/.test(input.keys.p256dh) ||
    !/^[A-Za-z0-9_-]{10,100}$/.test(input.keys.auth)
  ) {
    throw new Error("The device subscription is invalid.");
  }

  if (!isAllowedPushEndpoint(input.endpoint)) {
    throw new Error("The device subscription endpoint is not a recognized push-service URL.");
  }

  const expirationTime =
    typeof input.expirationTime === "number" &&
    Number.isSafeInteger(input.expirationTime) &&
    input.expirationTime > 0
      ? BigInt(input.expirationTime)
      : null;

  const subscriptionData = {
    p256dh: input.keys.p256dh,
    auth: input.keys.auth,
    expirationTime,
    userAgent: input.userAgent?.slice(0, 500) ?? null,
    revokedAt: null,
    lastUsedAt: new Date(),
  };

  const existing = await prisma.pushSubscription.findUnique({
    where: { endpoint: input.endpoint },
    select: { id: true, userId: true },
  });

  if (existing) {
    if (existing.userId !== user.id) {
      throw new Error("This device subscription is already linked to another account.");
    }

    await prisma.pushSubscription.update({
      where: { id: existing.id },
      data: subscriptionData,
    });
  } else {
    try {
      await prisma.pushSubscription.create({
        data: {
          ...subscriptionData,
          userId: user.id,
          endpoint: input.endpoint,
        },
      });
    } catch (error) {
      const isUniqueConflict =
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        error.code === "P2002";

      if (!isUniqueConflict) throw error;

      const racedSubscription = await prisma.pushSubscription.findUnique({
        where: { endpoint: input.endpoint },
        select: { id: true, userId: true },
      });

      if (!racedSubscription || racedSubscription.userId !== user.id) {
        throw new Error("This device subscription is already linked to another account.");
      }

      await prisma.pushSubscription.update({
        where: { id: racedSubscription.id },
        data: subscriptionData,
      });
    }
  }

  return { success: true };
}

export async function disablePushSubscription(endpoint: string) {
  const { user } = await getCurrentUser();

  if (typeof endpoint !== "string" || endpoint.length > 4096) {
    throw new Error("The device subscription is invalid.");
  }

  await prisma.pushSubscription.updateMany({
    where: {
      userId: user.id,
      endpoint,
      revokedAt: null,
    },
    data: {
      revokedAt: new Date(),
    },
  });

  return { success: true };
}
import { prisma } from "@/lib/prisma";

import type { NotificationType } from "../generated/prisma/client";

type CreateNotificationInput = {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  href?: string | null;
};

export async function createNotification(
  input: CreateNotificationInput,
) {
  return prisma.notification.create({
    data: {
      userId: input.userId,
      type: input.type,
      title: input.title,
      message: input.message,
      href: input.href ?? null,
    },
  });
}

export async function createNotifications(
  inputs: CreateNotificationInput[],
) {
  if (inputs.length === 0) {
    return;
  }

  return prisma.notification.createMany({
    data: inputs.map((input) => ({
      userId: input.userId,
      type: input.type,
      title: input.title,
      message: input.message,
      href: input.href ?? null,
    })),
  });
}

export async function getUnreadNotificationCount(
  userId: string,
) {
  return prisma.notification.count({
    where: {
      userId,
      readAt: null,
    },
  });
}

export async function getNotifications(
  userId: string,
  limit = 20,
) {
  return prisma.notification.findMany({
    where: {
      userId,
    },
    orderBy: {
      createdAt: "desc",
    },
    take: limit,
  });
}

export async function markNotificationAsRead(
  userId: string,
  notificationId: string,
) {
  return prisma.notification.updateMany({
    where: {
      id: notificationId,
      userId,
      readAt: null,
    },
    data: {
      readAt: new Date(),
    },
  });
}

export async function markAllNotificationsAsRead(
  userId: string,
) {
  return prisma.notification.updateMany({
    where: {
      userId,
      readAt: null,
    },
    data: {
      readAt: new Date(),
    },
  });
}
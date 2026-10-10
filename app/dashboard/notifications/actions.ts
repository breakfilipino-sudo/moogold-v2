"use server";

import { getCurrentUser } from "@/lib/auth/current-user";
import {
  getNotifications,
  getUnreadNotificationCount,
  markAllNotificationsAsRead,
  markNotificationAsRead,
} from "@/lib/notifications";

export async function getNotificationSummary() {
  const { user } = await getCurrentUser();

  const [notifications, unreadCount] = await Promise.all([
    getNotifications(user.id, 50),
    getUnreadNotificationCount(user.id),
  ]);

  return {
    notifications: notifications.map((notification) => ({
      id: notification.id,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      href: notification.href,
      readAt: notification.readAt?.toISOString() ?? null,
      createdAt: notification.createdAt.toISOString(),
    })),
    unreadCount,
  };
}

export async function markNotificationRead(
  notificationId: string,
) {
  const { user } = await getCurrentUser();

  await markNotificationAsRead(
    user.id,
    notificationId,
  );

  return {
    success: true,
  };
}

export async function markAllNotificationsRead() {
  const { user } = await getCurrentUser();

  await markAllNotificationsAsRead(user.id);

  return {
    success: true,
  };
}
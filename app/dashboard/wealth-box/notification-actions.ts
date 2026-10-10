"use server";

import { revalidatePath } from "next/cache";

import { getCurrentUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/prisma";

export async function markWealthBoxNoticeRead(
  notificationId: string,
): Promise<void> {
  const { user } = await getCurrentUser();

  if (!notificationId?.trim()) {
    return;
  }

  await prisma.notification.updateMany({
    where: {
      id: notificationId,
      userId: user.id,
      type: "SYSTEM",
      title: "Your Wealth Box investment is approved",
      readAt: null,
    },
    data: {
      readAt: new Date(),
    },
  });

  revalidatePath("/dashboard/wealth-box");
}
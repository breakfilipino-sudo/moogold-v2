import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";

export const getCurrentUser = cache(async () => {
  const supabase = await createClient();

  const {
    data: { user: authUser },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !authUser) {
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
      email: true,
      phone: true,
      countryCode: true,
      profilePhotoPath: true,
      preferredLanguage: true,
    },
  });

  if (!user) {
    redirect("/login");
  }

  return {
    authUser,
    user,
  };
});
import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";

export const getCurrentUser = cache(async () => {
  const startedAt = Date.now();

  console.log("[auth-timing] START");

  const supabase = await createClient();

  const clientReadyAt = Date.now();

  console.log(
    `[auth-timing] createClient: ${
      clientReadyAt - startedAt
    }ms`,
  );

  const {
    data: { user: authUser },
    error: authError,
  } = await supabase.auth.getUser();

  const authFinishedAt = Date.now();

  console.log(
    `[auth-timing] Supabase getUser: ${
      authFinishedAt - clientReadyAt
    }ms`,
  );

  if (authError || !authUser) {
    console.error(
      "[auth-timing] Supabase auth failed:",
      authError,
    );

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

  const prismaFinishedAt = Date.now();

  console.log(
    `[auth-timing] Prisma user lookup: ${
      prismaFinishedAt - authFinishedAt
    }ms`,
  );

  const emailMatchedUser = authUser.email
    ? await prisma.user.findUnique({
        where: { email: authUser.email.trim().toLowerCase() },
        select: { authUserId: true },
      })
    : null;

  console.log("[auth-diagnostic] Email profile check:", {
    authenticatedEmailAvailable: Boolean(authUser.email),
    emailProfileFound: Boolean(emailMatchedUser),
    emailProfileAuthIdMatches: Boolean(emailMatchedUser && emailMatchedUser.authUserId === authUser.id),
  });

  console.log("[auth-diagnostic] Dashboard profile check:", {
    authenticatedUserFound: Boolean(authUser),
    profileFound: Boolean(user),
    profileAuthIdMatches: Boolean(user && user.authUserId === authUser.id),
  });

  if (!user) {
    redirect("/login");
  }

  console.log(
    `[auth-timing] TOTAL: ${
      prismaFinishedAt - startedAt
    }ms`,
  );

  return {
    authUser,
    user,
  };
});

import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (!code) {
    return NextResponse.redirect(`${origin}/`);
  }

  const supabase = await createClient();

  /*
   * Exchange the confirmation/authentication code for a
   * Supabase session.
   */
  const { data, error } =
    await supabase.auth.exchangeCodeForSession(code);

  if (error || !data.user) {
    console.error(
      "Auth callback failed:",
      error,
    );

    return NextResponse.redirect(`${origin}/`);
  }

  const authUser = data.user;

  /*
   * Find the corresponding MooGold account.
   */
  const user = await prisma.user.findUnique({
    where: {
      authUserId: authUser.id,
    },
    select: {
      id: true,
      email: true,
    },
  });

  /*
   * If this is an existing MooGold account and Supabase now
   * has a different confirmed email, synchronize Prisma.
   *
   * This is intentionally done only AFTER the Supabase
   * confirmation code has been successfully exchanged.
   */
  if (user && authUser.email) {
    const confirmedEmail =
      authUser.email.trim().toLowerCase();

    const currentEmail =
      user.email?.trim().toLowerCase() ?? "";

    if (
      confirmedEmail &&
      confirmedEmail !== currentEmail
    ) {
      /*
       * Make sure the confirmed email isn't already owned
       * by another MooGold account.
       */
      const existingUser =
        await prisma.user.findFirst({
          where: {
            email: confirmedEmail,
            NOT: {
              id: user.id,
            },
          },
          select: {
            id: true,
          },
        });

      if (!existingUser) {
        await prisma.user.update({
          where: {
            id: user.id,
          },
          data: {
            email: confirmedEmail,
          },
        });

        return NextResponse.redirect(
          `${origin}/dashboard/settings/email?verified=1`,
        );
      }

      console.error(
        "Email confirmation belongs to an email already used by another MooGold account.",
      );

      return NextResponse.redirect(
        `${origin}/dashboard/settings/email?error=email-in-use`,
      );
    }
  }

  /*
   * Preserve the existing callback behavior for normal
   * authentication callbacks.
   */
  return NextResponse.redirect(
    `${origin}/dashboard`,
  );
}
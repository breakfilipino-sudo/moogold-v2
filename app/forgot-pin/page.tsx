import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";

import ForgotPinClient from "./forgot-pin-client";

export default async function ForgotPinPage() {
  const supabase = await createClient();

  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  /*
   * If the user is already authenticated, use the
   * authoritative registered phone from Prisma.
   */
  if (authUser) {
    const user = await prisma.user.findUnique({
      where: {
        authUserId: authUser.id,
      },
      select: {
        phone: true,
      },
    });

    if (user?.phone) {
      return (
        <ForgotPinClient
          registeredPhone={user.phone}
          authenticatedFlow
        />
      );
    }
  }

  /*
   * Logged-out users still need to identify the account
   * they want to recover.
   */
  return <ForgotPinClient />;
}
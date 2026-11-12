import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ reference: string }> },
) {
  const { reference } = await params;

  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { authUserId: authUser.id },
    select: { id: true },
  });

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const transaction = await prisma.transaction.findFirst({
    where: {
      reference,
      userId: user.id,
      type: "DEPOSIT",
      depositDetails: {
        is: {
          method: { in: ["GCASH", "TOUCH_N_GO"] },
        },
      },
    },
    select: {
      status: true,
      depositDetails: {
        select: {
          method: true,
          gatewayUrl: true,
          updatedAt: true,
        },
      },
    },
  });

  if (!transaction || !transaction.depositDetails) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  let gatewayUrl: string | null = null;

  if (
    transaction.status === "PENDING" &&
    transaction.depositDetails.gatewayUrl
  ) {
    try {
      const parsed = new URL(transaction.depositDetails.gatewayUrl);

      if (
        parsed.protocol === "https:" &&
        !parsed.username &&
        !parsed.password
      ) {
        gatewayUrl = parsed.toString();
      }
    } catch {
      gatewayUrl = null;
    }
  }

  return NextResponse.json(
    {
      status: transaction.status,
      gatewayUrl,
      gatewaySavedAt: gatewayUrl ? transaction.depositDetails.updatedAt.toISOString() : null,
    },
    {
      headers: { "Cache-Control": "no-store" },
    },
  );
}
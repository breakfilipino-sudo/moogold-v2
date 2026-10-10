import { NextResponse } from "next/server";

import { processDailyWealthEarnings } from "@/lib/wealth-box/process-earnings";

export const dynamic = "force-dynamic";

export async function GET(
request: Request,
) {
const cronSecret =
process.env.CRON_SECRET;

if (!cronSecret) {
console.error(
"CRON_SECRET is not configured.",
);

return NextResponse.json(
  {
    error:
      "Cron authentication is not configured.",
  },
  {
    status: 500,
  },
);

}

const authorization =
request.headers.get("authorization");

if (
authorization !==
`Bearer ${cronSecret}`
) {
return NextResponse.json(
{
error: "Unauthorized.",
},
{
status: 401,
},
);
}

try {
const result =
await processDailyWealthEarnings();

return NextResponse.json({
  success: true,
  ...result,
  processedAt:
    new Date().toISOString(),
});

} catch (error) {
console.error(
"Wealth Box daily earnings processing failed:",
error,
);

return NextResponse.json(
  {
    success: false,
    error:
      "Daily Wealth Box earnings could not be processed.",
  },
  {
    status: 500,
  },
);

}
}

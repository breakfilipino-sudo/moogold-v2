import { Resend } from "resend";

type AdminEmailAlert = {
  subject: string;
  message: string;
};

export async function sendAdminEmailAlert({
  subject,
  message,
}: AdminEmailAlert): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.ADMIN_NOTIFICATION_EMAIL;
  const from = process.env.ADMIN_NOTIFICATION_FROM;

  if (!apiKey || !to || !from) {
    console.error(
      "Admin email alert skipped: email configuration is incomplete.",
    );
    return;
  }

  try {
    const resend = new Resend(apiKey);

    const result = await resend.emails.send({
      from,
      to,
      subject: `[MooGold Alert] ${subject}`,
      text: message,
    });

    if (result.error) {
      console.error(
        "Admin email alert was rejected by the email provider:",
        result.error.message,
      );
    }
  } catch (error) {
    console.error(
      "Admin email alert failed:",
      error instanceof Error ? error.message : "Unknown email error",
    );
  }
}

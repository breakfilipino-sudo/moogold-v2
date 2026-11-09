import webpush from "web-push";

const ALLOWED_PUSH_HOSTS = new Set([
  "fcm.googleapis.com",
  "android.googleapis.com",
  "updates.push.services.mozilla.com",
  "push.services.mozilla.com",
  "web.push.apple.com",
]);

const ALLOWED_PUSH_SUFFIXES = [
  ".push.apple.com",
  ".notify.windows.com",
  ".wns.windows.com",
];

export function isAllowedPushEndpoint(endpoint: string) {
  try {
    const url = new URL(endpoint);

    if (
      url.protocol !== "https:" ||
      (url.port !== "" && url.port !== "443") ||
      url.username !== "" ||
      url.password !== ""
    ) {
      return false;
    }

    const hostname = url.hostname.toLowerCase();

    return (
      ALLOWED_PUSH_HOSTS.has(hostname) ||
      ALLOWED_PUSH_SUFFIXES.some((suffix) => hostname.endsWith(suffix))
    );
  } catch {
    return false;
  }
}

function configureWebPush() {
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT;

  if (!publicKey || !privateKey || !subject) {
    throw new Error("Phone push delivery is not configured.");
  }

  if (!subject.startsWith("https://") && !subject.startsWith("mailto:")) {
    throw new Error("The VAPID subject is invalid.");
  }

  webpush.setVapidDetails(subject, publicKey, privateKey);
}

export function ensurePushDeliveryConfigured() {
  configureWebPush();
}

export async function sendPhonePush(
  subscription: {
    endpoint: string;
    p256dh: string;
    auth: string;
  },
  payload: {
    title: string;
    message: string;
    href: string | null;
    kind: "PROMOTIONAL";
    tag: string;
  }
) {
  configureWebPush();

  if (!isAllowedPushEndpoint(subscription.endpoint)) {
    throw new Error("The push-service endpoint is not allowed.");
  }

  return webpush.sendNotification(
    {
      endpoint: subscription.endpoint,
      keys: {
        p256dh: subscription.p256dh,
        auth: subscription.auth,
      },
    },
    JSON.stringify(payload),
    {
      TTL: 3600,
      timeout: 1500,
    }
  );
}
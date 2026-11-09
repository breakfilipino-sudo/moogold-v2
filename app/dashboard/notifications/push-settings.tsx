"use client";

import { useEffect, useState } from "react";
import { BellRing, BellOff, LoaderCircle, ShieldCheck } from "lucide-react";

import {
  disablePushSubscription,
  getVapidPublicKey,
  isPushSubscriptionSaved,
  savePushSubscription,
} from "./push-actions";

type DeviceState = "checking" | "enabled" | "disabled" | "unsupported";

function decodeVapidKey(value: string) {
  const padding = "=".repeat((4 - (value.length % 4)) % 4);
  const base64 = (value + padding)
    .replace(/-/g, "+")
    .replace(/_/g, "/");

  const raw = window.atob(base64);
  const output = new Uint8Array(raw.length);

  for (let index = 0; index < raw.length; index += 1) {
    output[index] = raw.charCodeAt(index);
  }

  return output;
}

export default function PushSettings() {
  const [deviceState, setDeviceState] =
    useState<DeviceState>("checking");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let active = true;

    async function checkDevice() {
      if (
        !("serviceWorker" in navigator) ||
        !("PushManager" in window) ||
        !("Notification" in window)
      ) {
        if (active) setDeviceState("unsupported");
        return;
      }

      try {
        const registration =
          await navigator.serviceWorker.getRegistration("/");

        const subscription =
          await registration?.pushManager.getSubscription();

        if (!active) return;

        if (!subscription) {
          setDeviceState("disabled");
          return;
        }

        const saved = await isPushSubscriptionSaved(
          subscription.endpoint,
        );

        if (active) {
          setDeviceState(saved ? "enabled" : "disabled");
        }
      } catch {
        if (active) {
          setDeviceState("disabled");
        }
      }
    }

    void checkDevice();

    return () => {
      active = false;
    };
  }, []);

  async function enableNotifications() {
    setBusy(true);
    setMessage("");

    try {
      if (
        !("serviceWorker" in navigator) ||
        !("PushManager" in window) ||
        !("Notification" in window)
      ) {
        setDeviceState("unsupported");
        throw new Error(
          "This browser does not support phone notifications.",
        );
      }

      const permission = await Notification.requestPermission();

      if (permission !== "granted") {
        throw new Error(
          permission === "denied"
            ? "Notifications are blocked in your browser settings."
            : "Notification permission was not granted.",
        );
      }

      const publicKey = await getVapidPublicKey();

      if (!publicKey) {
        throw new Error(
          "Phone notifications are not configured yet. Please try again later.",
        );
      }

      const registration =
        await navigator.serviceWorker.register("/sw.js");

      await navigator.serviceWorker.ready;

      let subscription =
        await registration.pushManager.getSubscription();

      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: decodeVapidKey(
            publicKey,
          ) as unknown as BufferSource,
        });
      }

      const data = subscription.toJSON();

      if (
        !data.endpoint ||
        !data.keys?.p256dh ||
        !data.keys?.auth
      ) {
        throw new Error(
          "Your browser returned an incomplete device subscription.",
        );
      }

      await savePushSubscription({
        endpoint: data.endpoint,
        keys: {
          p256dh: data.keys.p256dh,
          auth: data.keys.auth,
        },
        expirationTime: subscription.expirationTime,
        userAgent: navigator.userAgent,
      });

      setDeviceState("enabled");
      setMessage("Phone notifications are enabled on this device.");
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Could not enable phone notifications.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function turnOffNotifications() {
    setBusy(true);
    setMessage("");

    try {
      const registration =
        await navigator.serviceWorker.getRegistration("/");

      const subscription =
        await registration?.pushManager.getSubscription();

      if (subscription) {
        await disablePushSubscription(subscription.endpoint);
        await subscription.unsubscribe();
      }

      setDeviceState("disabled");
      setMessage("Phone notifications are turned off on this device.");
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Could not turn off phone notifications.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
            <BellRing className="h-5 w-5" />
          </div>

          <div>
            <h2 className="font-semibold text-slate-900">
              Phone notifications
            </h2>
            <p className="mt-1 text-sm leading-5 text-slate-500">
              Receive account activity alerts and important MooGold
              promotional updates on this device.
            </p>
            <div className="mt-2 flex items-center gap-1.5 text-xs text-slate-500">
              <ShieldCheck className="h-3.5 w-3.5" />
              You control permission for this device.
            </div>
          </div>
        </div>

        <div className="shrink-0">
          {deviceState === "enabled" ? (
            <button
              type="button"
              onClick={turnOffNotifications}
              disabled={busy}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
            >
              {busy ? (
                <LoaderCircle className="h-4 w-4 animate-spin" />
              ) : (
                <BellOff className="h-4 w-4" />
              )}
              Turn off on this device
            </button>
          ) : (
            <button
              type="button"
              onClick={enableNotifications}
              disabled={busy || deviceState === "checking" || deviceState === "unsupported"}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {busy || deviceState === "checking" ? (
                <LoaderCircle className="h-4 w-4 animate-spin" />
              ) : (
                <BellRing className="h-4 w-4" />
              )}
              {deviceState === "unsupported"
                ? "Not supported"
                : "Enable phone notifications"}
            </button>
          )}
        </div>
      </div>

      {message ? (
        <p
          role="status"
          className="mt-3 text-sm text-slate-600"
        >
          {message}
        </p>
      ) : null}

      {deviceState === "unsupported" ? (
        <p className="mt-3 text-sm text-amber-700">
          Use a supported browser with notification permission enabled.
        </p>
      ) : null}
    </section>
  );
}
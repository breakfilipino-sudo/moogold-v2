"use client";

import { useEffect } from "react";

export default function PwaRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) {
      return;
    }

    // Registration runs in the background and does not block page rendering.
    void navigator.serviceWorker.register("/sw.js").catch(() => {
      // PWA installation remains optional if registration fails.
    });
  }, []);

  return null;
}

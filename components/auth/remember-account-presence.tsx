"use client";

import { useEffect } from "react";

export default function RememberAccountPresence() {
  useEffect(() => {
    const secure = window.location.protocol === "https:" ? "; Secure" : "";

    document.cookie =
      "moogold-has-account=1; Path=/; Max-Age=31536000; SameSite=Lax" +
      secure;
  }, []);

  return null;
}

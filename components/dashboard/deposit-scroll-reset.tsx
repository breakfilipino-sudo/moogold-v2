"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

export default function DepositScrollReset() {
  const pathname = usePathname();

  useEffect(() => {
    if (pathname.startsWith("/dashboard/deposit")) {
      window.scrollTo({ top: 0, left: 0 });
    }
  }, [pathname]);

  return null;
}
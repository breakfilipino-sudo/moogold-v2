"use client";

import { Download } from "lucide-react";
import { useEffect, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
}

export default function InstallAppButton({
  className = "",
  children = "Download App",
}: {
  className?: string;
  children?: React.ReactNode;
}) {
  const [installPrompt, setInstallPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt,
      );
    };
  }, []);

  async function handleInstall() {
    if (!installPrompt) {
      return;
    }

    const prompt = installPrompt;
    setInstallPrompt(null);

    try {
      await prompt.prompt();
      await prompt.userChoice;
    } catch {
      // Keep the normal button available if installation cannot start.
    }
  }

  return (
    <button
      type="button"
      onClick={handleInstall}
      className={className}
    >
      <Download className="h-3.5 w-3.5" />
      {children}
    </button>
  );
}

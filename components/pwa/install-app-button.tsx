"use client";

import { Download, Share, X } from "lucide-react";
import { useEffect, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
}

type GuideType = "ios" | "in-app" | "browser" | "installed";

export default function InstallAppButton({
  className = "",
  children = "Download App",
}: {
  className?: string;
  children?: React.ReactNode;
}) {
  const [installPrompt, setInstallPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [showGuide, setShowGuide] = useState(false);
  const [guideType, setGuideType] = useState<GuideType>("ios");

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
    const ua = navigator.userAgent;

    const isIOS =
      /iPhone|iPad|iPod/i.test(ua) ||
      (/Macintosh/i.test(ua) && navigator.maxTouchPoints > 1);

    const isInAppBrowser =
      /FBAN|FBAV|Instagram|Line\/|MicroMessenger|WhatsApp/i.test(ua);

    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true;

    if (isStandalone) {
      setGuideType("installed");
      setShowGuide(true);
      return;
    }

    if (isIOS) {
      setGuideType(isInAppBrowser ? "in-app" : "ios");
      setShowGuide(true);
      return;
    }

    if (installPrompt) {
      const prompt = installPrompt;
      setInstallPrompt(null);

      try {
        await prompt.prompt();
        const choice = await prompt.userChoice;

        if (choice.outcome === "accepted") {
          return;
        }
      } catch {
        // Show browser installation guidance if the prompt fails.
      }
    }

    setGuideType("browser");
    setShowGuide(true);
  }

  return (
    <>
      <button
        type="button"
        onClick={handleInstall}
        className={className}
      >
        <Download className="h-3.5 w-3.5" />
        {children}
      </button>

      {showGuide && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          onClick={() => setShowGuide(false)}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="install-app-title"
            className="relative w-full max-w-sm rounded-3xl bg-white p-6 text-[#10201b] shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setShowGuide(false)}
              aria-label="Close installation guide"
              className="absolute right-4 top-4 rounded-full p-2 text-slate-500 transition hover:bg-slate-100"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
              <Download className="h-6 w-6" />
            </div>

            <h2
              id="install-app-title"
              className="pr-8 text-xl font-black tracking-tight"
            >
              {guideType === "installed"
                ? "MooGold is installed"
                : guideType === "in-app"
                  ? "Open MooGold in Safari"
                  : guideType === "ios"
                    ? "Install MooGold on iPhone"
                    : "Install MooGold"}
            </h2>

            {guideType === "installed" ? (
              <p className="mt-3 text-sm leading-6 text-slate-600">
                MooGold is already running as an installed app on this
                device. Look for the MooGold icon on your Home Screen.
              </p>
            ) : guideType === "in-app" ? (
              <div className="mt-3 space-y-3 text-sm leading-6 text-slate-600">
                <p>
                  To add MooGold to your Home Screen, open this website
                  in Safari.
                </p>
                <p>
                  In Safari, tap the Share button, select{" "}
                  <strong>Add to Home Screen</strong>, then tap{" "}
                  <strong>Add to install MooGold</strong>.
                </p>
              </div>
            ) : guideType === "ios" ? (
              <div className="mt-4 space-y-4">
                <p className="text-sm leading-6 text-slate-600">
                  Add MooGold to your iPhone Home Screen in three simple
                  steps.
                </p>

                <div className="flex items-start gap-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-sm font-black text-emerald-700">
                    1
                  </span>
                  <p className="pt-1 text-sm leading-6 text-slate-700">
                    Open MooGold in <strong>Safari</strong>.
                  </p>
                </div>

                <div className="flex items-start gap-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                    <Share className="h-4 w-4" />
                  </span>
                  <p className="pt-1 text-sm leading-6 text-slate-700">
                    Tap Safari&apos;s <strong>Share</strong> button.
                  </p>
                </div>

                <div className="flex items-start gap-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-sm font-black text-emerald-700">
                    3
                  </span>
                  <p className="pt-1 text-sm leading-6 text-slate-700">
                    Select <strong>Add to Home Screen</strong>, then tap{" "}
                    <strong>Add to install MooGold</strong>.
                  </p>
                </div>
              </div>
            ) : (
              <div className="mt-3 space-y-3 text-sm leading-6 text-slate-600">
                <p>
                  Automatic installation is not available in this browser
                  session.
                </p>
                <p>
                  Open the browser menu and look for{" "}
                  <strong>Install app</strong> or{" "}
                  <strong>Add to Home Screen</strong>, if available.
                </p>
              </div>
            )}

            <button
              type="button"
              onClick={() => setShowGuide(false)}
              className="mt-6 flex h-12 w-full items-center justify-center rounded-xl bg-[#10201b] px-5 text-sm font-bold text-white transition hover:bg-[#18352d]"
            >
              Install Guide
            </button>

            <p className="mt-3 text-center text-xs text-slate-500">
              MooGold - More than a wallet.
            </p>
          </section>
        </div>
      )}
    </>
  );
}
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

export default function InstallAppButton({
  className = "",
  children = "Download App",
}: {
  className?: string;
  children?: React.ReactNode;
}) {
  const [installPrompt, setInstallPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [installing, setInstalling] = useState(false);
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [isIOSInAppBrowser, setIsIOSInAppBrowser] = useState(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setInstallPrompt(null);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt,
      );
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  async function handleInstall() {
    if (installing) return;

    const ua = navigator.userAgent;

    const isIOS =
      /iPhone|iPad|iPod/i.test(ua) ||
      (/Macintosh/i.test(ua) && navigator.maxTouchPoints > 1);

    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true;

    if (isStandalone) return;

    if (isIOS) {
      setIsIOSInAppBrowser(
        /FBAN|FBAV|Instagram|Line\/|MicroMessenger|WhatsApp/i.test(ua),
      );
      setShowIOSGuide(true);
      return;
    }

    if (!installPrompt) return;

    const prompt = installPrompt;
    setInstallPrompt(null);
    setInstalling(true);

    try {
      await prompt.prompt();
      await prompt.userChoice;
    } catch {
      // No custom installation guidance on Android or desktop.
    } finally {
      setInstalling(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={handleInstall}
        disabled={installing}
        aria-label="Download and install MooGold"
        className={className}
      >
        <Download className="h-3.5 w-3.5" />
        {children}
      </button>

      {showIOSGuide && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          onClick={() => setShowIOSGuide(false)}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="ios-install-title"
            className="relative w-full max-w-sm rounded-3xl bg-white p-6 text-[#10201b] shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setShowIOSGuide(false)}
              aria-label="Close"
              className="absolute right-4 top-4 rounded-full p-2 text-slate-500 transition hover:bg-slate-100"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
              <Download className="h-6 w-6" />
            </div>

            <h2
              id="ios-install-title"
              className="pr-8 text-xl font-black tracking-tight"
            >
              Install MooGold app
            </h2>

            {isIOSInAppBrowser ? (
              <p className="mt-3 text-sm leading-6 text-slate-600">
                First, open this page in Safari. Then follow the three
                simple steps below to add MooGold to your Home Screen.
              </p>
            ) : (
              <p className="mt-3 text-sm leading-6 text-slate-600">
                Install the MooGold app on your iPhone by following
                these simple steps.
              </p>
            )}

            <div className="mt-5 space-y-4">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                  <Share className="h-5 w-5" />
                </span>
                <div className="text-sm leading-5 text-slate-700">
                  <strong>1. Tap Share</strong>
                  <p className="mt-1 text-slate-500">
                    At the bottom of Safari.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                  <Download className="h-5 w-5" />
                </span>
                <div className="text-sm leading-5 text-slate-700">
                  <strong>2. Tap Add to Home Screen</strong>
                  <p className="mt-1 text-slate-500">
                    Find it in the Share menu.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                  <Download className="h-5 w-5" />
                </span>
                <div className="text-sm leading-5 text-slate-700">
                  <strong>3. Tap Add</strong>
                  <p className="mt-1 text-slate-500">
                    MooGold will appear on your Home Screen.
                  </p>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowIOSGuide(false)}
              className="mt-6 flex h-12 w-full items-center justify-center rounded-xl bg-[#10201b] px-5 text-sm font-bold text-white transition hover:bg-[#18352d]"
            >
              Got it
            </button>
          </section>
        </div>
      )}
    </>
  );
}
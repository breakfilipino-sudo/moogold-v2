"use client";

import {
  Download,
  Share,
  X,
  MoreVertical,
  Smartphone,
} from "lucide-react";
import { useEffect, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
}

type GuidePlatform = "ios" | "browser";

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
  const [guidePlatform, setGuidePlatform] =
    useState<GuidePlatform | null>(null);

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

  function isIosDevice() {
    const userAgent = window.navigator.userAgent.toLowerCase();

    return /iphone|ipad|ipod/.test(userAgent) && !("MSStream" in window);
  }

  async function handleInstall() {
    if (installPrompt) {
      const prompt = installPrompt;

      try {
        await prompt.prompt();
        const choice = await prompt.userChoice;

        if (choice.outcome === "accepted") {
          setInstallPrompt(null);
          setShowGuide(false);
          return;
        }
      } catch {
        // Keep the download button available if the browser prompt fails.
      }
    }

    setGuidePlatform(isIosDevice() ? "ios" : "browser");
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
        <div className="fixed inset-0 z-[100] flex items-end justify-center bg-[#08150f]/45 p-4 backdrop-blur-sm sm:items-center">
          <div className="w-full max-w-sm rounded-[24px] border border-[#dfe7e2] bg-white p-5 shadow-[0_25px_80px_rgba(15,45,32,.18)]">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#138a5d]">
                  MooGold App
                </p>

                <h3 className="mt-1 text-lg font-bold tracking-[-0.03em] text-[#17231e]">
                  Install MooGold
                </h3>
              </div>

              <button
                type="button"
                aria-label="Close"
                onClick={() => setShowGuide(false)}
                className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#f4f7f5] text-[#68756e]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {guidePlatform === "ios" ? (
              <>
                <p className="mt-4 text-[12px] leading-5 text-[#78857e]">
                  Install MooGold from Safari and keep it on your Home Screen
                  like a normal app.
                </p>

                <div className="mt-5 space-y-2.5">
                  <Step
                    icon={<Share className="h-4 w-4" />}
                    title="1. Tap Share"
                    text="Use Safari’s Share button."
                  />

                  <Step
                    icon={<Download className="h-4 w-4" />}
                    title="2. Add to Home Screen"
                    text="Choose Add to Home Screen, then tap Add."
                  />
                </div>
              </>
            ) : (
              <>
                <p className="mt-4 text-[12px] leading-5 text-[#78857e]">
                  Open your browser menu to find the option to install
                  MooGold or add it to your Home Screen.
                </p>

                <div className="mt-5 space-y-2.5">
                  <Step
                    icon={<Smartphone className="h-4 w-4" />}
                    title="Install MooGold"
                    text="Follow your browser’s installation steps."
                  />

                  <Step
                    icon={<MoreVertical className="h-4 w-4" />}
                    title="Browser menu"
                    text="Look for Install app or Add to Home screen."
                  />
                </div>
              </>
            )}

            <button
              type="button"
              onClick={() => setShowGuide(false)}
              className="mt-4 h-11 w-full rounded-xl bg-[#138a5d] text-[12px] font-bold text-white"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </>
  );
}

function Step({
  icon,
  title,
  text,
}: {
  icon: React.ReactNode;
  title: string;
  text: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-[#e3eae6] bg-[#f8faf9] p-4">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-[#138a5d] shadow-sm">
        {icon}
      </div>

      <div>
        <p className="text-[11px] font-bold text-[#25352e]">{title}</p>
        <p className="mt-0.5 text-[10px] leading-4 text-[#8a9690]">
          {text}
        </p>
      </div>
    </div>
  );
}
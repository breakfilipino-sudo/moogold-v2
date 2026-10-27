import Link from "next/link";

export default function AuthShell({
  children,
  title,
  description,
  eyebrow,
  step,
  light = false,
  hideHeading = false,
  hideStep = false,
}: {
  children: React.ReactNode;
  eyebrow?: string;
  title: string;
  description: string;
  step: number;
  light?: boolean;
  hideHeading?: boolean;
  hideStep?: boolean;
}) {
  return (
    <main className={`${hideStep ? "h-[100svh] overflow-hidden sm:h-auto sm:min-h-screen sm:overflow-visible" : "min-h-screen"} ${light ? "bg-[#f7faf8] text-[#17231e]" : "bg-[#08110e] text-white"}`}>
      <div className={`mx-auto flex min-h-screen w-full max-w-[500px] flex-col px-5 sm:px-6 ${hideStep ? "max-w-[560px] justify-center sm:translate-y-0 -translate-y-3" : ""}`}>
        <header className={`flex items-center gap-4 ${hideStep ? "justify-center pb-6" : "justify-between pt-7 sm:pt-9"}`}>
          <Link
            href="/"
            className={`inline-flex items-center text-[20px] font-black tracking-[-0.06em] ${light ? "text-[#17231e]" : "text-white"}`}
          >
            Moo<span className={light ? "text-[#138a5d]" : "text-[#55c995]"}>Gold</span>
          </Link>
          {!hideStep && (
            <span className={`text-xs font-semibold ${light ? "text-[#718078]" : "text-white/45"}`}>
              Step {step} of 3
            </span>
          )}
        </header>

        <section className={`flex flex-col py-4 ${hideStep ? "" : "flex-1 justify-center py-8"}`}>
          {!hideHeading && (
            <div className="mb-6">
              {eyebrow ? (
                <p className={`mb-2 text-[11px] font-bold uppercase tracking-[0.16em] ${light ? "text-[#138a5d]" : "text-[#55c995]"}`}>
                  {eyebrow}
                </p>
              ) : null}
              <h1 className={`text-[28px] font-bold leading-tight tracking-[-0.04em] sm:text-[32px] ${light ? "text-[#17231e]" : "text-white"}`}>
                {title}
              </h1>
              <p className={`mt-2 max-w-[390px] text-sm leading-6 ${light ? "text-[#65736c]" : "text-white/60"}`}>
                {description}
              </p>
            </div>
          )}
          {children}
        </section>
      </div>
    </main>
  );
}
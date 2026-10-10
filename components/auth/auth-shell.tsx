import Link from "next/link";

export default function AuthShell({
  children,
  title,
  description,
}: {
  children: React.ReactNode;
  eyebrow?: string;
  title: string;
  description: string;
  step: number;
}) {
  return (
    <main className="min-h-screen bg-[#f4f7f5] text-[#17231e]">
      <div className="mx-auto flex min-h-screen w-full max-w-[430px] flex-col px-6">
        {/* Brand */}
        <header className="pt-14">
          <Link
            href="/"
            className="inline-flex items-center text-[18px] font-black tracking-[-0.06em] text-[#17231e]"
          >
            Moo
            <span className="text-[#138a5d]">Gold</span>
          </Link>
        </header>

        {/* Main */}
       <section className="flex flex-1 flex-col justify-start pt-12 pb-6 sm:justify-center">
          <div className="mb-5">
            <h1 className="max-w-[340px] text-[24px] font-bold leading-[1.1] tracking-[-0.045em] text-[#17231e]">
              {title}
            </h1>

            <p className="mt-1 max-w-[320px] text-[12px] leading-[1.35rem] text-[#78857e]">
              {description}
            </p>
          </div>

          {children}
        </section>
      </div>
    </main>
  );
}
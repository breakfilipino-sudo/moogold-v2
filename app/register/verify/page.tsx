import { Suspense } from "react";
import RegisterVerifyClient from "./register-verify-client";

export default function RegisterVerifyPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-[#06100d]">
          <div className="mx-auto flex min-h-screen w-full max-w-md items-center justify-center px-4">
            <div className="text-center">
              <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-white/10 border-t-emerald-400" />
              <p className="mt-4 text-sm font-semibold text-white/40">
                Loading verification...
              </p>
            </div>
          </div>
        </main>
      }
    >
      <RegisterVerifyClient />
    </Suspense>
  );
}
"use client";

import Link from "next/link";
import { Menu } from "lucide-react";

import Container from "@/components/shared/container";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet";

const navigation = [
  { name: "Home", href: "/" },
  { name: "Invest", href: "#invest" },
  { name: "News", href: "#news" },
  { name: "Contact", href: "#contact" },
];

export default function Navbar() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-200/70 bg-white/85 backdrop-blur-xl">
      <Container className="flex h-20 items-center justify-between">
        {/* Logo */}
        <Link
          href="/"
          className="text-2xl font-black tracking-[-0.06em]"
          aria-label="MooGold home"
        >
          <span className="text-slate-950">Moo</span>
          <span className="text-emerald-600">Gold</span>
        </Link>

        {/* Desktop navigation */}
        <nav className="hidden items-center gap-8 md:flex">
          {navigation.map((item) => (
            <Link
              key={item.name}
              href={item.href}
              className="text-sm font-semibold text-slate-600 transition-colors hover:text-emerald-600"
            >
              {item.name}
            </Link>
          ))}
        </nav>

        {/* Desktop actions */}
        <div className="hidden items-center gap-2 md:flex">
          <Button
            variant="ghost"
            className="font-semibold text-slate-700 hover:text-emerald-600"
            render={<Link href="/login" />}
          >
            Login
          </Button>

          <Button
            variant="outline"
            className="border-slate-200 font-semibold"
            render={<Link href="#mobile-app" />}
          >
            Download App
          </Button>

          <Button
            className="bg-emerald-600 font-semibold text-white shadow-sm hover:bg-emerald-700"
            render={<Link href="/register" />}
          >
            Register
          </Button>
        </div>

        {/* Mobile navigation */}
        <div className="md:hidden">
          <Sheet>
            <SheetTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-10 w-10 rounded-xl"
                  aria-label="Open navigation menu"
                />
              }
            >
              <Menu className="h-6 w-6" />
            </SheetTrigger>

            <SheetContent
              side="right"
              className="w-[300px] border-l border-slate-200 bg-white"
            >
              <div className="mt-10 flex flex-col">
                <Link
                  href="/"
                  className="mb-10 text-2xl font-black tracking-[-0.06em]"
                >
                  <span className="text-slate-950">Moo</span>
                  <span className="text-emerald-600">Gold</span>
                </Link>

                <nav className="flex flex-col gap-1">
                  {navigation.map((item) => (
                    <Link
                      key={item.name}
                      href={item.href}
                      className="rounded-xl px-3 py-3 text-base font-semibold text-slate-700 transition-colors hover:bg-emerald-50 hover:text-emerald-700"
                    >
                      {item.name}
                    </Link>
                  ))}
                </nav>

                <div className="mt-8 border-t border-slate-200 pt-8">
                  <div className="flex flex-col gap-3">
                    <Button
                      variant="outline"
                      className="h-12 w-full font-semibold"
                      render={<Link href="#mobile-app" />}
                    >
                      Download App
                    </Button>

                    <Button
                      variant="ghost"
                      className="h-12 w-full font-semibold"
                      render={<Link href="/login" />}
                    >
                      Login
                    </Button>

                    <Button
                      className="h-12 w-full bg-emerald-600 font-semibold text-white hover:bg-emerald-700"
                      render={<Link href="/register" />}
                    >
                      Create account
                    </Button>
                  </div>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </Container>
    </header>
  );
}
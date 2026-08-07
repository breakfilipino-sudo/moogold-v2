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
  { name: "Invest", href: "#" },
  { name: "News", href: "#" },
  { name: "Contact", href: "#" },
];

export default function Navbar() {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-white/80 backdrop-blur-md">
      <Container className="flex h-20 items-center justify-between">

        <Link href="/" className="text-2xl font-extrabold tracking-tight">
          <span className="text-slate-900">Moo</span>
          <span className="text-emerald-600">gold</span>
        </Link>

        <nav className="hidden md:flex items-center gap-8">
          {navigation.map((item) => (
            <Link
              key={item.name}
              href={item.href}
              className="font-medium text-slate-700 hover:text-emerald-600 transition"
            >
              {item.name}
            </Link>
          ))}
        </nav>

        <div className="hidden md:flex items-center gap-3">
          <Button variant="ghost">Login</Button>
          <Button variant="outline">Download App</Button>
          <Button className="bg-emerald-600 hover:bg-emerald-700">
            Register
          </Button>
        </div>

        <div className="md:hidden">
          <Sheet>
            <SheetTrigger className="inline-flex h-10 w-10 items-center justify-center rounded-md hover:bg-muted">
              <Menu className="h-6 w-6" />
            </SheetTrigger>

            <SheetContent side="right">
              <div className="mt-12 flex flex-col gap-5">

                {navigation.map((item) => (
                  <Link
                    key={item.name}
                    href={item.href}
                    className="text-lg font-medium"
                  >
                    {item.name}
                  </Link>
                ))}

                <Button variant="outline">
                  Download App
                </Button>

                <Button variant="ghost">
                  Login
                </Button>

                <Button className="bg-emerald-600 hover:bg-emerald-700">
                  Register
                </Button>

              </div>
            </SheetContent>
          </Sheet>
        </div>

      </Container>
    </header>
  );
}
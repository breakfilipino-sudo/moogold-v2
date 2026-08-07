"use client";

import * as React from "react";
import { Dialog as SheetPrimitive } from "@base-ui/react/dialog";
import { X } from "lucide-react";

import { cn } from "@/lib/utils";

function Sheet(props: SheetPrimitive.Root.Props) {
  return <SheetPrimitive.Root {...props} />;
}

function SheetTrigger(props: SheetPrimitive.Trigger.Props) {
  return <SheetPrimitive.Trigger {...props} />;
}

function SheetPortal(props: SheetPrimitive.Portal.Props) {
  return <SheetPrimitive.Portal {...props} />;
}

function SheetOverlay({
  className,
  ...props
}: SheetPrimitive.Backdrop.Props) {
  return (
    <SheetPrimitive.Backdrop
      className={cn(
        "fixed inset-0 z-50 bg-black/50 backdrop-blur-sm",
        className
      )}
      {...props}
    />
  );
}

function SheetClose(props: SheetPrimitive.Close.Props) {
  return <SheetPrimitive.Close {...props} />;
}

function SheetContent({
  side = "right",
  className,
  children,
  ...props
}: SheetPrimitive.Popup.Props & {
  side?: "left" | "right" | "top" | "bottom";
}) {
  const sideClasses = {
    right: "fixed right-0 top-0 h-full w-[320px] border-l",
    left: "fixed left-0 top-0 h-full w-[320px] border-r",
    top: "fixed left-0 top-0 w-full border-b",
    bottom: "fixed left-0 bottom-0 w-full border-t",
  };

  return (
    <SheetPortal>
      <SheetOverlay />

      <SheetPrimitive.Popup
        className={cn(
          "z-50 bg-white shadow-xl p-6 overflow-y-auto",
          sideClasses[side],
          className
        )}
        {...props}
      >
        <SheetPrimitive.Close
          className="absolute right-4 top-4 rounded-md p-2 hover:bg-gray-100"
        >
          <X className="h-5 w-5" />
        </SheetPrimitive.Close>

        {children}
      </SheetPrimitive.Popup>
    </SheetPortal>
  );
}

function SheetHeader({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("flex flex-col space-y-2", className)}
      {...props}
    />
  );
}

function SheetFooter({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("mt-6 flex flex-col gap-2", className)}
      {...props}
    />
  );
}

function SheetTitle(props: SheetPrimitive.Title.Props) {
  return (
    <SheetPrimitive.Title
      className="text-lg font-semibold"
      {...props}
    />
  );
}

function SheetDescription(props: SheetPrimitive.Description.Props) {
  return (
    <SheetPrimitive.Description
      className="text-sm text-muted-foreground"
      {...props}
    />
  );
}

export {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetClose,
  SheetHeader,
  SheetFooter,
  SheetTitle,
  SheetDescription,
};
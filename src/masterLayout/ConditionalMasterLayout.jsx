"use client";
import React from "react";
import { usePathname } from "next/navigation";
import MasterLayout from "@/masterLayout/MasterLayout";

export default function ConditionalMasterLayout({ children }) {
  const pathname = usePathname();

  const noLayoutRoutes = ["/", "/access-denied"];

  if (noLayoutRoutes.includes(pathname)) {
    return <>{children}</>;
  }

  return <MasterLayout>{children}</MasterLayout>;
}

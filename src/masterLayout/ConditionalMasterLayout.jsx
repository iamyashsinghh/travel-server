"use client";
import { usePathname } from "next/navigation";
import MasterLayout from "@/masterLayout/MasterLayout";
import { MyContextProvider } from "@/app/context/MyContext";

export default function ConditionalMasterLayoutClient({ 
  children, 
  session, 
  admin, 
  userPermissions 
}) {
  const pathname = usePathname();
  const noLayoutRoutes = ["/", "/access-denied"];

  return noLayoutRoutes.includes(pathname) ? (
    children
  ) : (
    <MyContextProvider>
    <MasterLayout 
      session={session} 
      admin={admin} 
      userPermissions={userPermissions}
    >
      {children}
    </MasterLayout>
    </MyContextProvider>
  );
}
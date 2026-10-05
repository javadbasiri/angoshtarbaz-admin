"use client";

import { createContext, useContext, useEffect } from "react";
import { expireAdminSession } from "@/lib/expire-session";
import { SESSION_EXPIRED_EVENT } from "@/lib/session-expired";
import type { AdminUser } from "@/types/auth";

const CurrentUserContext = createContext<AdminUser | null>(null);

export function CurrentUserProvider({
  user,
  children,
}: {
  user: AdminUser | null;
  children: React.ReactNode;
}) {
  useEffect(() => {
    function onExpired() {
      void expireAdminSession();
    }
    window.addEventListener(SESSION_EXPIRED_EVENT, onExpired);
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, onExpired);
  }, []);

  return <CurrentUserContext.Provider value={user}>{children}</CurrentUserContext.Provider>;
}

export function useAdminDisplayName() {
  const user = useContext(CurrentUserContext);
  const name = user?.name?.trim();
  return name || "ادمین فروشگاه";
}

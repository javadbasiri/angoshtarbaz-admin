"use client";

import { createContext, useContext, useEffect } from "react";
import { adminDisplayName } from "@/lib/admin-display";
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
      void expireAdminSession().finally(() => {
        window.location.replace("/login");
      });
    }
    window.addEventListener(SESSION_EXPIRED_EVENT, onExpired);
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, onExpired);
  }, []);

  return <CurrentUserContext.Provider value={user}>{children}</CurrentUserContext.Provider>;
}

export function useAdminDisplayName() {
  const user = useContext(CurrentUserContext);
  return adminDisplayName(user);
}

"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

type ShellContextValue = {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  toggleSidebar: () => void;
};

const ShellContext = createContext<ShellContextValue | null>(null);

export function AdminShellProvider({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const toggleSidebar = useCallback(() => {
    setSidebarOpen((open) => !open);
  }, []);

  useEffect(() => {
    document.body.style.overflow = sidebarOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [sidebarOpen]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setSidebarOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const value = useMemo(
    () => ({ sidebarOpen, setSidebarOpen, toggleSidebar }),
    [sidebarOpen, toggleSidebar],
  );

  return <ShellContext.Provider value={value}>{children}</ShellContext.Provider>;
}

export function useAdminShell() {
  const context = useContext(ShellContext);
  if (!context) {
    throw new Error("useAdminShell must be used within AdminShellProvider");
  }
  return context;
}

"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { MenuIcon } from "@/components/admin/icons";
import { useAdminShell } from "@/components/admin/shell-context";

type AdminHeaderProps = {
  title: string;
  eyebrow?: string;
  userName?: string;
};

export function AdminHeader({
  title,
  eyebrow,
  userName = "ادمین فروشگاه",
}: AdminHeaderProps) {
  const { sidebarOpen, toggleSidebar, setSidebarOpen } = useAdminShell();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    function onClick(event: MouseEvent) {
      if (!menuRef.current?.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    setSidebarOpen(false);
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="admin-header">
      <div className="admin-header__start">
        <button
          type="button"
          className="menu-toggle"
          aria-label={sidebarOpen ? "بستن منو" : "باز کردن منو"}
          aria-expanded={sidebarOpen}
          aria-controls="sidebar"
          onClick={toggleSidebar}
        >
          <MenuIcon />
        </button>
        <div className="admin-header__titles">
          {eyebrow ? <p className="admin-header__eyebrow">{eyebrow}</p> : null}
          <h1 className="admin-header__title">{title}</h1>
        </div>
      </div>
      <div className="admin-header__end">
        <div className="user-menu" ref={menuRef}>
          <button
            type="button"
            className="user-chip"
            aria-label="منوی کاربر"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((open) => !open)}
          >
            <span className="user-chip__avatar" aria-hidden="true">
              ا
            </span>
            <span className="user-chip__name">{userName}</span>
          </button>
          {menuOpen ? (
            <div className="user-menu__dropdown" role="menu">
              <button type="button" onClick={logout} role="menuitem">
                خروج
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}

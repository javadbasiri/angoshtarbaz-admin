"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useAdminDisplayName } from "@/components/admin/current-user";
import { MenuIcon } from "@/components/admin/icons";
import { useAdminShell } from "@/components/admin/shell-context";
import { logoutAction } from "@/lib/auth-actions";
import { rethrowNextRedirect } from "@/lib/redirect-error";

export type AdminBreadcrumbItem = {
  href?: string;
  label: string;
};

type AdminHeaderProps = {
  title: string;
  eyebrow?: string;
  breadcrumb?: AdminBreadcrumbItem[];
  userName?: string;
};

export function AdminHeader({
  title,
  eyebrow,
  breadcrumb,
  userName,
}: AdminHeaderProps) {
  const sessionName = useAdminDisplayName();
  const displayName = userName || sessionName;
  const { sidebarOpen, toggleSidebar, setSidebarOpen } = useAdminShell();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

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
    setSidebarOpen(false);
    try {
      await logoutAction();
    } catch (error) {
      rethrowNextRedirect(error);
    }
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
          {breadcrumb && breadcrumb.length > 0 ? (
            <nav className="breadcrumb" aria-label="مسیر">
              {breadcrumb.map((item, index) => {
                const isLast = index === breadcrumb.length - 1;
                return (
                  <span key={`${item.label}-${index}`} style={{ display: "contents" }}>
                    {index > 0 ? (
                      <span className="breadcrumb__sep" aria-hidden="true">
                        /
                      </span>
                    ) : null}
                    {item.href && !isLast ? (
                      <Link href={item.href}>{item.label}</Link>
                    ) : (
                      <span className={isLast ? "breadcrumb__current" : undefined}>{item.label}</span>
                    )}
                  </span>
                );
              })}
            </nav>
          ) : eyebrow ? (
            <p className="admin-header__eyebrow">{eyebrow}</p>
          ) : null}
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
            <span className="user-chip__name">{displayName}</span>
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

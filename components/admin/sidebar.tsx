"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NavIcon } from "@/components/admin/icons";
import { useAdminShell } from "@/components/admin/shell-context";
import { ADMIN_NAV } from "@/lib/nav";

export function AdminSidebar() {
  const pathname = usePathname();
  const { sidebarOpen, setSidebarOpen } = useAdminShell();

  return (
    <aside
      className={`sidebar${sidebarOpen ? " is-open" : ""}`}
      id="sidebar"
      aria-label="ناوبری ادمین"
    >
      <div className="sidebar__brand">
        <Link href="/" className="sidebar__logo" onClick={() => setSidebarOpen(false)}>
          انگشترباز
        </Link>
        <span className="sidebar__badge">ادمین</span>
      </div>
      <nav className="sidebar__nav">
        <div className="sidebar__section-label">فروشگاه</div>
        {ADMIN_NAV.filter((item) => item.section === "store").map((item) => {
          if (item.soon || !item.href) {
            return (
              <span key={item.label} className="nav-item is-placeholder" aria-disabled="true">
                <NavIcon name={item.icon} />
                <span>{item.label}</span>
                <span className="nav-item__soon">به‌زودی</span>
              </span>
            );
          }

          const active =
            pathname === "/" ||
            pathname.startsWith("/dashboard") ||
            pathname.startsWith("/products") ||
            pathname.startsWith("/admin");

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`nav-item${active ? " is-active" : ""}`}
              aria-current={active ? "page" : undefined}
              onClick={() => setSidebarOpen(false)}
            >
              <NavIcon name={item.icon} />
              <span>{item.label}</span>
            </Link>
          );
        })}
        <div className="sidebar__section-label">سیستم</div>
        {ADMIN_NAV.filter((item) => item.section === "system").map((item) => (
          <span key={item.label} className="nav-item is-placeholder" aria-disabled="true">
            <NavIcon name={item.icon} />
            <span>{item.label}</span>
            <span className="nav-item__soon">به‌زودی</span>
          </span>
        ))}
      </nav>
      <div className="sidebar__footer">نسخه · ANG-A2</div>
    </aside>
  );
}

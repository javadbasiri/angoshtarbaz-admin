"use client";

import { AdminHeader, type AdminBreadcrumbItem } from "@/components/admin/header";
import { AdminSidebar } from "@/components/admin/sidebar";
import { AdminShellProvider, useAdminShell } from "@/components/admin/shell-context";

function Backdrop() {
  const { sidebarOpen, setSidebarOpen } = useAdminShell();
  return (
    <div
      className={`sidebar-backdrop${sidebarOpen ? " is-open" : ""}`}
      id="sidebarBackdrop"
      hidden={!sidebarOpen}
      onClick={() => setSidebarOpen(false)}
    />
  );
}

export function AdminShell({
  children,
  title,
  eyebrow,
  breadcrumb,
}: {
  children: React.ReactNode;
  title: string;
  eyebrow?: string;
  breadcrumb?: AdminBreadcrumbItem[];
}) {
  return (
    <AdminShellProvider>
      <div className="admin">
        <Backdrop />
        <AdminSidebar />
        <div className="admin-main">
          <AdminHeader title={title} eyebrow={eyebrow} breadcrumb={breadcrumb} />
          <main className="admin-content">{children}</main>
        </div>
      </div>
    </AdminShellProvider>
  );
}

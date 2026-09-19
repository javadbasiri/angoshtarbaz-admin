"use client";

import { AdminHeader } from "@/components/admin/header";
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
}: {
  children: React.ReactNode;
  title: string;
  eyebrow?: string;
}) {
  return (
    <AdminShellProvider>
      <div className="admin">
        <Backdrop />
        <AdminSidebar />
        <div className="admin-main">
          <AdminHeader title={title} eyebrow={eyebrow} />
          <main className="admin-content">{children}</main>
        </div>
      </div>
    </AdminShellProvider>
  );
}

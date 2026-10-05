import { CurrentUserProvider } from "@/components/admin/current-user";
import { ExpireSession } from "@/components/product/expire-session";
import { loadCurrentUser } from "@/lib/current-user";

export default async function ShellLayout({ children }: { children: React.ReactNode }) {
  const session = await loadCurrentUser();
  if (session.status === "unauthorized") {
    return <ExpireSession />;
  }
  return (
    <CurrentUserProvider user={session.status === "ready" ? session.user : null}>
      {children}
    </CurrentUserProvider>
  );
}

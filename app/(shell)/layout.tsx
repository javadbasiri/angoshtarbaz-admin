import { CurrentUserProvider } from "@/components/admin/current-user";
import { loadCurrentUser } from "@/lib/current-user";

export default async function ShellLayout({ children }: { children: React.ReactNode }) {
  const user = await loadCurrentUser();
  return <CurrentUserProvider user={user}>{children}</CurrentUserProvider>;
}

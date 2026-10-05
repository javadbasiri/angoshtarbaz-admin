const FALLBACK_DISPLAY_NAME = "ادمین فروشگاه";

type NamedAdmin = {
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
};

/** `firstName lastName`, then email, then the default shop-admin label. */
export function adminDisplayName(user: NamedAdmin | null | undefined): string {
  const fullName = [user?.firstName, user?.lastName]
    .map((part) => (typeof part === "string" ? part.trim() : ""))
    .filter(Boolean)
    .join(" ")
    .trim();
  if (fullName) return fullName;
  const email = typeof user?.email === "string" ? user.email.trim() : "";
  if (email) return email;
  return FALLBACK_DISPLAY_NAME;
}

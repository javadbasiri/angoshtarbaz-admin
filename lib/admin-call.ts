import { actionFail, type ActionResult } from "@/lib/action-result";
import { backendFetch, getSessionToken, messageFromBody } from "@/lib/backend";
import { clearSessionCookie } from "@/lib/session-cookie";

export type AdminCall =
  | { kind: "ok"; status: number; body: unknown }
  | { kind: "http"; status: number; body: unknown }
  | { kind: "unauthorized"; message: string }
  | { kind: "offline" };

/** Server-side Nest call with the httpOnly admin JWT. Never exposes the token. */
export async function callAdminBackend(path: string, init: RequestInit = {}): Promise<AdminCall> {
  const token = await getSessionToken();
  if (!token) {
    return { kind: "unauthorized", message: "نشست منقضی شده است." };
  }

  try {
    const { response, body } = await backendFetch(path, init, token);
    if (response.status === 401) {
      await clearSessionCookie();
      return {
        kind: "unauthorized",
        message: messageFromBody(body, "نشست منقضی شده است."),
      };
    }
    if (!response.ok) return { kind: "http", status: response.status, body };
    return { kind: "ok", status: response.status, body };
  } catch {
    return { kind: "offline" };
  }
}

export function adminCallToResult<T>(
  call: AdminCall,
  onOk: (body: unknown) => ActionResult<T>,
  fallbackMessage: string,
): ActionResult<T> {
  if (call.kind === "unauthorized") return actionFail(401, call.message);
  if (call.kind === "offline") return actionFail(502, "اتصال به بک‌اند برقرار نشد.");
  if (call.kind === "http") return actionFail(call.status, messageFromBody(call.body, fallbackMessage));
  return onOk(call.body);
}

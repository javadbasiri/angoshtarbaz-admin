"use client";

import { ApiError } from "@/lib/api";
import type { ActionResult } from "@/lib/action-result";
import { signalSessionExpired } from "@/lib/session-expired";

/** Turn a server-action result into data, or end the session on 401. */
export async function unwrapAction<T>(result: ActionResult<T>): Promise<T> {
  if (result.ok) return result.data;
  if (result.status === 401) signalSessionExpired();
  throw new ApiError(result.message, result.status);
}

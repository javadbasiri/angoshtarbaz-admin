export type ActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; status: number; message: string; code?: string; objectCount?: number };

export function actionOk<T>(data: T): ActionResult<T> {
  return { ok: true, data };
}

export function actionFail(
  status: number,
  message: string,
  extra?: { code?: string; objectCount?: number },
): ActionResult<never> {
  return {
    ok: false,
    status,
    message,
    ...(extra?.code ? { code: extra.code } : {}),
    ...(extra && extra.objectCount != null ? { objectCount: extra.objectCount } : {}),
  };
}

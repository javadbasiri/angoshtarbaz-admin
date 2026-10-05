export type ActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; status: number; message: string };

export function actionOk<T>(data: T): ActionResult<T> {
  return { ok: true, data };
}

export function actionFail(status: number, message: string): ActionResult<never> {
  return { ok: false, status, message };
}

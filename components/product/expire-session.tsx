"use client";

import { useEffect } from "react";
import { expireAdminSession } from "@/lib/expire-session";

export function ExpireSession() {
  useEffect(() => {
    void expireAdminSession();
  }, []);
  return null;
}

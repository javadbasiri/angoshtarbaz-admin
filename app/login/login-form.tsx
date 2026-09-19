"use client";

import { useRouter } from "next/navigation";
import type { FormEvent } from "react";

export function LoginForm() {
  const router = useRouter();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    router.push("/admin");
  }

  return (
    <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="email" className="text-sm font-medium text-primary">
          ایمیل
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="username"
          className="rounded-md border border-secondary px-3 py-2 text-sm outline-none focus:border-primary"
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="password" className="text-sm font-medium text-primary">
          رمز عبور
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          className="rounded-md border border-secondary px-3 py-2 text-sm outline-none focus:border-primary"
        />
      </div>
      <button
        type="submit"
        className="w-full rounded-md bg-primary px-3 py-2.5 text-sm text-canvas"
      >
        ورود
      </button>
    </form>
  );
}

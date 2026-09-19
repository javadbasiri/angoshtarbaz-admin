"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import { ApiError, apiFetch } from "@/lib/api";

const SEED_EMAIL = "admin@angoshtarbaz.local";
const SEED_PASSWORD = "admin123456";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState(SEED_EMAIL);
  const [password, setPassword] = useState(SEED_PASSWORD);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      await apiFetch({
        path: "/api/auth/login",
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      const next = searchParams.get("next") || "/";
      router.push(next);
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "ورود ناموفق بود.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form className="form-grid" onSubmit={handleSubmit}>
      {error ? (
        <div className="alert alert--error" role="alert">
          <div>
            <p className="alert__title">ورود انجام نشد</p>
            <p className="alert__body">{error}</p>
          </div>
        </div>
      ) : null}
      <div className="field">
        <label className="field__label" htmlFor="email">
          ایمیل
        </label>
        <input
          className="input"
          id="email"
          name="email"
          type="email"
          autoComplete="username"
          dir="ltr"
          style={{ textAlign: "left" }}
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />
      </div>
      <div className="field">
        <label className="field__label" htmlFor="password">
          رمز عبور
        </label>
        <input
          className="input"
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
        />
      </div>
      <button type="submit" className={`btn btn--primary${pending ? " is-loading" : ""}`} disabled={pending}>
        {pending ? <span className="btn__spinner" aria-hidden="true" /> : null}
        ورود
      </button>
    </form>
  );
}

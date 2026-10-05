import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  bodyPreview,
  extractToken,
  loginFailureMessage,
  missingTokenMessage,
  redactSecrets,
  unreachableBackendMessage,
} from "./login-response.ts";

const NEST_LOGIN = {
  access_token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxIn0.signaturevalue1",
  user: {
    id: "7",
    email: "admin@angoshtarbaz.local",
    firstName: "Admin",
    lastName: "User",
    role: "admin",
  },
};

describe("extractToken", () => {
  it("reads the Nest login shape", () => {
    assert.equal(extractToken(NEST_LOGIN), NEST_LOGIN.access_token);
  });

  it("accepts accessToken, token, and data.* variants", () => {
    assert.equal(extractToken({ accessToken: "aaa.bbb.ccc" }), "aaa.bbb.ccc");
    assert.equal(extractToken({ token: "plain-token" }), "plain-token");
    assert.equal(extractToken({ data: { access_token: "nested-snake" } }), "nested-snake");
    assert.equal(extractToken({ data: { accessToken: "nested-camel" } }), "nested-camel");
    assert.equal(extractToken({ data: { token: "nested-token" } }), "nested-token");
  });

  it("ignores empty and non-object bodies", () => {
    assert.equal(extractToken({ access_token: "" }), null);
    assert.equal(extractToken("<html>login</html>"), null);
    assert.equal(extractToken(null), null);
    assert.equal(extractToken({ user: { role: "admin" } }), null);
  });
});

describe("redactSecrets", () => {
  it("redacts JWTs and password values", () => {
    const jwt = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxIn0.signaturevalue1";
    const raw = `{"password":"admin123456","access_token":"${jwt}"}`;
    const redacted = redactSecrets(raw, "admin123456");
    assert.equal(redacted.includes("admin123456"), false);
    assert.equal(redacted.includes(jwt), false);
    assert.match(redacted, /\[jwt\]/);
    assert.match(redacted, /\[redacted\]/);
  });
});

describe("missing token diagnostics", () => {
  it("includes status, content-type, url, and a short body preview", () => {
    const body = `x${"y".repeat(200)}`;
    const message = missingTokenMessage({
      status: 200,
      contentType: "application/json",
      url: "http://localhost:3000/auth/login",
      body,
      apiOrigin: "http://localhost:3000",
      adminOrigin: "http://localhost:3001",
    });
    assert.match(message, /پاسخ ورود توکن JWT ندارد/);
    assert.match(message, /وضعیت HTTP 200/);
    assert.match(message, /application\/json/);
    assert.match(message, /http:\/\/localhost:3000\/auth\/login/);
    assert.ok(bodyPreview(body).length <= 120);
    assert.equal(message.includes("y".repeat(121)), false);
  });

  it("explains a text/html self-call", () => {
    const message = missingTokenMessage({
      status: 200,
      contentType: "text/html; charset=utf-8",
      url: "http://localhost:3001/login",
      body: "<!DOCTYPE html><html><body>password=admin123456</body></html>",
      apiOrigin: "http://localhost:3001",
      adminOrigin: "http://localhost:3001",
      password: "admin123456",
    });
    assert.match(message, /NEXT_PUBLIC_API_URL/);
    assert.match(message, /خودِ پنل ادمین/);
    assert.match(message, /http:\/\/localhost:3000/);
    assert.equal(message.includes("admin123456"), false);
  });

  it("explains when the API origin is the admin origin", () => {
    const message = loginFailureMessage({
      ok: true,
      status: 200,
      contentType: "application/json",
      url: "http://127.0.0.1:3001/auth/login",
      body: { message: "no token here" },
      apiOrigin: "http://127.0.0.1:3001",
      adminOrigin: "http://localhost:3001",
    });
    assert.ok(message);
    assert.match(message!, /باید نشانی Nest باشد/);
    assert.match(message!, /وضعیت HTTP 200/);
  });

  it("leaves a Nest credential error alone", () => {
    const message = loginFailureMessage({
      ok: false,
      status: 401,
      contentType: "application/json",
      url: "http://localhost:3000/auth/login",
      body: { message: "ایمیل یا رمز عبور نادرست است." },
      apiOrigin: "http://localhost:3000",
      adminOrigin: "http://localhost:3001",
    });
    assert.equal(message, null);
  });

  it("flags an HTML 404 from the admin server", () => {
    const message = loginFailureMessage({
      ok: false,
      status: 404,
      contentType: "text/html",
      url: "http://localhost:3001/auth/login",
      body: "<html>not found</html>",
      apiOrigin: "http://localhost:3001",
      adminOrigin: "http://localhost:3001",
    });
    assert.match(message!, /خودِ پنل ادمین/);
    assert.match(message!, /وضعیت HTTP 404/);
  });
});

describe("unreachableBackendMessage", () => {
  it("names the URL and NEXT_PUBLIC_API_URL", () => {
    const message = unreachableBackendMessage("http://localhost:3000/auth/login");
    assert.match(message, /بک‌اند در http:\/\/localhost:3000\/auth\/login در دسترس نیست/);
    assert.match(message, /NEXT_PUBLIC_API_URL/);
  });
});

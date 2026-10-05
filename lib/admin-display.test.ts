import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { adminDisplayName } from "./admin-display.ts";

describe("adminDisplayName", () => {
  it("joins first and last name and trims the parts", () => {
    assert.equal(
      adminDisplayName({ firstName: "  سارا ", lastName: " احمدی  ", email: "a@b.c" }),
      "سارا احمدی",
    );
    assert.equal(adminDisplayName({ firstName: "سارا", lastName: "" }), "سارا");
    assert.equal(adminDisplayName({ firstName: "", lastName: "احمدی" }), "احمدی");
  });

  it("falls back to email, then the default label", () => {
    assert.equal(
      adminDisplayName({ firstName: "  ", lastName: "", email: " admin@angoshtarbaz.local " }),
      "admin@angoshtarbaz.local",
    );
    assert.equal(adminDisplayName({ email: "   " }), "ادمین فروشگاه");
    assert.equal(adminDisplayName(null), "ادمین فروشگاه");
    assert.equal(adminDisplayName(undefined), "ادمین فروشگاه");
  });
});

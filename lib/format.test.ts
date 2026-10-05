import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { formatIrrAsToman, formatTomanDisplay, irrToToman } from "./format.ts";

describe("formatIrrAsToman", () => {
  it("converts IRR to grouped Persian toman", () => {
    assert.equal(irrToToman(1_280_000_000), 128_000_000);
    assert.equal(formatTomanDisplay(128_000_000), "۱۲۸٬۰۰۰٬۰۰۰");
    assert.equal(formatIrrAsToman(1_280_000_000), "۱۲۸٬۰۰۰٬۰۰۰ تومان");
  });

  it("keeps a non-round thousand group", () => {
    assert.equal(formatIrrAsToman(865_000_000), "۸۶٬۵۰۰٬۰۰۰ تومان");
  });

  it("formats zero and non-finite values", () => {
    assert.equal(formatIrrAsToman(0), "۰ تومان");
    assert.equal(formatIrrAsToman(Number.NaN), "۰ تومان");
  });
});

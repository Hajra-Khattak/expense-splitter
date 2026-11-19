import { describe, expect, it } from "vitest";
import { getMemberBalance } from "../src/utils/memberBalance";

const dinner = { paidBy: "A", amountMinor: 300, splits: { A: 100, B: 100, C: 100 } };

describe("getMemberBalance", () => {
  it("is 0 for everyone when there are no expenses", () => {
    expect(getMemberBalance("A", [], [])).toBe(0);
  });

  it("gives the payer a positive balance and the others a negative one", () => {
    expect(getMemberBalance("A", [dinner], [])).toBe(200);
    expect(getMemberBalance("B", [dinner], [])).toBe(-100);
  });

  it("is 0 after the debt is settled", () => {
    const settlement = { from: "B", to: "A", amountMinor: 100 };
    expect(getMemberBalance("B", [dinner], [settlement])).toBe(0);
    expect(getMemberBalance("A", [dinner], [settlement])).toBe(100);
  });

  it("ignores people who are not in any expense", () => {
    expect(getMemberBalance("Z", [dinner], [])).toBe(0);
  });
});
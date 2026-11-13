import { describe, it, expect } from "vitest";
import { splitEqual } from "../splits";

describe("splitEqual", () => {
  it("splits 1000 among 3 as 334, 333, 333", () => {
    const result = splitEqual(1000, ["a", "b", "c"]);
    expect(result.map((s) => s.amount)).toEqual([334, 333, 333]);
  });

  it("always sums exactly to the total", () => {
    const result = splitEqual(1001, ["a", "b", "c", "d"]);
    const sum = result.reduce((acc, s) => acc + s.amount, 0);
    expect(sum).toBe(1001);
  });

  it("handles two people", () => {
    const result = splitEqual(900, ["a", "b"]);
    expect(result.map((s) => s.amount)).toEqual([450, 450]);
  });
});
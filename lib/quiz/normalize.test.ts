import { describe, it, expect } from "vitest";
import { normalize } from "./normalize";

describe("normalize", () => {
  it("lowercases, strips accents, trims and collapses spaces", () => {
    expect(normalize("  Bogotá ")).toBe("bogota");
    expect(normalize("El   Ñandú")).toBe("el nandu");
    expect(normalize("CAFÉ")).toBe("cafe");
  });
  it("is idempotent", () => {
    expect(normalize(normalize("Perú "))).toBe("peru");
  });
});

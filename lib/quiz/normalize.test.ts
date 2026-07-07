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
  it("strips punctuation and symbols so abbreviations match", () => {
    expect(normalize("E.E.U.U.")).toBe("eeuu");
    expect(normalize("D.C.A.")).toBe("dca");
    expect(normalize("¡Bogotá!")).toBe("bogota");
    expect(normalize("$100")).toBe("100");
    expect(normalize("100%")).toBe("100");
  });
});

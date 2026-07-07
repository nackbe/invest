import { describe, it, expect } from "vitest";
import { formatCOP, formatCOPShort } from "./format";

describe("formatCOP — es-CO, sin decimales, redondeado (§2)", () => {
  it("formats pesos with no fraction digits", () => {
    const s = formatCOP(1234567);
    expect(s).toContain("1.234.567"); // separador de miles es-CO
    expect(s).not.toContain(","); // sin decimales
  });

  it("rounds to the nearest peso (§13)", () => {
    expect(formatCOP(1000.4)).toBe(formatCOP(1000));
    expect(formatCOP(1000.6)).toBe(formatCOP(1001));
  });

  it("handles zero and negatives", () => {
    expect(formatCOP(0)).toContain("0");
    expect(formatCOP(-500)).toContain("500");
  });
});

describe("formatCOPShort — números gigantes legibles (§5)", () => {
  it("abbreviates millions", () => {
    expect(formatCOPShort(1_500_000)).toBe("$1,5 M");
    expect(formatCOPShort(12_000_000)).toBe("$12 M");
  });

  it("abbreviates thousands below a million", () => {
    expect(formatCOPShort(250_000)).toBe("$250 K");
  });

  it("abbreviates billions (mil millones)", () => {
    expect(formatCOPShort(2_300_000_000)).toBe("$2,3 MM");
  });

  it("keeps small numbers plain", () => {
    expect(formatCOPShort(500)).toBe("$500");
  });
});

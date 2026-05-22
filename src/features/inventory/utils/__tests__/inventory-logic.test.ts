import { describe, it, expect } from "vitest";
import { 
  calculateSellPrice, 
  calculateMargin, 
  detectCSVDelimiter, 
  parseCSVLine,
  checkDeleteIntegrity,
  normalizeTaxonomyName,
  calculateSimilarity,
  matchTaxonomyItem,
} from "../inventory-utils";

describe("Inventory Domain Math Tests", () => {
  it("calculates sell price correctly based on cost and margin", () => {
    expect(calculateSellPrice(100, 35)).toBe(135.00);
    expect(calculateSellPrice(50, 50)).toBe(75.00);
    expect(calculateSellPrice(1243.50, 42)).toBe(1765.77);
  });

  it("handles negative cost or margins safely returning 0", () => {
    expect(calculateSellPrice(-100, 35)).toBe(0);
    expect(calculateSellPrice(100, -35)).toBe(0);
  });

  it("calculates margin percentage correctly from cost and sell price", () => {
    expect(calculateMargin(100, 135)).toBe(35);
    expect(calculateMargin(50, 75)).toBe(50);
    expect(calculateMargin(100, 200)).toBe(100);
  });

  it("returns 0 margin when sell price is equal to or less than cost", () => {
    expect(calculateMargin(100, 100)).toBe(0);
    expect(calculateMargin(100, 90)).toBe(0);
  });
});

describe("CSV Delimiter Autodetection", () => {
  it("detects semicolon delimiter when it outnumbers commas", () => {
    const csvHeader = "codigo_fabricante;descripcion;precio_costo;stock";
    expect(detectCSVDelimiter(csvHeader)).toBe(";");
  });

  it("detects comma delimiter when it outnumbers semicolons", () => {
    const csvHeader = "codigo_fabricante,descripcion,precio_costo,stock";
    expect(detectCSVDelimiter(csvHeader)).toBe(",");
  });
});

describe("CSV Line Parsing with Quoted Fields", () => {
  it("parses normal unquoted fields correctly", () => {
    const csvLine = "H-4001,Filtro de Aceite,3500,20";
    expect(parseCSVLine(csvLine, ",")).toEqual([
      "H-4001",
      "Filtro de Aceite",
      "3500",
      "20"
    ]);
  });

  it("ignores delimiters inside quoted text fields", () => {
    const csvLine = 'H-4001,"Filtro de Aceite, Renault Logan",3500,20';
    expect(parseCSVLine(csvLine, ",")).toEqual([
      "H-4001",
      "Filtro de Aceite, Renault Logan",
      "3500",
      "20"
    ]);
  });

  it("handles semicolon delimiters accurately", () => {
    const csvLine = 'H-4001;"Filtro; Renault";3500;20';
    expect(parseCSVLine(csvLine, ";")).toEqual([
      "H-4001",
      "Filtro; Renault",
      "3500",
      "20"
    ]);
  });
});

describe("Referential Integrity Shield Blockers", () => {
  it("returns null if dependency count is zero or negative", () => {
    expect(checkDeleteIntegrity("family", "Frenos", 0)).toBeNull();
    expect(checkDeleteIntegrity("brand", "Bosch", -1)).toBeNull();
  });

  it("blocks family deletion with active articles", () => {
    const warning = checkDeleteIntegrity("family", "Frenos", 5);
    expect(warning).not.toBeNull();
    expect(warning?.title).toContain("Acción Bloqueada");
    expect(warning?.description).toContain('familia "Frenos"');
    expect(warning?.details).toContain("5 artículo(s)");
  });

  it("blocks brand deletion with active articles", () => {
    const warning = checkDeleteIntegrity("brand", "Bosch", 12);
    expect(warning).not.toBeNull();
    expect(warning?.title).toContain("Acción Bloqueada");
    expect(warning?.description).toContain('marca "Bosch"');
    expect(warning?.details).toContain("12 artículo(s)");
  });

  it("blocks auto brand deletion with active models", () => {
    const warning = checkDeleteIntegrity("auto_brand", "Chevrolet", 3);
    expect(warning).not.toBeNull();
    expect(warning?.title).toContain("Acción Bloqueada");
    expect(warning?.description).toContain('Chevrolet');
    expect(warning?.details).toContain("3 modelo(s)");
  });

  it("blocks auto model deletion with active versions", () => {
    const warning = checkDeleteIntegrity("auto_model", "Onix", 4);
    expect(warning).not.toBeNull();
    expect(warning?.title).toContain("Acción Bloqueada");
    expect(warning?.description).toContain('Onix');
    expect(warning?.details).toContain("4 versión(es)");
  });

  it("blocks auto version deletion with active article compatibilities", () => {
    const warning = checkDeleteIntegrity("auto_version", "1.4 Active", 8);
    expect(warning).not.toBeNull();
    expect(warning?.title).toContain("Acción Bloqueada");
    expect(warning?.description).toContain('1.4 Active');
    expect(warning?.details).toContain("8 repuesto(s)");
  });
});

describe("Taxonomy Resolver & Fuzzy Matcher (TDD)", () => {
  describe("normalizeTaxonomyName", () => {
    it("converts to lowercase, trims whitespace and removes organizational suffixes", () => {
      expect(normalizeTaxonomyName("  BOSCH S.A.  ")).toBe("bosch");
      expect(normalizeTaxonomyName("Gates S.R.L.")).toBe("gates");
      expect(normalizeTaxonomyName("Monroe LTD.")).toBe("monroe");
      expect(normalizeTaxonomyName("BATERÍAS DEL SUR")).toBe("baterias del sur");
    });
  });

  describe("calculateSimilarity (Levenshtein)", () => {
    it("calculates exact similarity correctly", () => {
      expect(calculateSimilarity("bosch", "bosch")).toBe(1.0);
      expect(calculateSimilarity("gates", "gates")).toBe(1.0);
    });

    it("calculates partial similarity correctly", () => {
      expect(calculateSimilarity("bosch", "bosc")).toBe(0.8);
      expect(calculateSimilarity("gates", "gats")).toBe(0.8);
    });
  });

  describe("matchTaxonomyItem", () => {
    const existingBrands = [
      { id: "1", nombre: "Bosch" },
      { id: "2", nombre: "Valeo" },
      { id: "3", nombre: "TRW" }
    ];

    it("matches exact name regardless of capitalization or suffix", () => {
      const match = matchTaxonomyItem("BOSCH S.A.", existingBrands);
      expect(match.bestMatch?.nombre).toBe("Bosch");
      expect(match.confidence).toBe(1.0);
    });

    it("matches fuzzy name when confidence exceeds threshold", () => {
      const match = matchTaxonomyItem("Bosc", existingBrands);
      expect(match.bestMatch?.nombre).toBe("Bosch");
      expect(match.confidence).toBe(0.8);
    });

    it("requires exact match for short names <= 3 characters to prevent false positives", () => {
      const match = matchTaxonomyItem("TWM", existingBrands);
      expect(match.bestMatch).toBeNull();
      expect(match.confidence).toBe(0);
    });
  });
});


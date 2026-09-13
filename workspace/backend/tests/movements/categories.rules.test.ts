import { describe, expect, it } from "vitest";
import {
  normalizeCategoryText,
  pickCategorySuggestion,
  type CategorySuggestionRule,
} from "../../src/modules/movements/categories.service.js";

const rules: CategorySuggestionRule[] = [
  {
    categoryId: "cat-super",
    categoryName: "Supermercado",
    categoryColor: "#10b981",
    categoryIcon: "shopping-cart",
    keyword: "supermercado",
    normalizedKeyword: "supermercado",
    priority: 100,
  },
  {
    categoryId: "cat-carrefour",
    categoryName: "Compras Carrefour",
    categoryColor: "#2563eb",
    categoryIcon: "shopping-bag",
    keyword: "Carrefour Market",
    normalizedKeyword: "carrefour market",
    priority: 100,
  },
  {
    categoryId: "cat-income",
    categoryName: "Ingresos",
    categoryColor: "#059669",
    categoryIcon: "banknote",
    keyword: "acreditación de haberes",
    normalizedKeyword: "acreditacion de haberes",
    priority: 50,
  },
];

describe("category rules", () => {
  it("normalizes accents, punctuation and casing deterministically", () => {
    expect(normalizeCategoryText("  ACREDITACIÓN---de Haberes  ")).toBe(
      "acreditacion de haberes",
    );
  });

  it("prefers the lowest numeric priority", () => {
    const suggestion = pickCategorySuggestion(rules, {
      description: "Acreditación de haberes - supermercado",
      reference: null,
      sourceType: "debit_csv",
    });
    expect(suggestion?.id).toBe("cat-income");
  });

  it("uses the longest keyword when priority is equal", () => {
    const suggestion = pickCategorySuggestion(rules, {
      description: "Compra CARREFOUR MARKET Yerba Buena",
      reference: null,
      sourceType: "debit_csv",
    });
    expect(suggestion?.id).toBe("cat-carrefour");
    expect(suggestion?.matchedKeyword).toBe("Carrefour Market");
  });

  it("returns null when there is no rule match", () => {
    expect(
      pickCategorySuggestion(rules, {
        description: "Movimiento sin coincidencia",
        reference: "123",
        sourceType: "debit_csv",
      }),
    ).toBeNull();
  });
});

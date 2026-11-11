import { isForeignKeyViolation } from "../../src/database/foreign-key-violation";

describe("isForeignKeyViolation", () => {
  test('retorna true para um erro com code "23503"', () => {
    expect(isForeignKeyViolation({ code: "23503" })).toBe(true);
  });

  const naoReconhecidos: Array<[string, unknown]> = [
    ["null", null],
    ["undefined", undefined],
    ['string "23505"', "23505"],
    ["número 23503 (sem propriedade code)", 23503],
    ["objeto vazio", {}],
    ['objeto com code "outro"', { code: "outro" }],
  ];

  test.each(naoReconhecidos)("retorna false para %s", (_cenario, error) => {
    expect(isForeignKeyViolation(error)).toBe(false);
  });
});

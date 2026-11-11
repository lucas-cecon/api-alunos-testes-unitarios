import { isUniqueViolation } from "../../src/database/unique-violation";

describe("isUniqueViolation", () => {
  test('retorna true para um erro com code "23505"', () => {
    expect(isUniqueViolation({ code: "23505" })).toBe(true);
  });

  const naoReconhecidos: Array<[string, unknown]> = [
    ["null", null],
    ["undefined", undefined],
    ['string "23505" (sem propriedade code)', "23505"],
    ["número 23503", 23503],
    ["objeto vazio", {}],
    ['objeto com code "outro"', { code: "outro" }],
  ];

  test.each(naoReconhecidos)("retorna false para %s", (_cenario, error) => {
    expect(isUniqueViolation(error)).toBe(false);
  });
});

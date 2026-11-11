import { HttpError } from "../src/errors";
import {
  parseId,
  positiveInteger,
  validateBody,
  validateName,
} from "../src/validation";

// Executa a função e garante que ela lança um HttpError com status 400.
function expectBadRequest(action: () => unknown): void {
  let thrown: unknown;
  try {
    action();
  } catch (error) {
    thrown = error;
  }
  expect(thrown).toBeInstanceOf(HttpError);
  expect((thrown as HttpError).statusCode).toBe(400);
}

describe("positiveInteger", () => {
  test.each([
    ["limite inferior (1)", 1],
    ["limite superior (2147483647)", 2147483647],
  ])("aceita %s e retorna o próprio número", (_cenario, value) => {
    expect(positiveInteger(value, "RA")).toBe(value);
  });

  const invalidos: Array<[string, unknown]> = [
    ["0", 0],
    ["-1", -1],
    ["1.5", 1.5],
    ["NaN", NaN],
    ["Infinity", Infinity],
    ["2147483648", 2147483648],
    ['string numérica "123"', "123"],
    ["null", null],
    ["undefined", undefined],
  ];

  test.each(invalidos)("rejeita %s com HttpError 400", (_cenario, value) => {
    expectBadRequest(() => positiveInteger(value, "RA"));
  });
});

describe("parseId", () => {
  test.each([
    ["1", 1],
    ["2147483647", 2147483647],
  ])('converte a string "%s" para o número %d', (value, esperado) => {
    expect(parseId(value, "RA")).toBe(esperado);
  });

  const invalidos: Array<[string, unknown]> = [
    ['"1abc" (conversão parcial)', "1abc"],
    ['"1.2" (decimal)', "1.2"],
    ['"1e2" (notação exponencial)', "1e2"],
    ["string vazia", ""],
    ['"-1" (negativo)', "-1"],
    ['"0" (zero)', "0"],
    ['"2147483648" (acima do limite)', "2147483648"],
    ["número 123 (não é string)", 123],
  ];

  test.each(invalidos)("rejeita %s com HttpError 400", (_cenario, value) => {
    expectBadRequest(() => parseId(value, "RA"));
  });
});

describe("validateName", () => {
  test.each([
    ['"Ana"', "Ana"],
    ["100 letras 'a' (limite máximo)", "a".repeat(100)],
  ])("aceita %s e retorna o nome recebido", (_cenario, value) => {
    expect(validateName(value)).toBe(value);
  });

  const invalidos: Array<[string, unknown]> = [
    ["string vazia", ""],
    ['"ab" (curto demais)', "ab"],
    ["apenas espaços", "   "],
    ['" a " (espaços não completam o mínimo)', " a "],
    ["101 letras 'a' (acima do limite)", "a".repeat(101)],
    ["número 123", 123],
    ["null", null],
    ["undefined", undefined],
  ];

  test.each(invalidos)("rejeita %s com HttpError 400", (_cenario, value) => {
    expectBadRequest(() => validateName(value));
  });
});

describe("validateBody", () => {
  test("retorna a mesma referência de um objeto congelado, sem modificá-lo", () => {
    const body = Object.freeze({ name: "Ana" });

    const result = validateBody(body);

    expect(result).toBe(body);
    expect(body).toEqual({ name: "Ana" });
    expect(Object.isFrozen(body)).toBe(true);
  });

  const invalidos: Array<[string, unknown]> = [
    ["null", null],
    ["undefined", undefined],
    ["array vazio", []],
    ['string "Ana"', "Ana"],
    ["número 12", 12],
  ];

  test.each(invalidos)("rejeita %s com HttpError 400", (_cenario, value) => {
    expectBadRequest(() => validateBody(value));
  });

  test("aceita campos extras e retorna a mesma referência sem alterar o objeto", () => {
    const body = { name: "Ana", extra: true };

    const result = validateBody(body);

    expect(result).toBe(body);
    expect(body).toEqual({ name: "Ana", extra: true });
  });
});

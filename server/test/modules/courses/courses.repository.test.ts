import type { Database } from "../../../src/database/connection";
import { PgCourseRepository } from "../../../src/modules/courses/courses.repository";

// Remove diferenças de espaços e quebras de linha antes de comparar o SQL.
function normalizeSql(sql: string): string {
  return sql.replace(/\s+/g, " ").trim();
}

describe("PgCourseRepository", () => {
  let query: jest.Mock;
  let repository: PgCourseRepository;

  beforeEach(() => {
    query = jest.fn();
    const db: Database = { query };
    repository = new PgCourseRepository(db);
  });

  afterEach(() => {
    jest.resetAllMocks();
    jest.restoreAllMocks();
  });

  test("create insere a disciplina, retorna a linha e envia o nome como parâmetro", async () => {
    const row = { id: 7, name: "Qualidade" };
    query.mockResolvedValue({ rows: [row] });

    const result = await repository.create({ name: "Qualidade" });

    expect(result).toEqual(row);
    expect(query).toHaveBeenCalledTimes(1);
    const [sql, params] = query.mock.calls[0];
    expect(normalizeSql(sql)).toContain(
      "INSERT INTO courses (name) VALUES ($1)",
    );
    expect(normalizeSql(sql)).toContain("RETURNING id, name");
    expect(params).toEqual(["Qualidade"]);
  });

  test("findAll retorna as linhas ordenadas por id, sem array de parâmetros", async () => {
    const rows = [
      { id: 1, name: "Banco de Dados" },
      { id: 2, name: "Qualidade" },
    ];
    query.mockResolvedValue({ rows });

    const result = await repository.findAll();

    expect(result).toEqual(rows);
    expect(query).toHaveBeenCalledTimes(1);
    const [sql, params] = query.mock.calls[0];
    expect(normalizeSql(sql)).toContain("SELECT id, name FROM courses");
    expect(normalizeSql(sql)).toContain("ORDER BY id");
    expect(params).toBeUndefined();
    expect(query.mock.calls[0]).toHaveLength(1);
  });

  test("findAll retorna lista vazia quando rows é []", async () => {
    query.mockResolvedValue({ rows: [] });

    await expect(repository.findAll()).resolves.toEqual([]);
  });

  test("findOne retorna a primeira linha, filtra por id = $1 e envia [7]", async () => {
    const row = { id: 7, name: "Qualidade" };
    query.mockResolvedValue({ rows: [row, { id: 8, name: "Outra" }] });

    const result = await repository.findOne(7);

    expect(result).toEqual(row);
    expect(query).toHaveBeenCalledTimes(1);
    const [sql, params] = query.mock.calls[0];
    expect(normalizeSql(sql)).toContain("SELECT id, name FROM courses");
    expect(normalizeSql(sql)).toContain("WHERE id = $1");
    expect(params).toEqual([7]);
  });

  test("findOne retorna undefined quando rows é []", async () => {
    query.mockResolvedValue({ rows: [] });

    await expect(repository.findOne(7)).resolves.toBeUndefined();
  });

  test("create propaga a mesma instância de Error rejeitada por query", async () => {
    const failure = new Error("falha do banco em create");
    query.mockRejectedValue(failure);

    await expect(repository.create({ name: "Qualidade" })).rejects.toBe(failure);
  });

  test("findAll propaga a mesma instância de Error rejeitada por query", async () => {
    const failure = new Error("falha do banco em findAll");
    query.mockRejectedValue(failure);

    await expect(repository.findAll()).rejects.toBe(failure);
  });

  test("findOne propaga a mesma instância de Error rejeitada por query", async () => {
    const failure = new Error("falha do banco em findOne");
    query.mockRejectedValue(failure);

    await expect(repository.findOne(7)).rejects.toBe(failure);
  });
});

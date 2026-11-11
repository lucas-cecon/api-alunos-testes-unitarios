import type { Database } from "../../../src/database/connection";
import { PgStudentRepository } from "../../../src/modules/students/students.repository";

function normalizeSql(sql: string): string {
  return sql.replace(/\s+/g, " ").trim();
}

describe("PgStudentRepository", () => {
  let query: jest.Mock;
  let repository: PgStudentRepository;

  beforeEach(() => {
    query = jest.fn();
    const db: Database = { query };
    repository = new PgStudentRepository(db);
  });

  afterEach(() => {
    jest.resetAllMocks();
    jest.restoreAllMocks();
  });

  test("create insere o aluno, retorna a linha e envia [ra, name] como parâmetros", async () => {
    const row = { ra: 123, name: "Ana" };
    query.mockResolvedValue({ rows: [row] });

    const result = await repository.create({ ra: 123, name: "Ana" });

    expect(result).toEqual(row);
    expect(query).toHaveBeenCalledTimes(1);
    const [sql, params] = query.mock.calls[0];
    expect(normalizeSql(sql)).toContain(
      "INSERT INTO students (ra, name) VALUES ($1, $2)",
    );
    expect(normalizeSql(sql)).toContain("RETURNING ra, name");
    expect(params).toEqual([123, "Ana"]);
  });

  test("findAll retorna as linhas ordenadas por name, sem array de parâmetros", async () => {
    const rows = [
      { ra: 123, name: "Ana" },
      { ra: 456, name: "Bruno" },
    ];
    query.mockResolvedValue({ rows });

    const result = await repository.findAll();

    expect(result).toEqual(rows);
    expect(query).toHaveBeenCalledTimes(1);
    const [sql, params] = query.mock.calls[0];
    expect(normalizeSql(sql)).toContain("SELECT ra, name FROM students");
    expect(normalizeSql(sql)).toContain("ORDER BY name");
    expect(params).toBeUndefined();
    expect(query.mock.calls[0]).toHaveLength(1);
  });

  test("findAll retorna lista vazia quando rows é []", async () => {
    query.mockResolvedValue({ rows: [] });

    await expect(repository.findAll()).resolves.toEqual([]);
  });

  test("findOne retorna a primeira linha, filtra por ra = $1 e envia [123]", async () => {
    const row = { ra: 123, name: "Ana" };
    query.mockResolvedValue({ rows: [row, { ra: 456, name: "Bruno" }] });

    const result = await repository.findOne(123);

    expect(result).toEqual(row);
    expect(query).toHaveBeenCalledTimes(1);
    const [sql, params] = query.mock.calls[0];
    expect(normalizeSql(sql)).toContain("SELECT ra, name FROM students");
    expect(normalizeSql(sql)).toContain("WHERE ra = $1");
    expect(params).toEqual([123]);
  });

  test("findOne retorna undefined quando rows é []", async () => {
    query.mockResolvedValue({ rows: [] });

    await expect(repository.findOne(123)).resolves.toBeUndefined();
  });

  test("create propaga a mesma instância de Error rejeitada por query", async () => {
    const failure = new Error("falha do banco em create");
    query.mockRejectedValue(failure);

    await expect(repository.create({ ra: 123, name: "Ana" })).rejects.toBe(
      failure,
    );
  });

  test("findAll propaga a mesma instância de Error rejeitada por query", async () => {
    const failure = new Error("falha do banco em findAll");
    query.mockRejectedValue(failure);

    await expect(repository.findAll()).rejects.toBe(failure);
  });

  test("findOne propaga a mesma instância de Error rejeitada por query", async () => {
    const failure = new Error("falha do banco em findOne");
    query.mockRejectedValue(failure);

    await expect(repository.findOne(123)).rejects.toBe(failure);
  });
});

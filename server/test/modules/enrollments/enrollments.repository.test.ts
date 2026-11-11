import type { Database } from "../../../src/database/connection";
import { PgEnrollmentRepository } from "../../../src/modules/enrollments/enrollments.repository";

const ENROLLED_AT = new Date("2026-01-15T10:00:00.000Z");

// Aliases que mantêm os nomes das colunas em camelCase no resultado.
const ALIASES = [
  'student_ra AS "studentRa"',
  'course_id AS "courseId"',
  'enrolled_at AS "enrolledAt"',
];

function normalizeSql(sql: string): string {
  return sql.replace(/\s+/g, " ").trim();
}

describe("PgEnrollmentRepository", () => {
  let query: jest.Mock;
  let repository: PgEnrollmentRepository;

  beforeEach(() => {
    query = jest.fn();
    const db: Database = { query };
    repository = new PgEnrollmentRepository(db);
  });

  afterEach(() => {
    jest.resetAllMocks();
    jest.restoreAllMocks();
  });

  test("create insere a matrícula, retorna a linha em camelCase e envia [123, 7]", async () => {
    const row = { studentRa: 123, courseId: 7, enrolledAt: ENROLLED_AT };
    query.mockResolvedValue({ rows: [row] });

    const result = await repository.create(123, 7);

    expect(result).toEqual(row);
    expect(result.enrolledAt).toBe(ENROLLED_AT);
    expect(query).toHaveBeenCalledTimes(1);
    const [sql, params] = query.mock.calls[0];
    const normalized = normalizeSql(sql);
    expect(normalized).toContain(
      "INSERT INTO enrollments (student_ra, course_id) VALUES ($1, $2)",
    );
    expect(normalized).toContain("RETURNING");
    for (const alias of ALIASES) {
      expect(normalized).toContain(alias);
    }
    expect(params).toEqual([123, 7]);
  });

  test("findAll retorna as linhas ordenadas por student_ra, course_id, sem array de parâmetros", async () => {
    const rows = [
      { studentRa: 123, courseId: 1, enrolledAt: ENROLLED_AT },
      { studentRa: 123, courseId: 7, enrolledAt: ENROLLED_AT },
    ];
    query.mockResolvedValue({ rows });

    const result = await repository.findAll();

    expect(result).toEqual(rows);
    expect(query).toHaveBeenCalledTimes(1);
    const [sql, params] = query.mock.calls[0];
    const normalized = normalizeSql(sql);
    expect(normalized).toContain("FROM enrollments");
    expect(normalized).toContain("ORDER BY student_ra, course_id");
    for (const alias of ALIASES) {
      expect(normalized).toContain(alias);
    }
    expect(params).toBeUndefined();
    expect(query.mock.calls[0]).toHaveLength(1);
  });

  test("findAll retorna lista vazia quando rows é []", async () => {
    query.mockResolvedValue({ rows: [] });

    await expect(repository.findAll()).resolves.toEqual([]);
  });

  test("findOne retorna a primeira linha, filtra por student_ra e course_id e envia [123, 7]", async () => {
    const row = { studentRa: 123, courseId: 7, enrolledAt: ENROLLED_AT };
    query.mockResolvedValue({
      rows: [row, { studentRa: 999, courseId: 9, enrolledAt: ENROLLED_AT }],
    });

    const result = await repository.findOne(123, 7);

    expect(result).toEqual(row);
    expect(query).toHaveBeenCalledTimes(1);
    const [sql, params] = query.mock.calls[0];
    const normalized = normalizeSql(sql);
    expect(normalized).toContain("FROM enrollments");
    expect(normalized).toContain("WHERE student_ra = $1 AND course_id = $2");
    for (const alias of ALIASES) {
      expect(normalized).toContain(alias);
    }
    expect(params).toEqual([123, 7]);
  });

  test("findOne retorna undefined quando rows é []", async () => {
    query.mockResolvedValue({ rows: [] });

    await expect(repository.findOne(123, 7)).resolves.toBeUndefined();
  });

  test("create propaga a mesma instância de Error rejeitada por query", async () => {
    const failure = new Error("falha do banco em create");
    query.mockRejectedValue(failure);

    await expect(repository.create(123, 7)).rejects.toBe(failure);
  });

  test("findAll propaga a mesma instância de Error rejeitada por query", async () => {
    const failure = new Error("falha do banco em findAll");
    query.mockRejectedValue(failure);

    await expect(repository.findAll()).rejects.toBe(failure);
  });

  test("findOne propaga a mesma instância de Error rejeitada por query", async () => {
    const failure = new Error("falha do banco em findOne");
    query.mockRejectedValue(failure);

    await expect(repository.findOne(123, 7)).rejects.toBe(failure);
  });
});

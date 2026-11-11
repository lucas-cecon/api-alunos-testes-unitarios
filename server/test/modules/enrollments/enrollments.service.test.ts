import { HttpError } from "../../../src/errors";
import type {
  Enrollment,
  EnrollmentRepository,
} from "../../../src/modules/enrollments/enrollments.repository";
import { EnrollmentsService } from "../../../src/modules/enrollments/enrollments.service";

// Data fixa para que os testes sejam reproduzíveis.
const ENROLLED_AT = new Date("2026-01-15T10:00:00.000Z");

function createEnrollment(studentRa = 123, courseId = 1): Enrollment {
  return { studentRa, courseId, enrolledAt: ENROLLED_AT };
}

function createRepositoryMock(): jest.Mocked<EnrollmentRepository> {
  return {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
  };
}

async function expectHttpError(
  promise: Promise<unknown>,
  statusCode: number,
): Promise<void> {
  await expect(promise).rejects.toBeInstanceOf(HttpError);
  await expect(promise).rejects.toMatchObject({ statusCode });
}

describe("EnrollmentsService", () => {
  let repository: jest.Mocked<EnrollmentRepository>;
  let service: EnrollmentsService;

  beforeEach(() => {
    repository = createRepositoryMock();
    service = new EnrollmentsService(repository);
  });

  afterEach(() => {
    jest.resetAllMocks();
    jest.restoreAllMocks();
  });

  describe("create", () => {
    test("cria uma matrícula válida e encaminha 123 e 1, nessa ordem, ao repositório", async () => {
      const created = createEnrollment(123, 1);
      repository.create.mockResolvedValue(created);

      const result = await service.create({ studentRa: 123, courseId: 1 });

      expect(result).toEqual(created);
      expect(repository.create).toHaveBeenCalledTimes(1);
      expect(repository.create).toHaveBeenCalledWith(123, 1);
    });

    const chavesInvalidas: Array<[string, unknown]> = [
      ["studentRa igual a 0", { studentRa: 0, courseId: 1 }],
      ["courseId igual a 0", { studentRa: 123, courseId: 0 }],
    ];

    test.each(chavesInvalidas)(
      "rejeita %s com erro 400 e não chama repository.create",
      async (_cenario, input) => {
        await expectHttpError(service.create(input), 400);

        expect(repository.create).not.toHaveBeenCalled();
      },
    );

    test("traduz violação de chave estrangeira (23503) em erro 404 para aluno ou disciplina inexistente", async () => {
      repository.create.mockRejectedValue({ code: "23503" });

      await expectHttpError(service.create({ studentRa: 123, courseId: 1 }), 404);
    });

    test("traduz violação de unicidade (23505) em erro 409 para matrícula duplicada", async () => {
      repository.create.mockRejectedValue({ code: "23505" });

      await expectHttpError(service.create({ studentRa: 123, courseId: 1 }), 409);
    });

    test("propaga a mesma instância de Error em falha inesperada na criação", async () => {
      const failure = new Error("falha inesperada em create");
      repository.create.mockRejectedValue(failure);

      await expect(
        service.create({ studentRa: 123, courseId: 1 }),
      ).rejects.toBe(failure);
    });
  });

  describe("findAll", () => {
    test("retorna a lista de matrículas e chama repository.findAll uma vez, sem argumentos", async () => {
      const enrollments = [createEnrollment(123, 1), createEnrollment(456, 2)];
      repository.findAll.mockResolvedValue(enrollments);

      const result = await service.findAll();

      expect(result).toEqual(enrollments);
      expect(repository.findAll).toHaveBeenCalledTimes(1);
      expect(repository.findAll).toHaveBeenCalledWith();
    });
  });

  describe("findOne", () => {
    test("lança erro 404 quando a matrícula não existe e encaminha 123 e 1 na ordem correta", async () => {
      repository.findOne.mockResolvedValue(undefined);

      await expectHttpError(service.findOne(123, 1), 404);

      expect(repository.findOne).toHaveBeenCalledTimes(1);
      expect(repository.findOne).toHaveBeenCalledWith(123, 1);
    });

    test("retorna a matrícula existente e chama repository.findOne uma vez com 123 e 1", async () => {
      const enrollment = createEnrollment(123, 1);
      repository.findOne.mockResolvedValue(enrollment);

      const result = await service.findOne(123, 1);

      expect(result).toEqual(enrollment);
      expect(repository.findOne).toHaveBeenCalledTimes(1);
      expect(repository.findOne).toHaveBeenCalledWith(123, 1);
    });
  });
});

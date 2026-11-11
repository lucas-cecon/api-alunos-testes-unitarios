import { HttpError } from "../../../src/errors";
import type {
  Student,
  StudentRepository,
} from "../../../src/modules/students/students.repository";
import { StudentsService } from "../../../src/modules/students/students.service";

function createRepositoryMock(): jest.Mocked<StudentRepository> {
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

describe("StudentsService", () => {
  let repository: jest.Mocked<StudentRepository>;
  let service: StudentsService;

  beforeEach(() => {
    repository = createRepositoryMock();
    service = new StudentsService(repository);
  });

  afterEach(() => {
    jest.resetAllMocks();
    jest.restoreAllMocks();
  });

  describe("create", () => {
    test("cria um aluno válido, retorna o registro e encaminha { ra, name } ao repositório", async () => {
      const created: Student = { ra: 123, name: "Ana" };
      repository.create.mockResolvedValue(created);

      const result = await service.create({ ra: 123, name: "Ana" });

      expect(result).toEqual(created);
      expect(repository.create).toHaveBeenCalledTimes(1);
      expect(repository.create).toHaveBeenCalledWith({ ra: 123, name: "Ana" });
    });

    test("rejeita RA inválido (0) com erro 400 e não chama repository.create", async () => {
      await expectHttpError(service.create({ ra: 0, name: "Ana" }), 400);

      expect(repository.create).not.toHaveBeenCalled();
    });

    test("traduz violação de unicidade (23505) em erro 409 para RA duplicado", async () => {
      repository.create.mockRejectedValue({ code: "23505" });

      await expectHttpError(service.create({ ra: 123, name: "Ana" }), 409);
    });

    test("propaga a mesma instância de Error em falha inesperada na criação", async () => {
      const failure = new Error("falha inesperada em create");
      repository.create.mockRejectedValue(failure);

      await expect(service.create({ ra: 123, name: "Ana" })).rejects.toBe(
        failure,
      );
    });
  });

  describe("findAll", () => {
    test("retorna a lista de alunos e chama repository.findAll uma vez, sem argumentos", async () => {
      const students: Student[] = [
        { ra: 123, name: "Ana" },
        { ra: 456, name: "Bruno" },
      ];
      repository.findAll.mockResolvedValue(students);

      const result = await service.findAll();

      expect(result).toEqual(students);
      expect(repository.findAll).toHaveBeenCalledTimes(1);
      expect(repository.findAll).toHaveBeenCalledWith();
    });
  });

  describe("findOne", () => {
    test("retorna o aluno existente e chama repository.findOne uma vez com o RA 123", async () => {
      const student: Student = { ra: 123, name: "Ana" };
      repository.findOne.mockResolvedValue(student);

      const result = await service.findOne(123);

      expect(result).toEqual(student);
      expect(repository.findOne).toHaveBeenCalledTimes(1);
      expect(repository.findOne).toHaveBeenCalledWith(123);
    });

    test("lança erro 404 quando o aluno com RA 123 não existe", async () => {
      repository.findOne.mockResolvedValue(undefined);

      await expectHttpError(service.findOne(123), 404);
      expect(repository.findOne).toHaveBeenCalledWith(123);
    });
  });
});

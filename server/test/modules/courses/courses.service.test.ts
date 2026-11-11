import { HttpError } from "../../../src/errors";
import type {
  Course,
  CourseRepository,
} from "../../../src/modules/courses/courses.repository";
import { CoursesService } from "../../../src/modules/courses/courses.service";

// Cria um repositório de dublê: cada método é um jest.fn() sem implementação.
function createRepositoryMock(): jest.Mocked<CourseRepository> {
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

describe("CoursesService", () => {
  let repository: jest.Mocked<CourseRepository>;
  let service: CoursesService;

  beforeEach(() => {
    repository = createRepositoryMock();
    service = new CoursesService(repository);
  });

  afterEach(() => {
    jest.resetAllMocks();
    jest.restoreAllMocks();
  });

  describe("create", () => {
    test("cria uma disciplina válida e encaminha os dados ao repositório uma única vez", async () => {
      const created: Course = { id: 1, name: "Qualidade" };
      repository.create.mockResolvedValue(created);

      const result = await service.create({ name: "Qualidade" });

      expect(result).toEqual(created);
      expect(repository.create).toHaveBeenCalledTimes(1);
      expect(repository.create).toHaveBeenCalledWith({ name: "Qualidade" });
    });

    const entradasInvalidas: Array<[string, unknown]> = [
      ["null", null],
      ["objeto vazio", {}],
      ['nome com 1 caractere ({ name: "A" })', { name: "A" }],
    ];

    test.each(entradasInvalidas)(
      "rejeita %s com erro 400 e não chama repository.create",
      async (_cenario, input) => {
        await expectHttpError(service.create(input), 400);

        expect(repository.create).not.toHaveBeenCalled();
      },
    );

    test("traduz violação de unicidade (23505) em erro 409 para nome duplicado", async () => {
      repository.create.mockRejectedValue({ code: "23505" });

      await expectHttpError(service.create({ name: "Qualidade" }), 409);
      expect(repository.create).toHaveBeenCalledTimes(1);
    });

    test("propaga a mesma instância de Error em falha inesperada do repositório", async () => {
      const failure = new Error("falha inesperada em create");
      repository.create.mockRejectedValue(failure);

      await expect(service.create({ name: "Qualidade" })).rejects.toBe(failure);
    });

    test("ignora campos extras e envia ao repositório somente { name }", async () => {
      repository.create.mockResolvedValue({ id: 2, name: "Qualidade" });

      await service.create({ name: "Qualidade", extra: true });

      expect(repository.create).toHaveBeenCalledTimes(1);
      expect(repository.create).toHaveBeenCalledWith({ name: "Qualidade" });
    });
  });

  describe("findAll", () => {
    test("retorna a lista fornecida pelo stub do repositório com uma única chamada", async () => {
      // Stub: resposta predefinida, sem interesse nas interações além da contagem.
      const courses: Course[] = [
        { id: 1, name: "Qualidade" },
        { id: 2, name: "Banco de Dados" },
      ];
      repository.findAll.mockResolvedValue(courses);

      const result = await service.findAll();

      expect(result).toEqual(courses);
      expect(repository.findAll).toHaveBeenCalledTimes(1);
    });

    test("propaga a mesma instância de Error em falha inesperada do repositório", async () => {
      const failure = new Error("falha inesperada em findAll");
      repository.findAll.mockRejectedValue(failure);

      await expect(service.findAll()).rejects.toBe(failure);
    });
  });

  describe("findOne", () => {
    test("retorna a disciplina existente e encaminha o identificador ao repositório", async () => {
      const course: Course = { id: 123, name: "Qualidade" };
      repository.findOne.mockResolvedValue(course);

      const result = await service.findOne(123);

      expect(result).toEqual(course);
      expect(repository.findOne).toHaveBeenCalledTimes(1);
      expect(repository.findOne).toHaveBeenCalledWith(123);
    });

    test("lança erro 404 quando o repositório devolve undefined", async () => {
      repository.findOne.mockResolvedValue(undefined);

      await expectHttpError(service.findOne(123), 404);
      expect(repository.findOne).toHaveBeenCalledWith(123);
    });

    test("lança erro 400 para identificador inválido (0) sem consultar o repositório", async () => {
      await expectHttpError(service.findOne(0), 400);

      expect(repository.findOne).not.toHaveBeenCalled();
    });

    test("propaga a mesma instância de Error em falha inesperada do repositório", async () => {
      const failure = new Error("falha inesperada em findOne");
      repository.findOne.mockRejectedValue(failure);

      await expect(service.findOne(123)).rejects.toBe(failure);
    });
  });

  describe("uso de spy", () => {
    test("observa findOne de um stub existente com jest.spyOn e confere o identificador 1", async () => {
      // Stub com métodos assíncronos reais; o spy apenas observa as chamadas.
      const stub: CourseRepository = {
        create: async (data) => ({ id: 10, name: data.name }),
        findAll: async () => [],
        findOne: async (id) => ({ id, name: "Qualidade" }),
      };
      const findOneSpy = jest.spyOn(stub, "findOne");
      const spiedService = new CoursesService(stub);

      const result = await spiedService.findOne(1);

      expect(result).toEqual({ id: 1, name: "Qualidade" });
      expect(findOneSpy).toHaveBeenCalledTimes(1);
      expect(findOneSpy).toHaveBeenCalledWith(1);
    });
  });
});

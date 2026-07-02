import { Test } from "@nestjs/testing";
import { UsersService } from "./users.service";
import { PrismaService } from "../prisma/prisma.service";

describe("UsersService", () => {
  let service: UsersService;
  const prismaMock = {
    user: {
      create: jest.fn(),
      findUnique: jest.fn(),
    },
  };

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();
    service = moduleRef.get(UsersService);
    jest.clearAllMocks();
  });

  it("create() delegates to prisma with correct data", async () => {
    prismaMock.user.create.mockResolvedValue({ id: "1" });
    await service.create("a@b.com", "hash", "Gandalf");
    expect(prismaMock.user.create).toHaveBeenCalledWith({
      data: { email: "a@b.com", passwordHash: "hash", displayName: "Gandalf" },
    });
  });

  it("findByEmail() queries by unique email", async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);
    const r = await service.findByEmail("a@b.com");
    expect(prismaMock.user.findUnique).toHaveBeenCalledWith({
      where: { email: "a@b.com" },
    });
    expect(r).toBeNull();
  });
});

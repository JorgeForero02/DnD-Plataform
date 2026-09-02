import { Test } from "@nestjs/testing";
import { UsersService } from "./users.service";
import { PrismaService } from "../prisma/prisma.service";

describe("UsersService", () => {
  let service: UsersService;
  const prismaMock = {
    user: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  };

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [UsersService, { provide: PrismaService, useValue: prismaMock }],
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

  it("findById() queries by unique id", async () => {
    prismaMock.user.findUnique.mockResolvedValue({ id: "1", displayName: "Gandalf" });
    const r = await service.findById("1");
    expect(prismaMock.user.findUnique).toHaveBeenCalledWith({
      where: { id: "1" },
    });
    expect(r).toEqual({ id: "1", displayName: "Gandalf" });
  });

  it("updateDisplayName() selects only id, email and displayName — never the hash", async () => {
    prismaMock.user.update.mockResolvedValue({ id: "1", email: "a@b.com", displayName: "New" });
    await service.updateDisplayName("1", "New");
    expect(prismaMock.user.update).toHaveBeenCalledWith({
      where: { id: "1" },
      data: { displayName: "New" },
      select: { id: true, email: true, displayName: true },
    });
  });

  it("updatePasswordHash() also stamps passwordChangedAt", async () => {
    prismaMock.user.update.mockResolvedValue({ id: "1" });
    await service.updatePasswordHash("1", "new-hash");
    const call = prismaMock.user.update.mock.calls[0][0];
    expect(call.where).toEqual({ id: "1" });
    expect(call.data.passwordHash).toBe("new-hash");
    expect(call.data.passwordChangedAt).toBeInstanceOf(Date);
  });
});

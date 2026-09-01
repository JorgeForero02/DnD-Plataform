import { Test } from "@nestjs/testing";
import { CampaignsService } from "./campaigns.service";
import { MembershipService } from "./membership.service";
import { PrismaService } from "../prisma/prisma.service";
import { EventEmitter2 } from "@nestjs/event-emitter";

describe("CampaignsService.listMembers", () => {
  let service: CampaignsService;
  const membership = { requireMember: jest.fn(), listMembers: jest.fn() };

  beforeEach(async () => {
    const ref = await Test.createTestingModule({
      providers: [
        CampaignsService,
        { provide: MembershipService, useValue: membership },
        { provide: PrismaService, useValue: {} },
        { provide: EventEmitter2, useValue: { emit: jest.fn() } },
      ],
    }).compile();
    service = ref.get(CampaignsService);
    jest.clearAllMocks();
  });

  it("requires membership then returns the member list", async () => {
    membership.listMembers.mockResolvedValue([{ userId: "u1", displayName: "DM", role: "DM" }]);
    const res = await service.listMembers("u1", "c1");
    expect(membership.requireMember).toHaveBeenCalledWith("c1", "u1");
    expect(res).toEqual([{ userId: "u1", displayName: "DM", role: "DM" }]);
  });
});

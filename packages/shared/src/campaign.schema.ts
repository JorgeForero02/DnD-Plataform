import { z } from "zod";

export const createCampaignSchema = z.object({
  name: z.string().min(1).max(120),
  description: z.string().max(5000).optional(),
});
export type CreateCampaignInput = z.infer<typeof createCampaignSchema>;

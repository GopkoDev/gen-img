import { z } from "zod";
import { ProviderId } from "./providers";

export const MAX_IMAGES = 4;

export const RequestedParams = z.object({
  aspectRatio: z.string().min(1).optional(),
  seed: z.number({ error: "Seed must be a whole number" }).int({ error: "Seed must be a whole number" }).optional(),
  n: z
    .number({ error: `Number of images must be between 1 and ${MAX_IMAGES}` })
    .int({ error: `Number of images must be between 1 and ${MAX_IMAGES}` })
    .min(1, { error: `Number of images must be between 1 and ${MAX_IMAGES}` })
    .max(MAX_IMAGES, { error: `Number of images must be between 1 and ${MAX_IMAGES}` }),
});
export type RequestedParams = z.infer<typeof RequestedParams>;

export const StartGenerationRequest = z.object({
  provider: ProviderId,
  model: z.string({ error: "Choose a model" }).min(1, { error: "Choose a model" }),
  prompt: z
    .string({ error: "Prompt must not be empty" })
    .max(10_000, { error: "Prompt must be at most 10 000 characters" })
    .refine((p) => p.trim().length > 0, { error: "Prompt must not be empty" }),
  params: RequestedParams,
});
export type StartGenerationRequest = z.infer<typeof StartGenerationRequest>;

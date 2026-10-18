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

export const CostStatus = z.enum(["known", "pending", "unavailable"]);
export type CostStatus = z.infer<typeof CostStatus>;

export const Job = z.object({
  id: z.string(),
  status: z.enum(["running", "succeeded", "failed"]),
  startedAt: z.string(),
  finishedAt: z.string().optional(),
  generationId: z.string().optional(),
  error: z
    .object({ code: z.string(), message: z.string(), details: z.record(z.string(), z.unknown()).optional() })
    .optional(),
});
export type Job = z.infer<typeof Job>;

export const JobResponse = z.object({ job: Job });
export type JobResponse = z.infer<typeof JobResponse>;
export const CurrentJobResponse = z.object({ job: Job.nullable() });
export type CurrentJobResponse = z.infer<typeof CurrentJobResponse>;

export const OutputImage = z.object({
  position: z.number().int().min(1),
  url: z.string(),
  mediaType: z.enum(["image/png", "image/jpeg", "image/webp", "image/gif"]),
  width: z.number().int(),
  height: z.number().int(),
  byteSize: z.number().int(),
});
export type OutputImage = z.infer<typeof OutputImage>;

export const GenerationSummary = z.object({
  id: z.string(),
  provider: ProviderId,
  model: z.string(),
  prompt: z.string(),
  createdAt: z.string(),
  costMicros: z.number().int().nullable(),
  costStatus: CostStatus,
  imagesRequested: z.number().int(),
  imagesReceived: z.number().int(),
  thumbnail: OutputImage,
});
export type GenerationSummary = z.infer<typeof GenerationSummary>;

export const GenerationPage = z.object({ items: z.array(GenerationSummary), nextCursor: z.string().nullable() });
export type GenerationPage = z.infer<typeof GenerationPage>;

export const Generation = z.object({
  id: z.string(),
  provider: ProviderId,
  model: z.string(),
  prompt: z.string(),
  requestedParams: RequestedParams,
  acceptedParams: z.record(z.string(), z.unknown()).nullable(),
  imagesRequested: z.number().int(),
  images: z.array(OutputImage).min(1),
  costMicros: z.number().int().nullable(),
  costStatus: CostStatus,
  createdAt: z.string(),
  durationMs: z.number().int(),
  rawRequest: z.unknown(),
  rawResponse: z.unknown(),
});
export type Generation = z.infer<typeof Generation>;

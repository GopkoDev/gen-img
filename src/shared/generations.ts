import { z } from "zod";
import { type SniffedImage, sniffImage } from "./image-sniff";
import { type ImageModel, ProviderId } from "./providers";

export const MAX_IMAGES = 4;

/** gen-img's cap on input images per generation, whatever the model lists (spec AC-02). */
export const MAX_INPUT_IMAGES = 8;
/** 10 MiB per input image (spec AC-03). */
export const MAX_INPUT_BYTES = 10 * 1024 * 1024;

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

export type FieldErrors = Record<string, string>;

/** Checks requested parameters against what the chosen model lists as supported. Empty result = ok. */
export function checkAgainstModel(params: RequestedParams, model: ImageModel, inputCount = 0): FieldErrors {
  const fields: FieldErrors = {};
  const inputs = model.params.inputs;
  const plural = (k: number) => `${k} input image${k === 1 ? "" : "s"}`;
  if (!inputs) {
    if (inputCount > 0) fields.inputs = "This model does not accept input images";
  } else {
    const max = Math.min(inputs.max, MAX_INPUT_IMAGES);
    if (inputCount < inputs.min) fields.inputs = `This model needs at least ${plural(inputs.min)}`;
    else if (inputCount > max) fields.inputs = `This model takes at most ${plural(max)}`;
  }
  const maxN = model.params.n?.max ?? 1;
  if (params.n > maxN)
    fields["params.n"] = `This model makes at most ${maxN} image${maxN === 1 ? "" : "s"} per request`;

  if (params.aspectRatio !== undefined) {
    const values = model.params.aspectRatio?.values;
    if (!values) fields["params.aspectRatio"] = "This model does not accept an aspect ratio";
    else if (!values.includes(params.aspectRatio))
      fields["params.aspectRatio"] = `Aspect ratio must be one of ${values.join(", ")}`;
  }

  if (params.seed !== undefined) {
    const seed = model.params.seed;
    if (!seed) fields["params.seed"] = "This model does not accept a seed";
    else if ((seed.min !== undefined && params.seed < seed.min) || (seed.max !== undefined && params.seed > seed.max))
      fields["params.seed"] = `Seed must be between ${seed.min ?? "any"} and ${seed.max ?? "any"}`;
  }
  return fields;
}

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

export const InputImage = z.object({
  position: z.number().int().min(1),
  url: z.string(),
  mediaType: z.enum(["image/png", "image/jpeg", "image/webp", "image/gif"]),
  width: z.number().int(),
  height: z.number().int(),
  byteSize: z.number().int(),
  originalName: z.string().nullable(),
});
export type InputImage = z.infer<typeof InputImage>;

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
  inputsCount: z.number().int().min(0),
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
  inputs: z.array(InputImage),
  costMicros: z.number().int().nullable(),
  costStatus: CostStatus,
  createdAt: z.string(),
  durationMs: z.number().int(),
  rawRequest: z.unknown(),
  rawResponse: z.unknown(),
});
export type Generation = z.infer<typeof Generation>;

/** One attached file: a usable PNG/JPEG/WebP/GIF of at most 10 MiB, or a plain-language reason. */
export function checkInputFile(
  bytes: Uint8Array,
  name: string,
): { ok: true; image: SniffedImage } | { ok: false; message: string } {
  if (bytes.byteLength > MAX_INPUT_BYTES) return { ok: false, message: `${name} — larger than 10 MB` };
  const image = sniffImage(bytes);
  return image ? { ok: true, image } : { ok: false, message: `${name} — not a supported image` };
}

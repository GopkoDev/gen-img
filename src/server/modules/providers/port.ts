import type { RequestedParams } from "../../../shared/generations";
import type { ImageModel, ProviderId } from "../../../shared/providers";
import type { SniffedImage } from "./image-sniff";

export type GenerateInput = { model: string; prompt: string; params: RequestedParams };

/** A decoded, validated («usable») output image. */
export type ProviderImage = SniffedImage & { bytes: Uint8Array };

/**
 * The normalized result every adapter returns (ADR-0004). The raw exchange is already redacted
 * (ADR-0008): no credentials, and each image payload replaced by `{ "$image": <position> }`.
 */
export type GenerationResult = {
  images: ProviderImage[];
  /** Price in USD as the provider stated it; `null` when the answer carried none. */
  costUsd: number | null;
  /** Parameters the provider reports it applied; `null` = not reported. */
  acceptedParams: Record<string, unknown> | null;
  rawRequest: unknown;
  rawResponse: unknown;
};

export class ProviderError extends Error {
  constructor(
    readonly provider: ProviderId,
    readonly upstreamStatus: number | null,
    message: string,
  ) {
    super(message);
    this.name = "ProviderError";
  }
}

export interface ImageProvider {
  readonly id: ProviderId;
  readonly name: string;
  readonly configured: boolean;
  listModels(signal?: AbortSignal): Promise<ImageModel[]>;
  /** Throws `ProviderError` on refusal, failure, timeout (signal aborted) or zero usable images. */
  generate(input: GenerateInput, signal: AbortSignal): Promise<GenerationResult>;
}

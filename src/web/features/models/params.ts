import type { ImageModel } from "../../../shared/providers";

const NONE = "—";

export type ParamsDescription = {
  aspectRatios: string;
  seed: string;
  images: string;
  inputs: string;
};

/** Plain table cells for a model's supported parameters (sad.md §8 wording). */
export function describeParams(model: ImageModel): ParamsDescription {
  const { aspectRatio, seed, n, inputs } = model.params;
  return {
    aspectRatios: aspectRatio && aspectRatio.values.length > 0 ? aspectRatio.values.join(", ") : NONE,
    seed: seed ? "yes" : NONE,
    images: `up to ${n?.max ?? 1}`,
    inputs: inputs ? `${inputs.min}–${inputs.max}` : NONE,
  };
}

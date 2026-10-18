import { randomUUID } from "node:crypto";

// Request bodies that carry input images as data URLs can reach ~110 MB (8 × 10 MB, base64). Building them
// with one JSON.stringify pass over those strings costs ~100 ms; base64 and our media types never need JSON
// escaping, so the URLs are spliced into a small stringified skeleton instead (spec §6, rerun-and-reuse NFR).

/** Base64 of the bytes, reading the underlying memory directly (no copy of the image first). */
export function toBase64(bytes: Uint8Array): string {
  return Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength).toString("base64");
}

const SAFE_MEDIA_TYPE = /^image\/[a-z0-9.+-]+$/;

export function toDataUrl(img: { mediaType: string; bytes: Uint8Array }): string {
  if (!SAFE_MEDIA_TYPE.test(img.mediaType)) throw new Error(`Unexpected media type: ${img.mediaType}`);
  return `data:${img.mediaType};base64,${toBase64(img.bytes)}`;
}

/** `JSON.stringify({ ...base, [key]: urls.map(wrap) })`, without scanning the (huge, JSON-safe) data URLs. */
export function jsonWithImageRefs(
  base: Record<string, unknown>,
  key: string,
  urls: string[],
  wrap: (url: string) => unknown,
): string {
  // A per-call nonce: user text (the prompt) can never spell a slot. Hex + digits need no JSON escaping.
  const nonce = randomUUID().replaceAll("-", "");
  const skeleton = JSON.stringify({ ...base, [key]: urls.map((_, i) => wrap(`@@${nonce}-${i}@@`)) });
  // split with a capture group alternates text, slot index, text, … — one join builds the body once.
  const parts = skeleton.split(new RegExp(`@@${nonce}-(\\d+)@@`, "g"));
  if (parts.length !== urls.length * 2 + 1) throw new Error("Image slots don't match the images");
  return parts.map((part, i) => (i % 2 === 1 ? (urls[Number(part)] ?? "") : part)).join("");
}

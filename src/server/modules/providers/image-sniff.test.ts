import { describe, expect, it } from "vitest";
import { sniffImage } from "./image-sniff";

const bytes = (...parts: (number[] | string)[]) =>
  new Uint8Array(parts.flatMap((p) => (typeof p === "string" ? [...p].map((c) => c.charCodeAt(0)) : p)));
const be32 = (n: number) => [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255];
const le16 = (n: number) => [n & 255, (n >>> 8) & 255];
const le24 = (n: number) => [n & 255, (n >>> 8) & 255, (n >>> 16) & 255];

const png = (w: number, h: number) =>
  bytes([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], be32(13), "IHDR", be32(w), be32(h), [8, 6, 0, 0, 0]);

describe("sniffImage", () => {
  it("reads PNG dimensions", () => {
    expect(sniffImage(png(1024, 576))).toEqual({ mediaType: "image/png", width: 1024, height: 576 });
  });

  it("reads GIF dimensions", () => {
    expect(sniffImage(bytes("GIF89a", le16(320), le16(200), [0, 0, 0]))).toEqual({
      mediaType: "image/gif",
      width: 320,
      height: 200,
    });
  });

  it("reads JPEG dimensions from the SOF marker after an APP1 segment", () => {
    const app1 = [0xff, 0xe1, 0x00, 0x06, 1, 2, 3, 4];
    const sof0 = [0xff, 0xc0, 0x00, 0x11, 8, 0x02, 0x40, 0x03, 0x00, 3, 1, 0x22, 0, 2, 0x11, 1, 3, 0x11, 1];
    expect(sniffImage(bytes([0xff, 0xd8], app1, sof0))).toEqual({ mediaType: "image/jpeg", width: 768, height: 576 });
  });

  it("reads WebP VP8X, VP8L and VP8 dimensions", () => {
    const vp8x = bytes("RIFF", [0, 0, 0, 0], "WEBP", "VP8X", [10, 0, 0, 0], [0, 0, 0, 0], le24(1919), le24(1079));
    expect(sniffImage(vp8x)).toEqual({ mediaType: "image/webp", width: 1920, height: 1080 });

    const w = 100;
    const h = 50;
    const bits = (w - 1) | ((h - 1) << 14);
    const vp8l = bytes(
      "RIFF",
      [0, 0, 0, 0],
      "WEBP",
      "VP8L",
      [5, 0, 0, 0],
      [0x2f],
      [bits & 255, (bits >>> 8) & 255, (bits >>> 16) & 255, (bits >>> 24) & 255],
    );
    expect(sniffImage(vp8l)).toEqual({ mediaType: "image/webp", width: 100, height: 50 });

    const vp8 = bytes(
      "RIFF",
      [0, 0, 0, 0],
      "WEBP",
      "VP8 ",
      [10, 0, 0, 0],
      [0, 0, 0],
      [0x9d, 0x01, 0x2a],
      le16(640),
      le16(480),
    );
    expect(sniffImage(vp8)).toEqual({ mediaType: "image/webp", width: 640, height: 480 });
  });

  it("returns null for empty, truncated, zero-sized or unsupported data", () => {
    expect(sniffImage(new Uint8Array())).toBeNull();
    expect(sniffImage(png(10, 10).slice(0, 20))).toBeNull();
    expect(sniffImage(png(0, 10))).toBeNull();
    expect(sniffImage(bytes('<svg xmlns="http://www.w3.org/2000/svg"/>'))).toBeNull();
    expect(sniffImage(bytes([0xff, 0xd8, 0xff, 0xe0, 0x00]))).toBeNull();
  });
});

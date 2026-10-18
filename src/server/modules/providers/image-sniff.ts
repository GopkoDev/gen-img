export type ImageMediaType = "image/png" | "image/jpeg" | "image/webp" | "image/gif";
export type SniffedImage = { mediaType: ImageMediaType; width: number; height: number };

const ascii = (b: Uint8Array, at: number, s: string) => [...s].every((c, i) => b[at + i] === c.charCodeAt(0));

function png(b: Uint8Array): SniffedImage | null {
  if (b.length < 24 || !ascii(b, 12, "IHDR")) return null;
  const v = new DataView(b.buffer, b.byteOffset, b.byteLength);
  return { mediaType: "image/png", width: v.getUint32(16), height: v.getUint32(20) };
}

function gif(b: Uint8Array): SniffedImage | null {
  if (b.length < 10) return null;
  const v = new DataView(b.buffer, b.byteOffset, b.byteLength);
  return { mediaType: "image/gif", width: v.getUint16(6, true), height: v.getUint16(8, true) };
}

function jpeg(b: Uint8Array): SniffedImage | null {
  let i = 2;
  while (i + 9 < b.length) {
    if (b[i] !== 0xff) return null;
    const marker = b[i + 1] ?? 0;
    if (marker === 0xff) {
      i++;
      continue;
    }
    const len = ((b[i + 2] ?? 0) << 8) | (b[i + 3] ?? 0);
    // SOF0–SOF15 carry the frame size; C4 (DHT), C8 (JPG), CC (DAC) are not frames.
    if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
      const height = ((b[i + 5] ?? 0) << 8) | (b[i + 6] ?? 0);
      const width = ((b[i + 7] ?? 0) << 8) | (b[i + 8] ?? 0);
      return { mediaType: "image/jpeg", width, height };
    }
    if (len < 2) return null;
    i += 2 + len;
  }
  return null;
}

function webp(b: Uint8Array): SniffedImage | null {
  const u24 = (at: number) => (b[at] ?? 0) | ((b[at + 1] ?? 0) << 8) | ((b[at + 2] ?? 0) << 16);
  if (ascii(b, 12, "VP8X") && b.length >= 30)
    return { mediaType: "image/webp", width: u24(24) + 1, height: u24(27) + 1 };
  if (ascii(b, 12, "VP8L")) {
    if (b.length < 25 || b[20] !== 0x2f) return null;
    const bits = ((b[21] ?? 0) | ((b[22] ?? 0) << 8) | ((b[23] ?? 0) << 16) | ((b[24] ?? 0) << 24)) >>> 0;
    return { mediaType: "image/webp", width: (bits & 0x3fff) + 1, height: ((bits >>> 14) & 0x3fff) + 1 };
  }
  if (ascii(b, 12, "VP8 ")) {
    if (b.length < 30 || b[23] !== 0x9d || b[24] !== 0x01 || b[25] !== 0x2a) return null;
    const v = new DataView(b.buffer, b.byteOffset, b.byteLength);
    return { mediaType: "image/webp", width: v.getUint16(26, true) & 0x3fff, height: v.getUint16(28, true) & 0x3fff };
  }
  return null;
}

/**
 * Identifies a «usable image» from its bytes: a non-empty PNG, JPEG, WebP or GIF with real dimensions.
 * Reads headers only; anything else (SVG, truncated data, zero size) is `null`.
 */
export function sniffImage(bytes: Uint8Array): SniffedImage | null {
  let found: SniffedImage | null = null;
  if (bytes.length >= 8 && bytes[0] === 0x89 && ascii(bytes, 1, "PNG\r\n\x1a\n")) found = png(bytes);
  else if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) found = jpeg(bytes);
  else if (ascii(bytes, 0, "GIF87a") || ascii(bytes, 0, "GIF89a")) found = gif(bytes);
  else if (ascii(bytes, 0, "RIFF") && ascii(bytes, 8, "WEBP")) found = webp(bytes);
  return found && found.width > 0 && found.height > 0 ? found : null;
}

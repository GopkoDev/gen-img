import { describe, expect, it } from "vitest";
import { jsonWithImageRefs, toBase64, toDataUrl } from "./inline-json";

describe("request bodies with inline images", () => {
  const img = { mediaType: "image/png", bytes: new Uint8Array([137, 80, 78, 71, 0, 255]) };

  it("encodes bytes without copying them first", () => {
    const view = new Uint8Array(new Uint8Array([9, 9, ...img.bytes]).buffer, 2); // a view with an offset
    expect(toBase64(view)).toBe(Buffer.from(img.bytes).toString("base64"));
    expect(toDataUrl(img)).toBe(`data:image/png;base64,${Buffer.from(img.bytes).toString("base64")}`);
  });

  it("produces exactly what JSON.stringify would, for every shape the adapters send", () => {
    const base = { model: "a/b", prompt: 'He said "hi"\n\\ ok', n: 2, seed: 7 };
    const urls = [toDataUrl(img), toDataUrl({ ...img, mediaType: "image/webp" })];
    const ref = (url: string) => ({ type: "image_url", image_url: { url } });
    expect(jsonWithImageRefs(base, "input_references", urls, ref)).toBe(
      JSON.stringify({ ...base, input_references: urls.map(ref) }),
    );
    const plain = (url: string) => ({ image_url: url });
    expect(jsonWithImageRefs(base, "images", urls, plain)).toBe(JSON.stringify({ ...base, images: urls.map(plain) }));
    expect(jsonWithImageRefs({}, "images", urls, plain)).toBe(JSON.stringify({ images: urls.map(plain) }));
  });

  it("is not confused by a prompt that looks like a slot", () => {
    const base = { prompt: "draw @@gen-img-image-0@@ and @@gen-img-image-1@@" };
    const urls = [toDataUrl(img)];
    const plain = (url: string) => ({ image_url: url });
    expect(jsonWithImageRefs(base, "images", urls, plain)).toBe(JSON.stringify({ ...base, images: urls.map(plain) }));
  });
});

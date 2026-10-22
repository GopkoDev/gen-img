import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { promptKey } from "./promptKey";

const independent = (text: string) => createHash("sha256").update(Buffer.from(text, "utf8")).digest("hex").slice(0, 32);

describe("promptKey", () => {
  it("is the first 32 hex chars of SHA-256 over the exact UTF-8 text", () => {
    for (const text of ["a cat", "", "кіт у капелюсі", "multi\nline"]) {
      expect(promptKey(text)).toBe(independent(text));
      expect(promptKey(text)).toMatch(/^[0-9a-f]{32}$/);
    }
  });

  it("differs for a trailing newline", () => {
    expect(promptKey("a cat\n")).not.toBe(promptKey("a cat"));
  });

  it("differs for a case change", () => {
    expect(promptKey("A cat")).not.toBe(promptKey("a cat"));
  });

  it("differs for NFC vs NFD forms of й", () => {
    const nfc = "й";
    const nfd = "й";
    expect(nfc.normalize("NFD")).toBe(nfd);
    expect(promptKey(nfc)).not.toBe(promptKey(nfd));
  });
});

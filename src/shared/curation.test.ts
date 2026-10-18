import { describe, expect, it } from "vitest";
import { checkComment, MAX_COMMENT_CHARS, normalizeTag } from "./curation";

const TAG_RULE = "Tags may contain letters, digits, spaces, - and _ (1–32 characters)";

describe("normalizeTag", () => {
  it("trims, collapses inner whitespace and lower-cases in any alphabet", () => {
    expect(normalizeTag("  Neon   City ")).toEqual({ ok: true, tag: "neon city" });
    expect(normalizeTag("Кіт_Ночі-2")).toEqual({ ok: true, tag: "кіт_ночі-2" });
    expect(normalizeTag("x".repeat(32))).toEqual({ ok: true, tag: "x".repeat(32) });
  });

  it("refuses empty, too long or disallowed text with the rule", () => {
    for (const raw of ["", "   ", "x".repeat(33), "🐱", "a/b", "<script>", "tag!"])
      expect(normalizeTag(raw)).toEqual({ ok: false, message: TAG_RULE });
  });
});

describe("normalizeTag — scripts with combining marks", () => {
  it("accepts Hindi, Thai, decomposed accents and Turkish İ, and treats composed and decomposed forms as one tag", () => {
    for (const raw of ["हिंदी", "ไทย่", "и\u0306", "cafe\u0301", "İstanbul"])
      expect(normalizeTag(raw)).toMatchObject({ ok: true });
    expect(normalizeTag("cafe\u0301")).toEqual(normalizeTag("café"));
    expect(normalizeTag("и\u0306")).toEqual(normalizeTag("й"));
  });
});

describe("checkComment", () => {
  it("keeps the text as written, line breaks included", () => {
    expect(checkComment("Line one\n  line two ")).toEqual({ ok: true, body: "Line one\n  line two " });
  });

  it("treats blank text as removing the comment", () => {
    expect(checkComment("")).toEqual({ ok: true, body: null });
    expect(checkComment(" \n\t ")).toEqual({ ok: true, body: null });
  });

  it("counts characters as the Owner sees them, not UTF-16 units", () => {
    expect(checkComment("🐱".repeat(MAX_COMMENT_CHARS))).toMatchObject({ ok: true });
    expect(checkComment("a".repeat(MAX_COMMENT_CHARS + 1))).toEqual({
      ok: false,
      message: "Comment must be at most 2 000 characters",
    });
  });
});

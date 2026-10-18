import { Boxes } from "lucide-react";
import { describe, expect, it } from "vitest";
import { SECTIONS, type Section, sectionFor } from "./sections";

describe("sections registry", () => {
  it("lists Generate then Gallery, Generate at the root address", () => {
    expect(SECTIONS.map((s) => [s.id, s.path, s.label])).toEqual([
      ["generate", "/", "Generate"],
      ["gallery", "/gallery", "Gallery"],
    ]);
  });

  it("finds the section that owns an address", () => {
    expect(sectionFor({ name: "page", pathname: "/", search: "" })?.id).toBe("generate");
    expect(sectionFor({ name: "page", pathname: "/gallery", search: "" })?.id).toBe("gallery");
    expect(sectionFor({ name: "page", pathname: "/gallery/", search: "?deleted=1" })?.id).toBe("gallery");
    expect(sectionFor({ name: "detail", id: "01ABC" })?.id).toBe("gallery");
  });

  it("finds no section for an address outside the registry", () => {
    for (const pathname of ["/whatever", "/GALLERY", "/generations/", "/gallery/x"])
      expect(sectionFor({ name: "page", pathname, search: "" })).toBeUndefined();
  });

  it("matches against whatever registry it is given — a new section is one entry", () => {
    const models: Section = { id: "models", path: "/models", label: "Models", icon: Boxes, page: () => null };
    const extra = [...SECTIONS, models];
    expect(sectionFor({ name: "page", pathname: "/models", search: "" }, extra)?.id).toBe("models");
  });
});

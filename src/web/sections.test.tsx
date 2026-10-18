import { fireEvent, screen, within } from "@testing-library/react";
import { Boxes } from "lucide-react";
import { describe, expect, it, vi } from "vitest";
import { renderWithQuery } from "@/test-utils";
import { App } from "./App";
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

  it("one extra entry gets a bar entry, an address and a page — no change to the bar or the frame", () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => Response.json({ status: "ok" })),
    );
    const models: Section = {
      id: "models",
      path: "/models",
      label: "Models",
      icon: Boxes,
      page: () => <p>Models page</p>,
    };
    window.history.replaceState(null, "", "/models");
    renderWithQuery(<App sections={[...SECTIONS, models]} />);
    const link = within(screen.getByRole("navigation", { name: "Sections" })).getByRole("link", { name: "Models" });
    expect(link).toHaveAttribute("href", "/models");
    expect(link).toHaveAttribute("aria-current", "page");
    expect(screen.getByText("Models page")).toBeVisible();
    expect(document.title).toBe("Models · Ukiyo");
    fireEvent.click(
      within(screen.getByRole("navigation", { name: "Sections" })).getByRole("link", { name: "Gallery" }),
    );
    expect(screen.queryByText("Models page")).not.toBeInTheDocument();
    window.history.replaceState(null, "", "/");
    vi.unstubAllGlobals();
  });
});

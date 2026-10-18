import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// Native controls (scrollbars, form fields) follow the theme too (review of T8).
describe("theme tokens", () => {
  const css = readFileSync("src/web/index.css", "utf8");
  const block = (selector: string) => new RegExp(`${selector.replace(".", "\\.")} \\{([^}]*)\\}`).exec(css)?.[1] ?? "";
  it("declares the colour scheme per theme", () => {
    expect(block(":root")).toMatch(/color-scheme:\s*light;/);
    expect(block(".dark")).toMatch(/color-scheme:\s*dark;/);
  });
});

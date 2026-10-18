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

  // The badge strip paints --foreground text on --background (opaque pair; 90% opacity is out of scope).
  const token = (selector: string, name: string) =>
    new RegExp(`${name}:\\s*(oklch\\([^)]*\\));`).exec(block(selector))?.[1] ?? "";
  const luminance = (oklch: string) => {
    const [L = 0, C = 0, H = 0] = (/oklch\(([^)]*)\)/.exec(oklch)?.[1] ?? "").split(/\s+/).map(Number);
    const a = C * Math.cos((H * Math.PI) / 180);
    const b = C * Math.sin((H * Math.PI) / 180);
    const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
    const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
    const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
    const r = 4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
    const g = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
    const bl = -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s;
    const clamp = (x: number) => Math.min(1, Math.max(0, x));
    return 0.2126 * clamp(r) + 0.7152 * clamp(g) + 0.0722 * clamp(bl);
  };
  const contrast = (fg: string, bg: string) => {
    const [hi, lo] = [luminance(fg), luminance(bg)].sort((x, y) => y - x);
    return ((hi ?? 0) + 0.05) / ((lo ?? 0) + 0.05);
  };
  it.each([":root", ".dark"])("badge text (--foreground) on --background has contrast >= 4.5:1 in %s", (selector) => {
    const fg = token(selector, "--foreground");
    const bg = token(selector, "--background");
    expect(fg).not.toBe("");
    expect(bg).not.toBe("");
    expect(contrast(fg, bg)).toBeGreaterThanOrEqual(4.5);
  });
});

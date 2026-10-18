import { describe, expect, it } from "vitest";
import { createProviderRegistry } from "./registry";

describe("provider registry", () => {
  it("ships OpenRouter and Vercel AI Gateway, each configured by its own key", () => {
    const config = { openRouterApiKey: undefined, aiGatewayApiKey: "k", dataDir: "/tmp", port: 0 };
    const registry = createProviderRegistry(config);
    expect(registry.list().map((p) => [p.id, p.name, p.configured])).toEqual([
      ["openrouter", "OpenRouter", false],
      ["vercel", "Vercel AI Gateway", true],
    ]);
  });
});

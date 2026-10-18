import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { App } from "./App";

function renderApp() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <App />
    </QueryClientProvider>,
  );
}

describe("App shell", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("renders the header and reports the server as ok", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => Response.json({ status: "ok" })),
    );
    renderApp();
    expect(screen.getByRole("heading", { name: "gen-img" })).toBeInTheDocument();
    expect(await screen.findByText("server ok")).toBeInTheDocument();
  });

  it("reports the server as unreachable when health fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => Response.json({ error: { code: "X", message: "down" } }, { status: 500 })),
    );
    renderApp();
    expect(await screen.findByText("server unreachable")).toBeInTheDocument();
  });
});

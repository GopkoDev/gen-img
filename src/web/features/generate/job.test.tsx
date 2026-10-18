import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { api } from "@/lib/api";
import { JOB_QUERY_KEY, JobIndicator } from "./job";

vi.mock("@/lib/api", async (orig) => ({
  ...(await orig<typeof import("@/lib/api")>()),
  api: { currentJob: vi.fn() },
}));
const m = vi.mocked(api);

// The panel is the one poller (ADR-0023): the bar's indicator only reads what the panel's polling put in the cache.
describe("JobIndicator", () => {
  afterEach(() => vi.useRealTimers());

  it("never asks the server itself, and follows the cached job", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const client = new QueryClient();
    client.setQueryData(JOB_QUERY_KEY, { job: { id: "J", status: "running", startedAt: new Date().toISOString() } });
    render(
      <QueryClientProvider client={client}>
        <JobIndicator />
      </QueryClientProvider>,
    );
    expect(screen.getByText("generation running")).toBeInTheDocument();
    await act(() => vi.advanceTimersByTimeAsync(5000));
    act(() => window.dispatchEvent(new Event("focus")));
    expect(m.currentJob).not.toHaveBeenCalled();

    act(() => client.setQueryData(JOB_QUERY_KEY, { job: null }));
    await waitFor(() => expect(screen.queryByText("generation running")).not.toBeInTheDocument());
  });
});

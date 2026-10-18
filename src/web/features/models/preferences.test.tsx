import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "@/lib/api";
import type { ModelPreference } from "../../../shared/models";
import { modelPreferencesKey, useSetModelPreference } from "./preferences";

vi.mock("@/lib/api", () => ({
  api: { modelPreferences: vi.fn(), setModelPreference: vi.fn() },
}));

type Deferred<T> = { promise: Promise<T>; resolve: (v: T) => void; reject: (e: unknown) => void };
function deferred<T>(): Deferred<T> {
  let resolve!: (v: T) => void;
  let reject!: (e: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

const pref = (model: string, over: Partial<ModelPreference> = {}): ModelPreference => ({
  provider: "openrouter",
  model,
  favorite: false,
  hidden: false,
  updatedAt: null,
  ...over,
});

const key = modelPreferencesKey("openrouter");
const setup = () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  client.setQueryData(key, { preferences: [pref("a"), pref("b")] });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  const onError = vi.fn();
  const hook = renderHook(() => useSetModelPreference("openrouter", { onError }), { wrapper });
  const flags = (model: string) => {
    const p = client.getQueryData<{ preferences: ModelPreference[] }>(key)?.preferences.find((x) => x.model === model);
    return { favorite: p?.favorite, hidden: p?.hidden };
  };
  return { client, hook, flags, onError };
};

const setMock = vi.mocked(api.setModelPreference);
const listMock = vi.mocked(api.modelPreferences);

beforeEach(() => {
  setMock.mockReset();
  listMock.mockReset();
  listMock.mockResolvedValue({ preferences: [] });
});

describe("useSetModelPreference", () => {
  it("sets only the named flag optimistically", async () => {
    const { hook, flags } = setup();
    setMock.mockReturnValue(deferred<ModelPreference>().promise);
    act(() => hook.result.current.mutate({ model: "a", favorite: true }));
    await waitFor(() => expect(flags("a")).toEqual({ favorite: true, hidden: false }));
  });

  it("a failed star reverts only favorite while a concurrent hidden change keeps its state", async () => {
    const { hook, flags, onError } = setup();
    const star = deferred<ModelPreference>();
    const hide = deferred<ModelPreference>();
    setMock.mockReturnValueOnce(star.promise).mockReturnValueOnce(hide.promise);
    act(() => hook.result.current.mutate({ model: "a", favorite: true }));
    await waitFor(() => expect(flags("a").favorite).toBe(true));
    act(() => hook.result.current.mutate({ model: "a", hidden: true }));
    await waitFor(() => expect(flags("a")).toEqual({ favorite: true, hidden: true }));
    await act(async () => {
      star.reject(new Error("nope"));
    });
    await waitFor(() => expect(flags("a")).toEqual({ favorite: false, hidden: true }));
    expect(onError).toHaveBeenCalledTimes(1);
  });

  it("success writes only its own flag", async () => {
    const { hook, flags } = setup();
    const star = deferred<ModelPreference>();
    const hide = deferred<ModelPreference>();
    setMock.mockReturnValueOnce(star.promise).mockReturnValueOnce(hide.promise);
    act(() => hook.result.current.mutate({ model: "a", favorite: true }));
    act(() => hook.result.current.mutate({ model: "a", hidden: true }));
    await waitFor(() => expect(flags("a")).toEqual({ favorite: true, hidden: true }));
    await act(async () => {
      // the server's snapshot predates the hide: its hidden=false must not be written
      star.resolve(pref("a", { favorite: true, hidden: false, updatedAt: "2026-01-01T00:00:00Z" }));
    });
    expect(flags("a")).toEqual({ favorite: true, hidden: true });
  });

  it("does not refetch while a sibling mutation is in flight, then refetches exactly once", async () => {
    const { client, hook } = setup();
    const star = deferred<ModelPreference>();
    const hide = deferred<ModelPreference>();
    setMock.mockReturnValueOnce(star.promise).mockReturnValueOnce(hide.promise);
    const spy = vi.spyOn(client, "invalidateQueries");
    act(() => hook.result.current.mutate({ model: "a", favorite: true }));
    act(() => hook.result.current.mutate({ model: "a", hidden: true }));
    await act(async () => {
      star.resolve(pref("a", { favorite: true }));
    });
    expect(spy).not.toHaveBeenCalled();
    expect(listMock).not.toHaveBeenCalled();
    await act(async () => {
      hide.resolve(pref("a", { favorite: true, hidden: true }));
    });
    await waitFor(() => expect(spy).toHaveBeenCalledTimes(1));
    expect(spy).toHaveBeenCalledWith({ queryKey: key });
  });
});

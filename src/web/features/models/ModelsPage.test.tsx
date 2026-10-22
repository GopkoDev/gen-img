import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { act } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError, api } from "@/lib/api";
import { renderWithQuery } from "@/test-utils";
import { intersect, intersectAll } from "../../../../tests/helpers/intersection";
import type { ModelPreference } from "../../../shared/models";
import type { ModelPrice } from "../../../shared/pricing";
import type { ImageModel } from "../../../shared/providers";
import { ModelsPage } from "./ModelsPage";

vi.mock("@/lib/api", async (orig) => ({
  ...(await orig<typeof import("@/lib/api")>()),
  api: { providers: vi.fn(), models: vi.fn(), price: vi.fn(), modelPreferences: vi.fn(), setModelPreference: vi.fn() },
}));
const m = vi.mocked(api);

const GEMINI: ImageModel = {
  id: "google/gemini-2.5-flash-image",
  name: "Gemini 2.5 Flash Image",
  params: { aspectRatio: { values: ["1:1", "16:9"] }, n: { max: 1 }, inputs: { min: 0, max: 3 } },
};
const GPT: ImageModel = { id: "openai/gpt-5-image", name: "GPT-5 Image", params: { seed: {}, n: { max: 4 } } };
const FLUX: ImageModel = { id: "bfl/flux-2-pro", name: "FLUX 2 Pro", params: {} };
const VERCEL_MODEL: ImageModel = { id: "vercel/img", name: "Vercel Img", params: {} };

const pref = (model: string, over: Partial<ModelPreference> = {}, provider: "openrouter" | "vercel" = "openrouter") =>
  ({
    provider,
    model,
    favorite: false,
    hidden: false,
    updatedAt: "2026-10-19T10:00:00.000Z",
    ...over,
  }) as ModelPreference;
const perImage = (min: number, max = min): ModelPrice => ({
  kind: "per-image",
  output: { minUsd: min, maxUsd: max },
  input: null,
});
const OR = { id: "openrouter", name: "OpenRouter", configured: true } as const;
const VG = { id: "vercel", name: "Vercel AI Gateway", configured: true } as const;

function serve(opts: {
  providers?: Array<{ id: "openrouter" | "vercel"; name: string; configured: boolean }>;
  models?: Record<string, ImageModel[] | Error>;
  prefs?: Record<string, ModelPreference[] | Error>;
}) {
  m.providers.mockResolvedValue({ providers: opts.providers ?? [OR] });
  m.models.mockImplementation(async (p) => {
    const v = (opts.models ?? { openrouter: [GEMINI, GPT, FLUX] })[p];
    if (v instanceof Error) throw v;
    return { models: v ?? [], fetchedAt: "x" };
  });
  m.modelPreferences.mockImplementation(async (p) => {
    const v = opts.prefs?.[p];
    if (v instanceof Error) throw v;
    return { preferences: v ?? [] };
  });
}
/** A server that remembers saves, so the refetch after a toggle settles returns what was saved. */
function remember(provider: "openrouter" | "vercel", initial: ModelPreference[] = []) {
  const stored = [...initial];
  m.modelPreferences.mockImplementation(async () => ({ preferences: stored.map((p) => ({ ...p })) }));
  m.setModelPreference.mockImplementation(async (body) => {
    const at = stored.findIndex((p) => p.model === body.model);
    const next = pref(
      body.model,
      {
        ...(stored[at] ?? {}),
        favorite: body.favorite ?? stored[at]?.favorite ?? false,
        hidden: body.hidden ?? stored[at]?.hidden ?? false,
      },
      provider,
    );
    if (at >= 0) stored.splice(at, 1);
    if (next.favorite || next.hidden) stored.push(next);
    return next;
  });
}
const busy = new ApiError(502, "PROVIDER_ERROR", "busy");
const rowOf = (name: string) => screen.getByText(name).closest("tr") as HTMLElement;

beforeEach(() => {
  vi.resetAllMocks();
  m.price.mockResolvedValue({ price: perImage(0.0184), fetchedAt: "x" });
  serve({});
});

describe("ModelsPage (SCR-08)", () => {
  it("shows the heading, one card per configured provider with its model count and a row per model", async () => {
    serve({ providers: [OR, VG], models: { openrouter: [GEMINI, GPT, FLUX], vercel: [VERCEL_MODEL] } });
    renderWithQuery(<ModelsPage />);
    expect(screen.getByRole("heading", { name: "Models" })).toBeInTheDocument();
    expect(await screen.findByText("OpenRouter · 3 models")).toBeInTheDocument();
    expect(await screen.findByText("Vercel AI Gateway · 1 model")).toBeInTheDocument();
    const tables = screen.getAllByRole("table");
    expect(tables).toHaveLength(2);
    const names = within(tables[0] as HTMLElement)
      .getAllByRole("row")
      .slice(1)
      .map((r) => within(r).getAllByRole("cell")[0]?.textContent);
    expect(names).toEqual([
      "Gemini 2.5 Flash Imagegoogle/gemini-2.5-flash-image",
      "GPT-5 Imageopenai/gpt-5-image",
      "FLUX 2 Probfl/flux-2-pro",
    ]);
  });

  it("shows «Loading models…» in the card while a list is in flight", async () => {
    m.models.mockReturnValue(new Promise(() => {}));
    renderWithQuery(<ModelsPage />);
    expect(await screen.findByText("Loading models…")).toBeInTheDocument();
  });

  it("describes the supported parameters, with «—» for what a model doesn't support", async () => {
    renderWithQuery(<ModelsPage />);
    await screen.findByText("Gemini 2.5 Flash Image");
    const gemini = within(rowOf("Gemini 2.5 Flash Image")).getAllByRole("cell");
    expect(gemini.map((c) => c.textContent).slice(2, 5)).toEqual(["1:1, 16:9", "—", "up to 1"]);
    expect(gemini[5]).toHaveTextContent("0–3");
    const gpt = within(rowOf("GPT-5 Image")).getAllByRole("cell");
    expect(gpt.map((c) => c.textContent).slice(2, 6)).toEqual(["—", "yes", "up to 4", "—"]);
  });

  it("says «No image models.» for a provider with no models", async () => {
    serve({ models: { openrouter: [] } });
    renderWithQuery(<ModelsPage />);
    expect(await screen.findByText("No image models.")).toBeInTheDocument();
  });

  describe("prices, only for rows in view", () => {
    it("asks for no price until a row comes into view, then asks for that row only", async () => {
      renderWithQuery(<ModelsPage />);
      await screen.findByText("GPT-5 Image");
      expect(m.price).not.toHaveBeenCalled();
      expect(within(rowOf("GPT-5 Image")).getAllByText("…").length).toBeGreaterThan(0);
      act(() => intersect(rowOf("GPT-5 Image")));
      expect(await within(rowOf("GPT-5 Image")).findByText("$0.0184 / image")).toBeInTheDocument();
      expect(m.price).toHaveBeenCalledTimes(1);
      expect(m.price).toHaveBeenCalledWith("openrouter", GPT.id);
    });

    it("asks each visible row's price once, however often the rows re-render", async () => {
      renderWithQuery(<ModelsPage />);
      await screen.findByText("GPT-5 Image");
      act(() => intersectAll());
      await screen.findAllByText("$0.0184 / image");
      act(() => intersectAll());
      fireEvent.click(screen.getByRole("button", { name: `Favorite ${GPT.name}` }));
      await waitFor(() => expect(m.setModelPreference).toHaveBeenCalled());
      expect(m.price).toHaveBeenCalledTimes(3);
    });

    it("shows «…» while a price is in flight", async () => {
      m.price.mockReturnValue(new Promise(() => {}));
      renderWithQuery(<ModelsPage />);
      await screen.findByText("GPT-5 Image");
      act(() => intersectAll());
      await waitFor(() => expect(m.price).toHaveBeenCalled());
      expect(within(rowOf("GPT-5 Image")).getByText("…")).toBeInTheDocument();
    });

    it("words every price state", async () => {
      m.price.mockImplementation(async (_p, id) => {
        if (id === GEMINI.id) return { price: perImage(0.045, 0.151), fetchedAt: "x" };
        if (id === GPT.id) return { price: { kind: "per-token" }, fetchedAt: "x" };
        return { price: { kind: "unknown" }, fetchedAt: "x" };
      });
      renderWithQuery(<ModelsPage />);
      await screen.findByText("GPT-5 Image");
      act(() => intersectAll());
      expect(await screen.findByText("$0.045–$0.151 / image")).toBeInTheDocument();
      expect(await screen.findByText("priced per token")).toBeInTheDocument();
      expect(await screen.findByText("price unknown")).toBeInTheDocument();
    });

    it("says «price unknown — couldn't load» for a failed lookup, never $0", async () => {
      m.price.mockRejectedValue(busy);
      renderWithQuery(<ModelsPage />);
      await screen.findByText("GPT-5 Image");
      act(() => intersect(rowOf("GPT-5 Image")));
      expect(await screen.findByText("price unknown — couldn't load")).toBeInTheDocument();
      expect(screen.queryByText(/\$0 /)).not.toBeInTheDocument();
    });
  });

  describe("toggles", () => {
    it("shows the saved ★ and «Show in picker» state; a hidden row is muted with a «Hidden» badge", async () => {
      serve({ prefs: { openrouter: [pref(GEMINI.id, { favorite: true }), pref(FLUX.id, { hidden: true })] } });
      renderWithQuery(<ModelsPage />);
      await screen.findByText("FLUX 2 Pro");
      await waitFor(() => expect(screen.getByRole("switch", { name: "Show GPT-5 Image in picker" })).toBeEnabled());
      expect(screen.getByRole("button", { name: "Favorite Gemini 2.5 Flash Image" })).toHaveAttribute(
        "aria-pressed",
        "true",
      );
      expect(screen.getByRole("switch", { name: "Show FLUX 2 Pro in picker" })).not.toBeChecked();
      expect(screen.getByRole("switch", { name: "Show GPT-5 Image in picker" })).toBeChecked();
      expect(within(rowOf("FLUX 2 Pro")).getByText("Hidden")).toBeInTheDocument();
      expect(rowOf("FLUX 2 Pro")).toHaveClass("text-muted-foreground");
      expect(within(rowOf("GPT-5 Image")).queryByText("Hidden")).not.toBeInTheDocument();
    });

    it("switching off sends hidden:true and keeps the row listed, marked Hidden", async () => {
      remember("openrouter");
      renderWithQuery(<ModelsPage />);
      const sw = await screen.findByRole("switch", { name: "Show GPT-5 Image in picker" });
      await waitFor(() => expect(sw).toBeEnabled());
      fireEvent.click(sw);
      await waitFor(() =>
        expect(m.setModelPreference).toHaveBeenCalledWith({ provider: "openrouter", model: GPT.id, hidden: true }),
      );
      expect(await within(rowOf("GPT-5 Image")).findByText("Hidden")).toBeInTheDocument();
    });

    it("toggling ★ sends favorite only, leaving «show in picker» as it was", async () => {
      remember("openrouter", [pref(GPT.id, { hidden: true })]);
      renderWithQuery(<ModelsPage />);
      const star = await screen.findByRole("button", { name: "Favorite GPT-5 Image" });
      await waitFor(() => expect(star).toBeEnabled());
      fireEvent.click(star);
      await waitFor(() =>
        expect(m.setModelPreference).toHaveBeenCalledWith({ provider: "openrouter", model: GPT.id, favorite: true }),
      );
      expect(star).toHaveAttribute("aria-pressed", "true");
      expect(screen.getByRole("switch", { name: "Show GPT-5 Image in picker" })).not.toBeChecked();
    });

    it("on a failed save, puts the toggle back and says so in that row only; the next success clears it", async () => {
      m.setModelPreference.mockRejectedValueOnce(busy);
      renderWithQuery(<ModelsPage />);
      const star = await screen.findByRole("button", { name: "Favorite GPT-5 Image" });
      await waitFor(() => expect(star).toBeEnabled());
      fireEvent.click(star);
      expect(await within(rowOf("GPT-5 Image")).findByText("Couldn't save — try again.")).toBeInTheDocument();
      expect(star).toHaveAttribute("aria-pressed", "false");
      expect(screen.getAllByText("Couldn't save — try again.")).toHaveLength(1);
      expect(within(rowOf("FLUX 2 Pro")).queryByText("Couldn't save — try again.")).not.toBeInTheDocument();
      m.setModelPreference.mockResolvedValueOnce(pref(GPT.id, { hidden: true }));
      fireEvent.click(screen.getByRole("switch", { name: "Show GPT-5 Image in picker" }));
      await waitFor(() => expect(screen.queryByText("Couldn't save — try again.")).not.toBeInTheDocument());
    });

    it("overlapping toggles: the first rejects after the second was started — its row still says so, the other row is unaffected (R1)", async () => {
      let rejectFirst!: (e: unknown) => void;
      let resolveSecond!: (v: ModelPreference) => void;
      m.setModelPreference
        .mockReturnValueOnce(new Promise((_, rej) => (rejectFirst = rej)))
        .mockReturnValueOnce(new Promise((res) => (resolveSecond = res)));
      renderWithQuery(<ModelsPage />);
      const gptStar = await screen.findByRole("button", { name: "Favorite GPT-5 Image" });
      await waitFor(() => expect(gptStar).toBeEnabled());
      fireEvent.click(gptStar);
      fireEvent.click(screen.getByRole("button", { name: "Favorite FLUX 2 Pro" }));
      await waitFor(() => expect(m.setModelPreference).toHaveBeenCalledTimes(2));
      await act(async () => rejectFirst(busy));
      expect(await within(rowOf("GPT-5 Image")).findByText("Couldn't save — try again.")).toBeInTheDocument();
      expect(gptStar).toHaveAttribute("aria-pressed", "false");
      m.modelPreferences.mockResolvedValue({ preferences: [pref(FLUX.id, { favorite: true })] }); // the server's truth
      await act(async () => resolveSecond(pref(FLUX.id, { favorite: true })));
      expect(screen.getByRole("button", { name: "Favorite FLUX 2 Pro" })).toHaveAttribute("aria-pressed", "true");
      expect(within(rowOf("FLUX 2 Pro")).queryByText("Couldn't save — try again.")).not.toBeInTheDocument();
      expect(within(rowOf("GPT-5 Image")).getByText("Couldn't save — try again.")).toBeInTheDocument();
    });
  });

  describe("provider states", () => {
    it("replaces a failed list with a message and Try again, other providers stay; Try again reloads", async () => {
      serve({ providers: [OR, VG], models: { openrouter: [GEMINI], vercel: busy } });
      renderWithQuery(<ModelsPage />);
      expect(await screen.findByText("Couldn't load the Vercel AI Gateway models.")).toBeInTheDocument();
      expect(screen.getAllByRole("table")).toHaveLength(1);
      expect(screen.getByText("Gemini 2.5 Flash Image")).toBeInTheDocument();
      m.models.mockResolvedValue({ models: [VERCEL_MODEL], fetchedAt: "x" });
      fireEvent.click(screen.getByRole("button", { name: "Try again" }));
      expect(await screen.findByText("Vercel Img")).toBeInTheDocument();
    });

    it("shows a provider with no key as not configured, with no table, requests or toggles", async () => {
      serve({ providers: [OR, { ...VG, configured: false }] });
      renderWithQuery(<ModelsPage />);
      expect(
        await screen.findByText("Vercel AI Gateway isn't configured — add its key to .env.local."),
      ).toBeInTheDocument();
      await screen.findByText("Gemini 2.5 Flash Image");
      expect(screen.getAllByRole("table")).toHaveLength(1);
      expect(m.models).not.toHaveBeenCalledWith("vercel");
      expect(m.modelPreferences).not.toHaveBeenCalledWith("vercel");
    });

    it("tells how to add a key when no provider is configured", async () => {
      serve({
        providers: [
          { ...OR, configured: false },
          { ...VG, configured: false },
        ],
      });
      renderWithQuery(<ModelsPage />);
      expect(
        await screen.findByText(
          "No provider is configured yet. Add an OpenRouter or Vercel AI Gateway key to .env.local and restart Ukiyo.",
        ),
      ).toBeInTheDocument();
      expect(screen.queryByRole("table")).not.toBeInTheDocument();
    });

    it("with unreadable preferences still lists models and prices, says so, disables toggles, no retired list", async () => {
      serve({ prefs: { openrouter: new ApiError(500, "INTERNAL", "x") } });
      renderWithQuery(<ModelsPage />);
      expect(await screen.findByText("Favorites and hidden models couldn't be loaded.")).toBeInTheDocument();
      expect(screen.getByText("GPT-5 Image")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Favorite GPT-5 Image" })).toBeDisabled();
      expect(screen.getByRole("switch", { name: "Show GPT-5 Image in picker" })).toBeDisabled();
      expect(screen.queryByText("No longer offered")).not.toBeInTheDocument();
      act(() => intersectAll());
      expect((await screen.findAllByText("$0.0184 / image")).length).toBeGreaterThan(0);
    });
  });

  describe("no longer offered", () => {
    const RETIRED = "retired/old-model";

    it("lists kept preferences of models the loaded list lacks, with their kind, and no others", async () => {
      serve({
        prefs: {
          openrouter: [
            pref(RETIRED, { favorite: true }),
            pref("gone/hidden", { hidden: true }),
            pref(GPT.id, { favorite: true }),
          ],
        },
      });
      renderWithQuery(<ModelsPage />);
      expect(await screen.findByText("No longer offered")).toBeInTheDocument();
      const retired = screen.getByText(RETIRED).closest("li") as HTMLElement;
      expect(within(retired).getByText("Favorite")).toBeInTheDocument();
      expect(
        within(screen.getByText("gone/hidden").closest("li") as HTMLElement).getByText("Hidden"),
      ).toBeInTheDocument();
      expect(screen.getAllByRole("button", { name: "Forget" })).toHaveLength(2);
    });

    it("never lists a model as no longer offered when the list failed", async () => {
      serve({ models: { openrouter: busy }, prefs: { openrouter: [pref(RETIRED, { favorite: true })] } });
      renderWithQuery(<ModelsPage />);
      await screen.findByText("Couldn't load the OpenRouter models.");
      await waitFor(() => expect(m.modelPreferences).toHaveBeenCalled());
      expect(screen.queryByText("No longer offered")).not.toBeInTheDocument();
      expect(screen.queryByText(RETIRED)).not.toBeInTheDocument();
    });

    it("Forget sends both flags off and removes the entry", async () => {
      remember("openrouter", [pref(RETIRED, { favorite: true })]);
      renderWithQuery(<ModelsPage />);
      fireEvent.click(await screen.findByRole("button", { name: "Forget" }));
      await waitFor(() =>
        expect(m.setModelPreference).toHaveBeenCalledWith({
          provider: "openrouter",
          model: RETIRED,
          favorite: false,
          hidden: false,
        }),
      );
      await waitFor(() => expect(screen.queryByText(RETIRED)).not.toBeInTheDocument());
    });

    it("keeps the entry and says «Couldn't forget — try again.» when Forget fails", async () => {
      serve({ prefs: { openrouter: [pref(RETIRED, { favorite: true })] } });
      m.setModelPreference.mockRejectedValue(busy);
      renderWithQuery(<ModelsPage />);
      fireEvent.click(await screen.findByRole("button", { name: "Forget" }));
      expect(await screen.findByText("Couldn't forget — try again.")).toBeInTheDocument();
      expect(screen.getByText(RETIRED)).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Forget" })).toBeEnabled();
    });

    it("overlapping Forgets that both fail: each says «Couldn't forget» and none stays in the spinner (R1)", async () => {
      serve({ prefs: { openrouter: [pref(RETIRED, { favorite: true }), pref("gone/hidden", { hidden: true })] } });
      let rejectFirst!: (e: unknown) => void;
      let rejectSecond!: (e: unknown) => void;
      m.setModelPreference
        .mockReturnValueOnce(new Promise((_, rej) => (rejectFirst = rej)))
        .mockReturnValueOnce(new Promise((_, rej) => (rejectSecond = rej)));
      renderWithQuery(<ModelsPage />);
      await screen.findByText("No longer offered");
      const [first, second] = screen.getAllByRole("button", { name: "Forget" });
      fireEvent.click(first as HTMLElement);
      fireEvent.click(second as HTMLElement);
      await waitFor(() => expect(m.setModelPreference).toHaveBeenCalledTimes(2));
      await act(async () => rejectFirst(busy));
      await act(async () => rejectSecond(busy));
      await waitFor(() => expect(screen.getAllByText("Couldn't forget — try again.")).toHaveLength(2));
      for (const b of screen.getAllByRole("button", { name: "Forget" })) expect(b).toBeEnabled();
    });

    it("a failed refetch over cached preferences disables the toggles and drops the retired list (R3)", async () => {
      serve({ prefs: { openrouter: [pref(RETIRED, { favorite: true })] } });
      const { client } = renderWithQuery(<ModelsPage />);
      await screen.findByText("No longer offered");
      m.modelPreferences.mockRejectedValue(new ApiError(500, "INTERNAL", "x"));
      await act(async () => {
        await client.refetchQueries({ queryKey: ["model-preferences", "openrouter"] });
      });
      expect(await screen.findByText("Favorites and hidden models couldn't be loaded.")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Favorite GPT-5 Image" })).toBeDisabled();
      expect(screen.getByRole("switch", { name: "Show GPT-5 Image in picker" })).toBeDisabled();
      expect(screen.queryByText("No longer offered")).not.toBeInTheDocument();
    });

    it("keeps the table and Forget when a list refetch fails after the page loaded, with an inline error (R5, AC-08)", async () => {
      remember("openrouter", [pref(RETIRED, { favorite: true })]);
      const { client } = renderWithQuery(<ModelsPage />);
      await screen.findByText("No longer offered");
      m.models.mockRejectedValue(busy);
      await act(async () => {
        await client.refetchQueries({ queryKey: ["models", "openrouter"] });
      });
      expect(await screen.findByText("Couldn't load the OpenRouter models.")).toBeInTheDocument();
      expect(screen.getByRole("table")).toBeInTheDocument();
      fireEvent.click(screen.getByRole("button", { name: "Forget" }));
      await waitFor(() => expect(screen.queryByText(RETIRED)).not.toBeInTheDocument());
    });

    it("observes rows again after an error then «Try again» that returns equal data (R5)", async () => {
      m.models.mockRejectedValueOnce(busy);
      renderWithQuery(<ModelsPage />);
      fireEvent.click(await screen.findByRole("button", { name: "Try again" }));
      await screen.findByText("GPT-5 Image");
      expect(m.price).not.toHaveBeenCalled();
      act(() => intersect(rowOf("GPT-5 Image")));
      expect(await within(rowOf("GPT-5 Image")).findByText("$0.0184 / image")).toBeInTheDocument();
    });
  });
});

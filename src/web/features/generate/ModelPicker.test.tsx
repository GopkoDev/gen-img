import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError, api } from "@/lib/api";
import { renderWithQuery } from "@/test-utils";
import type { ModelPreference } from "../../../shared/models";
import type { ModelPrice } from "../../../shared/pricing";
import type { ImageModel } from "../../../shared/providers";
import { ModelPicker } from "./ModelPicker";

vi.mock("@/lib/api", async (orig) => ({
  ...(await orig<typeof import("@/lib/api")>()),
  api: { price: vi.fn(), modelPreferences: vi.fn(), setModelPreference: vi.fn() },
}));
const m = vi.mocked(api);

const model = (id: string, name: string): ImageModel => ({ id, name, params: {} });
const GEMINI = model("google/gemini-2.5-flash-image", "Gemini 2.5 Flash Image");
const GPT = model("openai/gpt-5-image", "GPT-5 Image");
const SEEDREAM = model("bytedance/seedream-4", "Seedream 4");
const FLUX = model("bfl/flux-2-pro", "FLUX 2 Pro");
const MODELS = [GEMINI, GPT, SEEDREAM, FLUX];

const pref = (m: ImageModel, over: Partial<ModelPreference> = {}): ModelPreference => ({
  provider: "openrouter",
  model: m.id,
  favorite: false,
  hidden: false,
  updatedAt: "2026-10-19T10:00:00.000Z",
  ...over,
});
const perImage = (min: number, max = min): ModelPrice => ({
  kind: "per-image",
  output: { minUsd: min, maxUsd: max },
  input: null,
});

function show(props: { value?: string; models?: ImageModel[]; onChange?: (id: string) => void } = {}) {
  const onChange = props.onChange ?? vi.fn();
  const view = renderWithQuery(
    <ModelPicker
      provider="openrouter"
      models={props.models ?? MODELS}
      value={props.value ?? GPT.id}
      onChange={onChange}
    />,
  );
  return { onChange, ...view };
}
async function open() {
  fireEvent.click(screen.getAllByRole("button")[0] as HTMLElement);
  await screen.findByRole("button", { name: "Favorite GPT-5 Image" });
}
const star = (name: string) => screen.getByRole("button", { name: `Favorite ${name}` });

/** A server that remembers saves, so the refetch after a toggle settles returns what was saved. */
function persistSaves(initial: ModelPreference[] = []) {
  const stored = [...initial];
  m.modelPreferences.mockImplementation(async () => ({ preferences: [...stored] }));
  return (saved: ModelPreference) => {
    const at = stored.findIndex((p) => p.model === saved.model);
    if (at >= 0) stored.splice(at, 1);
    if (saved.favorite) stored.push(saved);
    return saved;
  };
}

beforeEach(() => {
  vi.resetAllMocks();
  m.modelPreferences.mockResolvedValue({ preferences: [] });
  m.price.mockResolvedValue({ price: perImage(0.039), fetchedAt: "x" });
});

describe("ModelPicker (SCR-07)", () => {
  it("shows the selected model on a closed trigger and looks nothing up until it opens", () => {
    show();
    const t = screen.getAllByRole("button")[0] as HTMLElement;
    expect(t).toHaveTextContent("GPT-5 Image");
    expect(t).toHaveAttribute("aria-expanded", "false");
    expect(m.price).not.toHaveBeenCalled();
  });

  it("lists one plain list without group labels when there are no favorites", async () => {
    show();
    await open();
    expect(screen.getAllByRole("button", { name: /^Favorite / })).toHaveLength(4);
    expect(screen.queryByText("Favorites")).not.toBeInTheDocument();
    expect(screen.queryByText("All models")).not.toBeInTheDocument();
    expect(screen.getByText(GEMINI.id)).toBeInTheDocument();
  });

  it("groups favorites first and every other model below, each in the provider's order", async () => {
    m.modelPreferences.mockResolvedValue({
      preferences: [pref(FLUX, { favorite: true }), pref(GEMINI, { favorite: true })],
    });
    show();
    fireEvent.click(screen.getAllByRole("button")[0] as HTMLElement);
    await screen.findByText("Favorites");
    expect(screen.getByText("All models")).toBeInTheDocument();
    const order = screen.getAllByRole("button", { name: /^Favorite / }).map((b) => b.getAttribute("aria-label"));
    expect(order).toEqual([
      "Favorite Gemini 2.5 Flash Image",
      "Favorite FLUX 2 Pro",
      "Favorite GPT-5 Image",
      "Favorite Seedream 4",
    ]);
    expect(star("FLUX 2 Pro")).toHaveAttribute("aria-pressed", "true");
    expect(star("Seedream 4")).toHaveAttribute("aria-pressed", "false");
  });

  it("shows each entry's price in short form, per state", async () => {
    m.price.mockImplementation(async (_p, id) => {
      if (id === GEMINI.id) return { price: perImage(0.0184), fetchedAt: "x" };
      if (id === GPT.id) return { price: { kind: "per-token" }, fetchedAt: "x" };
      if (id === SEEDREAM.id) return { price: perImage(0.045, 0.151), fetchedAt: "x" };
      return { price: { kind: "unknown" }, fetchedAt: "x" };
    });
    show();
    await open();
    expect(await screen.findByText("$0.0184 / image")).toBeInTheDocument();
    expect(await screen.findByText("priced per token")).toBeInTheDocument();
    expect(await screen.findByText("$0.045–$0.151 / image")).toBeInTheDocument();
    expect(await screen.findByText("price unknown")).toBeInTheDocument();
    expect(m.price).toHaveBeenCalledWith("openrouter", FLUX.id);
  });

  it("says «price unknown — couldn't load» for a failed lookup and tries it only once per opening", async () => {
    m.price.mockImplementation(async (_p, id) => {
      if (id === FLUX.id) throw new ApiError(502, "PROVIDER_ERROR", "busy");
      return { price: perImage(0.03), fetchedAt: "x" };
    });
    show();
    await open();
    expect(await screen.findByText("price unknown — couldn't load")).toBeInTheDocument();
    expect(m.price.mock.calls.filter(([, id]) => id === FLUX.id)).toHaveLength(1);
  });

  it("shows «…» while a price is in flight, and choosing works before any price arrived", async () => {
    m.price.mockReturnValue(new Promise(() => {}));
    const { onChange } = show();
    await open();
    expect(screen.getAllByText("…")).toHaveLength(4);
    fireEvent.click(screen.getByRole("button", { name: /^Seedream 4/ }));
    expect(onChange).toHaveBeenCalledWith(SEEDREAM.id);
  });

  it("chooses a model and closes the list", async () => {
    const { onChange } = show();
    await open();
    fireEvent.click(screen.getByRole("button", { name: /^FLUX 2 Pro/ }));
    expect(onChange).toHaveBeenCalledWith(FLUX.id);
    await waitFor(() => expect(screen.queryByRole("button", { name: "Favorite FLUX 2 Pro" })).not.toBeInTheDocument());
  });

  it("toggles a favorite with ★ without choosing it, keeps the list open, and moves the row to its group", async () => {
    const save = persistSaves();
    m.setModelPreference.mockImplementation(async () => save(pref(SEEDREAM, { favorite: true })));
    const { onChange } = show();
    await open();
    expect(star("Seedream 4").tagName).toBe("BUTTON");
    expect(star("Seedream 4")).not.toHaveAttribute("tabindex", "-1");
    fireEvent.click(star("Seedream 4"));
    await waitFor(() => expect(star("Seedream 4")).toHaveAttribute("aria-pressed", "true"));
    expect(m.setModelPreference).toHaveBeenCalledWith({ provider: "openrouter", model: SEEDREAM.id, favorite: true });
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByText("Favorites")).toBeInTheDocument();
    expect(star("GPT-5 Image")).toBeInTheDocument(); // still open
  });

  it("keeps focus on the ★ and the list open when a toggle moves the row to another group (R1)", async () => {
    const save = persistSaves();
    m.setModelPreference.mockImplementation(async () => save(pref(SEEDREAM, { favorite: true })));
    show();
    await open();
    star("Seedream 4").focus();
    fireEvent.click(star("Seedream 4"));
    await waitFor(() => expect(star("Seedream 4")).toHaveAttribute("aria-pressed", "true"));
    expect(screen.getByText("Favorites")).toBeInTheDocument();
    expect(star("Seedream 4")).toHaveFocus();
    expect(star("GPT-5 Image")).toBeInTheDocument(); // still open
  });

  it("does not look a failed price up again when its ★ is toggled (R1, AC-02)", async () => {
    m.price.mockImplementation(async (_p, id) => {
      if (id === FLUX.id) throw new ApiError(502, "PROVIDER_ERROR", "busy");
      return { price: perImage(0.03), fetchedAt: "x" };
    });
    const save = persistSaves();
    m.setModelPreference.mockImplementation(async () => save(pref(FLUX, { favorite: true })));
    show();
    await open();
    expect(await screen.findByText("price unknown — couldn't load")).toBeInTheDocument();
    fireEvent.click(star("FLUX 2 Pro"));
    await waitFor(() => expect(star("FLUX 2 Pro")).toHaveAttribute("aria-pressed", "true"));
    await screen.findByText("price unknown — couldn't load");
    expect(m.price.mock.calls.filter(([, id]) => id === FLUX.id)).toHaveLength(1);
  });

  it("rolls back only the failed toggle and keeps a concurrent successful one (R2)", async () => {
    let failX!: () => void;
    const server: ModelPreference[] = [];
    m.modelPreferences.mockImplementation(async () => ({ preferences: [...server] }));
    m.setModelPreference.mockImplementation((req) => {
      if (req.model === SEEDREAM.id)
        return new Promise((_res, rej) => {
          failX = () => rej(new ApiError(500, "INTERNAL", "down"));
        });
      const saved = pref(GEMINI, { favorite: true });
      server.push(saved);
      return Promise.resolve(saved);
    });
    show();
    await open();
    fireEvent.click(star("Seedream 4")); // X, fails later
    fireEvent.click(star("Gemini 2.5 Flash Image")); // Y, succeeds
    await waitFor(() => expect(m.setModelPreference).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(star("Gemini 2.5 Flash Image")).toHaveAttribute("aria-pressed", "true"));
    failX();
    expect(await screen.findByText("Couldn't save the favorite — try again.")).toBeInTheDocument();
    await waitFor(() => expect(star("Seedream 4")).toHaveAttribute("aria-pressed", "false"));
    expect(star("Gemini 2.5 Flash Image")).toHaveAttribute("aria-pressed", "true");
  });

  it("refreshes preferences after a toggle settles (R2)", async () => {
    const save = persistSaves();
    m.setModelPreference.mockImplementation(async () => save(pref(SEEDREAM, { favorite: true })));
    show();
    await open();
    const before = m.modelPreferences.mock.calls.length;
    fireEvent.click(star("Seedream 4"));
    await waitFor(() => expect(m.modelPreferences.mock.calls.length).toBeGreaterThan(before));
  });

  it("shows a filled ★ on the closed trigger when the selected model is a favorite (R3)", async () => {
    m.modelPreferences.mockResolvedValue({ preferences: [pref(GPT, { favorite: true })] });
    show();
    expect(screen.queryByTestId("trigger-favorite")).not.toBeInTheDocument();
    fireEvent.click(screen.getAllByRole("button")[0] as HTMLElement);
    await screen.findByText("Favorites");
    fireEvent.keyDown(star("GPT-5 Image"), { key: "Escape" });
    await waitFor(() => expect(screen.queryByText("Favorites")).not.toBeInTheDocument());
    expect(screen.getByTestId("trigger-favorite")).toBeInTheDocument();
  });

  it("renders «priced per token» as an outline Badge (R3)", async () => {
    m.price.mockResolvedValue({ price: { kind: "per-token" }, fetchedAt: "x" });
    show();
    await open();
    const badges = await screen.findAllByText("priced per token");
    expect(badges[0]).toHaveAttribute("data-slot", "badge");
    expect(badges[0]).toHaveAttribute("data-variant", "outline");
  });

  it("unfavorites an already favorite model", async () => {
    const save = persistSaves([pref(GPT, { favorite: true })]);
    m.setModelPreference.mockImplementation(async () => save(pref(GPT, { favorite: false })));
    show();
    fireEvent.click(screen.getAllByRole("button")[0] as HTMLElement);
    await waitFor(() => expect(star("GPT-5 Image")).toHaveAttribute("aria-pressed", "true"));
    fireEvent.click(star("GPT-5 Image"));
    await waitFor(() => expect(star("GPT-5 Image")).toHaveAttribute("aria-pressed", "false"));
    expect(m.setModelPreference).toHaveBeenCalledWith({ provider: "openrouter", model: GPT.id, favorite: false });
  });

  it("reverts ★ and says so when the favorite can't be saved", async () => {
    m.setModelPreference.mockRejectedValue(new ApiError(502, "INTERNAL", "down"));
    const { onChange } = show();
    await open();
    fireEvent.click(star("GPT-5 Image"));
    expect(await screen.findByText("Couldn't save the favorite — try again.")).toBeInTheDocument();
    expect(star("GPT-5 Image")).toHaveAttribute("aria-pressed", "false");
    expect(onChange).not.toHaveBeenCalled();
  });

  it("leaves hidden models out of both groups", async () => {
    m.modelPreferences.mockResolvedValue({
      preferences: [pref(FLUX, { hidden: true, favorite: true }), pref(SEEDREAM, { hidden: true })],
    });
    show();
    fireEvent.click(screen.getAllByRole("button")[0] as HTMLElement);
    await screen.findByRole("button", { name: "Favorite GPT-5 Image" });
    expect(screen.queryByRole("button", { name: "Favorite FLUX 2 Pro" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Favorite Seedream 4" })).not.toBeInTheDocument();
    expect(screen.queryByText("Favorites")).not.toBeInTheDocument();
  });

  it("keeps a hidden selected model, first in «All models», marked «hidden»", async () => {
    m.modelPreferences.mockResolvedValue({
      preferences: [pref(FLUX, { hidden: true }), pref(GEMINI, { favorite: true })],
    });
    show({ value: FLUX.id });
    fireEvent.click(screen.getAllByRole("button")[0] as HTMLElement);
    await screen.findByText("All models");
    const stars = screen.getAllByRole("button", { name: /^Favorite / }).map((b) => b.getAttribute("aria-label"));
    expect(stars).toEqual([
      "Favorite Gemini 2.5 Flash Image",
      "Favorite FLUX 2 Pro",
      "Favorite GPT-5 Image",
      "Favorite Seedream 4",
    ]);
    const row = star("FLUX 2 Pro").parentElement as HTMLElement;
    expect(within(row).getByText("hidden")).toBeInTheDocument();
  });

  it("falls back to a plain list with everything, a notice and disabled ★ when preferences can't be read", async () => {
    m.modelPreferences.mockRejectedValue(new ApiError(500, "INTERNAL", "boom"));
    const { onChange } = show();
    fireEvent.click(screen.getAllByRole("button")[0] as HTMLElement);
    expect(await screen.findByText("Favorites couldn't be loaded.")).toBeInTheDocument();
    const stars = screen.getAllByRole("button", { name: /^Favorite / });
    expect(stars).toHaveLength(4);
    for (const s of stars) expect(s).toBeDisabled();
    expect(screen.queryByText("Favorites")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /^FLUX 2 Pro/ }));
    expect(onChange).toHaveBeenCalledWith(FLUX.id);
  });

  it("refetches preferences on every opening, so a change made elsewhere appears", async () => {
    show();
    await open();
    expect(screen.queryByText("Favorites")).not.toBeInTheDocument();
    fireEvent.keyDown(screen.getByRole("button", { name: "Favorite GPT-5 Image" }), { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("button", { name: "Favorite GPT-5 Image" })).not.toBeInTheDocument());
    m.modelPreferences.mockResolvedValue({ preferences: [pref(FLUX, { favorite: true })] });
    fireEvent.click(screen.getAllByRole("button")[0] as HTMLElement);
    expect(await screen.findByText("Favorites")).toBeInTheDocument();
    expect(m.modelPreferences).toHaveBeenCalledTimes(2);
    expect(m.modelPreferences).toHaveBeenCalledWith("openrouter");
  });

  it("closes on Escape and returns focus to the trigger", async () => {
    show();
    await open();
    fireEvent.keyDown(screen.getByRole("button", { name: "Favorite GPT-5 Image" }), { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("button", { name: "Favorite GPT-5 Image" })).not.toBeInTheDocument());
    expect(screen.getAllByRole("button")[0] as HTMLElement).toHaveFocus();
    expect(screen.getAllByRole("button")[0] as HTMLElement).toHaveAttribute("aria-expanded", "false");
  });

  it("moves between «choose» buttons with ↓ and ↑", async () => {
    show({ value: GEMINI.id });
    fireEvent.click(screen.getAllByRole("button")[0] as HTMLElement);
    await screen.findByRole("button", { name: "Favorite GPT-5 Image" });
    const choose = (n: RegExp) => screen.getByRole("button", { name: n });
    choose(/Gemini 2.5 Flash Image.*google/).focus();
    fireEvent.keyDown(document.activeElement as Element, { key: "ArrowDown" });
    expect(choose(/GPT-5 Image.*openai/)).toHaveFocus();
    fireEvent.keyDown(document.activeElement as Element, { key: "ArrowDown" });
    expect(choose(/Seedream 4.*bytedance/)).toHaveFocus();
    fireEvent.keyDown(document.activeElement as Element, { key: "ArrowUp" });
    expect(choose(/GPT-5 Image.*openai/)).toHaveFocus();
  });
});

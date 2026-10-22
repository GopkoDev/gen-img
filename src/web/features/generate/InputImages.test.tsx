import { act, fireEvent, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "@/lib/api";
import { renderWithQuery } from "@/test-utils";
import type { Job } from "../../../shared/generations";
import type { ImageModel } from "../../../shared/providers";
import { GeneratePanel } from "./GeneratePanel";

vi.mock("@/lib/api", async (orig) => ({
  ...(await orig<typeof import("@/lib/api")>()),
  api: {
    providers: vi.fn(),
    models: vi.fn(),
    modelPreferences: vi.fn(),
    setModelPreference: vi.fn(),
    currentJob: vi.fn(),
    startGeneration: vi.fn(),
    dismissJob: vi.fn(),
    generation: vi.fn(),
  },
}));
const m = vi.mocked(api);

const EDITOR: ImageModel = { id: "x/editor", name: "Editor", params: { inputs: { min: 0, max: 2 }, n: { max: 4 } } };
const EDIT_ONLY: ImageModel = { id: "x/edit-only", name: "Edit only", params: { inputs: { min: 1, max: 4 } } };
const TEXT: ImageModel = { id: "x/text", name: "Text only", params: {} };
const PNG = new Uint8Array([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13, 0x49, 0x48, 0x44, 0x52, 0, 0, 0, 2, 0, 0, 0, 3,
]);
const png = (name: string) => new File([PNG], name, { type: "image/png" });
const job = (over: Partial<Job>): Job => ({
  id: "J1",
  status: "running",
  startedAt: new Date().toISOString(),
  ...over,
});

async function attach(...files: File[]) {
  const input = screen.getByLabelText("Choose files");
  await act(async () => {
    fireEvent.change(input, { target: { files } });
  });
}

async function pickModel(name: string) {
  fireEvent.click(screen.getByRole("button", { name: "Model" }));
  fireEvent.click(await screen.findByRole("button", { name: new RegExp(`^${name}`) }));
}

describe("GeneratePanel — input images (SCR-01)", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    m.providers.mockResolvedValue({ providers: [{ id: "openrouter", name: "OpenRouter", configured: true }] });
    m.modelPreferences.mockResolvedValue({ preferences: [] });
    m.models.mockResolvedValue({ models: [EDITOR, EDIT_ONLY, TEXT], fetchedAt: new Date().toISOString() });
    m.currentJob.mockResolvedValue({ job: null });
  });

  it("offers the input area with the model's range and hides it for text-only models", async () => {
    renderWithQuery(<GeneratePanel />);
    expect(await screen.findByText("Up to 2 images · PNG, JPEG, WebP, GIF · max 10 MB each")).toBeInTheDocument();
    await pickModel("Edit only");
    expect(screen.getByText("1 to 4 images · PNG, JPEG, WebP, GIF · max 10 MB each")).toBeInTheDocument();
    await pickModel("Text only");
    expect(screen.queryByLabelText("Choose files")).not.toBeInTheDocument();
  });

  it("refuses an oversized file before reading it, and lists repeated refusals separately", async () => {
    const errors = vi.spyOn(console, "error").mockImplementation(() => {});
    renderWithQuery(<GeneratePanel />);
    await screen.findByLabelText("Choose files");
    const huge = new File([new Uint8Array(11 * 1024 * 1024)], "huge.png", { type: "image/png" });
    const read = vi.spyOn(huge, "arrayBuffer");
    await attach(huge);
    expect(await screen.findByText("huge.png — larger than 10 MB")).toBeInTheDocument();
    expect(read).not.toHaveBeenCalled();

    const bad = new File(["heic"], "x.heic", { type: "image/heic" });
    await attach(bad, bad);
    expect(await screen.findAllByText("x.heic — not a supported image")).toHaveLength(2);
    expect(errors.mock.calls.flat().join(" ")).not.toMatch(/same key/);
    errors.mockRestore();
  });

  it("refuses unsupported files with a reason and keeps the others", async () => {
    renderWithQuery(<GeneratePanel />);
    await screen.findByLabelText("Choose files");
    await attach(png("cat.png"), new File(["heic"], "photo.heic", { type: "image/heic" }));
    expect(await screen.findByText("photo.heic — not a supported image")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Remove cat.png" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Remove photo.heic" })).not.toBeInTheDocument();

    await pickModel("Edit only");
    expect(screen.queryByText("photo.heic — not a supported image")).not.toBeInTheDocument();
  });

  it("marks attachments beyond the maximum, also after switching models, and blocks Generate", async () => {
    renderWithQuery(<GeneratePanel />);
    await screen.findByLabelText("Choose files");
    fireEvent.change(screen.getByLabelText("Prompt"), { target: { value: "Combine" } });
    await attach(png("a.png"), png("b.png"), png("c.png"));
    expect(await screen.findByText("This model takes at most 2 input images — remove 1")).toBeInTheDocument();
    const third = screen.getByRole("listitem", { name: "c.png" });
    expect(within(third).getByText("not sent")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Generate" })).toBeDisabled();

    fireEvent.click(screen.getByRole("button", { name: "Remove c.png" }));
    expect(screen.getByRole("button", { name: "Generate" })).toBeEnabled();

    await pickModel("Text only");
    expect(screen.getByText("This model does not accept input images — remove 2")).toBeInTheDocument();
    expect(screen.getAllByText("not sent")).toHaveLength(2);
    expect(screen.getByRole("button", { name: "Generate" })).toBeDisabled();
  });

  it("blocks an edit-only model without inputs", async () => {
    renderWithQuery(<GeneratePanel />);
    await screen.findByLabelText("Choose files");
    await pickModel("Edit only");
    fireEvent.change(screen.getByLabelText("Prompt"), { target: { value: "Edit" } });
    fireEvent.click(screen.getByRole("button", { name: "Generate" }));
    expect(await screen.findByText("This model needs at least 1 input image")).toBeInTheDocument();
    expect(m.startGeneration).not.toHaveBeenCalled();
  });

  it("sends the attachments in order and keeps them after a failure", async () => {
    m.startGeneration.mockResolvedValue({ job: job({}) });
    renderWithQuery(<GeneratePanel />);
    await screen.findByLabelText("Choose files");
    fireEvent.change(screen.getByLabelText("Prompt"), { target: { value: "Combine" } });
    const a = png("a.png");
    const b = png("b.png");
    await attach(a, b);
    await screen.findByRole("button", { name: "Remove b.png" });
    m.currentJob.mockResolvedValue({
      job: job({ status: "failed", error: { code: "PROVIDER_ERROR", message: "Flagged input" } }),
    });
    fireEvent.click(screen.getByRole("button", { name: "Generate" }));
    await waitFor(() =>
      expect(m.startGeneration).toHaveBeenCalledWith(
        { provider: "openrouter", model: "x/editor", prompt: "Combine", params: { n: 1 } },
        [a, b],
      ),
    );
    expect(await screen.findByText("Flagged input")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Remove a.png" })).toBeInTheDocument();
  });

  it("keeps the attachments after a successful generation", async () => {
    m.startGeneration.mockResolvedValue({ job: job({}) });
    renderWithQuery(<GeneratePanel />);
    await screen.findByLabelText("Choose files");
    fireEvent.change(screen.getByLabelText("Prompt"), { target: { value: "Again" } });
    await attach(png("a.png"));
    await screen.findByRole("button", { name: "Remove a.png" });
    m.currentJob.mockResolvedValue({ job: job({ status: "succeeded", generationId: "01OK" }) });
    m.generation.mockResolvedValue(undefined as never);
    fireEvent.click(screen.getByRole("button", { name: "Generate" }));
    await waitFor(() => expect(m.startGeneration).toHaveBeenCalled());
    expect(await screen.findByText("Saved to gallery")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Remove a.png" })).toBeInTheDocument();
  });
});

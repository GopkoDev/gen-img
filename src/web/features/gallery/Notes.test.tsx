import { act, fireEvent, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError, api } from "@/lib/api";
import { renderWithQuery } from "@/test-utils";
import type { Generation } from "../../../shared/generations";
import { DialogBusyContext } from "./DialogBusy";
import { Detail, GenerationDetail } from "./GenerationDetail";

vi.mock("@/lib/api", async (orig) => ({
  ...(await orig<typeof import("@/lib/api")>()),
  api: { generation: vi.fn(), setComment: vi.fn(), addTag: vi.fn(), removeTag: vi.fn(), deleteGeneration: vi.fn() },
}));
const m = vi.mocked(api);

const gen = (over: Partial<Generation> = {}): Generation => ({
  id: "01X",
  provider: "openrouter",
  model: "m",
  prompt: "A cat",
  requestedParams: { n: 1 },
  acceptedParams: null,
  imagesRequested: 1,
  images: [
    {
      position: 1,
      url: "/api/files/generations/01X/output-1.png",
      mediaType: "image/png",
      width: 4,
      height: 3,
      byteSize: 9,
    },
  ],
  inputs: [],
  costMicros: 1,
  costStatus: "known",
  createdAt: "2026-10-18T14:02:11.000Z",
  durationMs: 1,
  rawRequest: {},
  rawResponse: {},
  tags: [],
  comment: null,
  source: null,
  derived: { items: [], total: 0 },
  ...over,
});

const notFound = async () => {
  throw new ApiError(404, "NOT_FOUND", "Generation not found");
};

describe("Notes card (SCR-02)", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("adds, edits, cancels and removes the comment, shown as plain text", async () => {
    m.generation.mockResolvedValue(gen());
    renderWithQuery(<GenerationDetail id="01X" />);
    fireEvent.click(await screen.findByRole("button", { name: "Add comment" }));
    fireEvent.change(screen.getByLabelText("Comment"), { target: { value: "<b>bold?</b>\nline two" } });
    expect(screen.getByText("21 / 2000")).toBeInTheDocument();
    const saved = { body: "<b>bold?</b>\nline two", updatedAt: "x" };
    m.setComment.mockResolvedValue({ comment: saved });
    m.generation.mockResolvedValue(gen({ comment: saved })); // the refreshed detail agrees with the save
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(m.setComment).toHaveBeenCalledWith("01X", "<b>bold?</b>\nline two"));
    const shown = await screen.findByTestId("comment-text");
    expect(shown.textContent).toBe("<b>bold?</b>\nline two"); // text, not markup
    expect(shown.querySelector("b")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Edit" }));
    fireEvent.change(screen.getByLabelText("Comment"), { target: { value: "changed" } });
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.getByTestId("comment-text").textContent).toBe("<b>bold?</b>\nline two");

    fireEvent.click(screen.getByRole("button", { name: "Edit" }));
    fireEvent.change(screen.getByLabelText("Comment"), { target: { value: "   " } });
    m.setComment.mockResolvedValue({ comment: null });
    m.generation.mockResolvedValue(gen());
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(await screen.findByText("No comment yet")).toBeInTheDocument();
  });

  it("refuses an over-long comment in place and keeps the text", async () => {
    m.generation.mockResolvedValue(gen());
    renderWithQuery(<GenerationDetail id="01X" />);
    fireEvent.click(await screen.findByRole("button", { name: "Add comment" }));
    fireEvent.change(screen.getByLabelText("Comment"), { target: { value: "x".repeat(2001) } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(screen.getByText("Comment must be at most 2 000 characters")).toBeInTheDocument();
    expect(screen.getByLabelText("Comment")).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByLabelText("Comment")).toHaveValue("x".repeat(2001));
    expect(m.setComment).not.toHaveBeenCalled();
  });

  it("adds a tag on Enter, refuses bad text and an 11th tag, removes with ×", async () => {
    m.generation.mockResolvedValue(gen({ tags: ["portrait"] }));
    renderWithQuery(<GenerationDetail id="01X" />);
    const input = await screen.findByLabelText("Add a tag");

    fireEvent.change(input, { target: { value: "a/b" } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(screen.getByText(/Tags may contain letters/)).toBeInTheDocument();
    expect(m.addTag).not.toHaveBeenCalled();

    m.addTag.mockResolvedValue({ tags: ["portrait", "neon city"] });
    fireEvent.change(input, { target: { value: " Neon  City " } });
    fireEvent.keyDown(input, { key: "Enter" });
    m.generation.mockResolvedValue(gen({ tags: ["portrait", "neon city"] })); // the refreshed detail agrees
    await waitFor(() => expect(m.addTag).toHaveBeenCalledWith("01X", " Neon  City "));
    expect(await screen.findByText("neon city")).toBeInTheDocument();
    expect(input).toHaveValue("");

    m.addTag.mockImplementation(async () => {
      throw new ApiError(400, "VALIDATION_ERROR", "x", { fields: { tag: "A generation can have at most 10 tags" } });
    });
    fireEvent.change(input, { target: { value: "eleven" } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(await screen.findByText("A generation can have at most 10 tags")).toBeInTheDocument();
    expect(input).toHaveValue("eleven");

    m.removeTag.mockResolvedValue({ tags: ["neon city"] });
    m.generation.mockResolvedValue(gen({ tags: ["neon city"] }));
    fireEvent.click(screen.getByRole("button", { name: "Remove tag portrait" }));
    await waitFor(() => expect(screen.queryByText("portrait")).not.toBeInTheDocument());
    expect(m.removeTag).toHaveBeenCalledWith("01X", "portrait");
  });

  it("switches to «no longer exists» when the generation was deleted elsewhere", async () => {
    m.generation.mockResolvedValueOnce(gen());
    renderWithQuery(<GenerationDetail id="01X" />);
    const input = await screen.findByLabelText("Add a tag");
    m.addTag.mockImplementation(notFound);
    m.generation.mockImplementation(notFound);
    fireEvent.change(input, { target: { value: "late" } });
    await act(async () => fireEvent.keyDown(input, { key: "Enter" }));
    expect(await screen.findByText("This generation no longer exists.")).toBeInTheDocument();
  });
});

describe("Notes inside the dialog layout", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("reports busy for an unsaved draft and typed tag text, and balances on clear", async () => {
    const report = vi.fn();
    renderWithQuery(
      <DialogBusyContext.Provider value={report}>
        <Detail g={gen()} layout="dialog" />
      </DialogBusyContext.Provider>,
    );
    fireEvent.change(screen.getByLabelText("Add a tag"), { target: { value: "x" } });
    await waitFor(() => expect(report).toHaveBeenLastCalledWith(true));
    fireEvent.change(screen.getByLabelText("Add a tag"), { target: { value: "" } });
    await waitFor(() => expect(report).toHaveBeenLastCalledWith(false));
    fireEvent.click(screen.getByRole("button", { name: "Add comment" }));
    fireEvent.change(screen.getByLabelText("Comment"), { target: { value: "draft" } });
    await waitFor(() => expect(report).toHaveBeenLastCalledWith(true));
    expect(report.mock.calls.filter(([b]) => b).length).toBe(report.mock.calls.filter(([b]) => !b).length + 1);
  });

  it("a tag change patches the loaded gallery cache without invalidating it", async () => {
    m.generation.mockResolvedValue(gen());
    m.addTag.mockResolvedValue({ tags: ["neon"] });
    const { client } = renderWithQuery(<GenerationDetail id="01X" />);
    const card = { id: "01X", tags: [], hasComment: false };
    client.setQueryData(["generations"], { pages: [{ items: [card], nextCursor: null }], pageParams: [null] });
    const invalidate = vi.spyOn(client, "invalidateQueries");
    const input = await screen.findByLabelText("Add a tag");
    fireEvent.change(input, { target: { value: "neon" } });
    fireEvent.keyDown(input, { key: "Enter" });
    await waitFor(() =>
      expect(
        (client.getQueryData(["generations"]) as { pages: { items: { tags: string[] }[] }[] }).pages[0]?.items[0]?.tags,
      ).toEqual(["neon"]),
    );
    expect(invalidate.mock.calls.some(([f]) => JSON.stringify(f?.queryKey) === '["generations"]')).toBe(false);
  });
});

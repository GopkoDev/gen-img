import { act, fireEvent, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError, api } from "@/lib/api";
import { renderWithQuery } from "@/test-utils";
import type { Generation } from "../../../shared/generations";
import { GenerationDetail } from "./GenerationDetail";

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
    m.setComment.mockResolvedValue({ comment: { body: "<b>bold?</b>\nline two", updatedAt: "x" } });
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

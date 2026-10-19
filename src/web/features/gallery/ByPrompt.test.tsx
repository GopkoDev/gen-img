import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "@/lib/api";
import { renderWithQuery, summary } from "@/test-utils";
import { intersect } from "../../../../tests/helpers/intersection";
import type { PromptGroup } from "../../../shared/generations";
import { ByPrompt } from "./ByPrompt";
import { resetGalleryScroll } from "./scrollMemory";

vi.mock("@/lib/api", () => ({ api: { promptGroups: vi.fn(), generations: vi.fn() } }));
const m = vi.mocked(api);

const key = (i: number) => i.toString(16).padStart(32, "0");
const group = (i: number, over: Partial<PromptGroup> = {}): PromptGroup => ({
  key: key(i),
  prompt: `Prompt number ${i}\nsecond line`,
  count: 5,
  images: 9,
  models: [{ provider: "openrouter", model: "seedream" }],
  moreModels: 0,
  latestId: summary(i).id,
  cover: { url: `/img/${i}.png`, width: 10, height: 10 },
  ...over,
});

beforeEach(() => {
  vi.resetAllMocks();
  resetGalleryScroll();
  window.history.replaceState(null, "", "/gallery?view=prompts");
});

describe("ByPrompt (SCR-11)", () => {
  it("shows loading, then a group card linking to its prompt view with counts, models and +K", async () => {
    m.promptGroups.mockResolvedValue({
      groups: [
        group(1, {
          models: [
            { provider: "openrouter", model: "a" },
            { provider: "vercel", model: "b" },
            { provider: "vercel", model: "c" },
          ],
          moreModels: 2,
        }),
        group(2, { count: 1, images: 1 }),
      ],
      nextCursor: null,
    });
    renderWithQuery(<ByPrompt single={false} />);
    expect(screen.getByText("Loading…")).toBeInTheDocument();
    const links = await screen.findAllByRole("link");
    expect(m.promptGroups).toHaveBeenCalledWith(undefined, false);
    expect(links[0]).toHaveAttribute("href", `/gallery?prompt=${key(1)}`);
    const first = within(links[0] as HTMLElement);
    expect(first.getByText("5 generations · 9 images")).toBeInTheDocument();
    expect(first.getByText(/Prompt number 1/)).toHaveAttribute("title", "Prompt number 1\nsecond line");
    expect(first.getByText("+2")).toBeInTheDocument();
    expect(first.getAllByText(/^[abc]$|· [abc]$/)).toHaveLength(3);
    expect(within(links[1] as HTMLElement).getByText("1 generation · 1 image")).toBeInTheDocument();
    expect(screen.getByText("That's everything")).toBeInTheDocument();
  });

  it("falls back to 'Image unavailable' when the cover fails", async () => {
    m.promptGroups.mockResolvedValue({ groups: [group(1)], nextCursor: null });
    renderWithQuery(<ByPrompt single={false} />);
    fireEvent.error(await screen.findByRole("img"));
    expect(screen.getByText("Image unavailable")).toBeInTheDocument();
  });

  it("the switch pushes the single-use address and back", async () => {
    m.promptGroups.mockResolvedValue({ groups: [group(1)], nextCursor: null });
    renderWithQuery(<ByPrompt single={false} />);
    fireEvent.click(await screen.findByRole("switch", { name: "Include single-use prompts" }));
    expect(window.location.pathname + window.location.search).toBe("/gallery?view=prompts&single=1");
  });

  it("pages by cursor when the sentinel is in view", async () => {
    m.promptGroups
      .mockResolvedValueOnce({ groups: [group(1)], nextCursor: "c1" })
      .mockResolvedValueOnce({ groups: [group(2)], nextCursor: null });
    renderWithQuery(<ByPrompt single={true} />);
    intersect(await screen.findByTestId("gallery-sentinel"));
    await waitFor(() => expect(screen.getAllByRole("link")).toHaveLength(2));
    expect(m.promptGroups).toHaveBeenLastCalledWith("c1", true);
  });

  it("next page failed shows Couldn't load more. + Try again", async () => {
    m.promptGroups
      .mockResolvedValueOnce({ groups: [group(1)], nextCursor: "c1" })
      .mockRejectedValueOnce(new Error("x"));
    renderWithQuery(<ByPrompt single={false} />);
    fireEvent.click(await screen.findByRole("button", { name: "Load more" }));
    expect(await screen.findByText("Couldn't load more.")).toBeInTheDocument();
  });

  it("first page error shows the message and retries", async () => {
    m.promptGroups
      .mockRejectedValueOnce(new Error("x"))
      .mockResolvedValueOnce({ groups: [group(1)], nextCursor: null });
    renderWithQuery(<ByPrompt single={false} />);
    expect(await screen.findByText("Couldn't load your prompts.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(await screen.findAllByRole("link")).toHaveLength(1);
  });

  it("a failed refresh keeps the groups with 'These may be out of date.'", async () => {
    m.promptGroups
      .mockResolvedValueOnce({ groups: [group(1)], nextCursor: null })
      .mockRejectedValueOnce(new Error("x"));
    const { client } = renderWithQuery(<ByPrompt single={false} />);
    await screen.findAllByRole("link");
    await client.refetchQueries({ queryKey: ["generations", "prompts"] });
    expect(await screen.findByText("These may be out of date.")).toBeInTheDocument();
    expect(screen.getAllByRole("link")).toHaveLength(1);
  });

  it("none reused: says so and keeps the switch, never 'No generations yet.'", async () => {
    m.promptGroups.mockResolvedValue({ groups: [], nextCursor: null });
    m.generations.mockResolvedValue({ items: [summary(1)], nextCursor: null });
    renderWithQuery(<ByPrompt single={false} />);
    expect(await screen.findByText("No prompt is used more than once yet.")).toBeInTheDocument();
    expect(screen.getByRole("switch", { name: "Include single-use prompts" })).toBeInTheDocument();
    expect(screen.queryByText("No generations yet.")).not.toBeInTheDocument();
  });

  it("empty gallery: No generations yet. + Write a prompt", async () => {
    m.promptGroups.mockResolvedValue({ groups: [], nextCursor: null });
    m.generations.mockResolvedValue({ items: [], nextCursor: null });
    renderWithQuery(<ByPrompt single={false} />);
    expect(await screen.findByText("No generations yet.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Write a prompt" })).toBeInTheDocument();
  });
});

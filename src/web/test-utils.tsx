import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render } from "@testing-library/react";
import type { ReactElement } from "react";
import type { GenerationSummary } from "../shared/generations";

export function renderWithQuery(ui: ReactElement) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

export function summary(i: number, over: Partial<GenerationSummary> = {}): GenerationSummary {
  const id = `01G${String(i).padStart(23, "0")}`;
  return {
    id,
    provider: "openrouter",
    model: "qwen/qwen-image-2.1-turbo",
    prompt: `A test prompt number ${i}`,
    createdAt: new Date(Date.now() - 120_000).toISOString(),
    costMicros: 40000,
    costStatus: "known",
    imagesRequested: 1,
    imagesReceived: 1,
    inputsCount: 0,
    thumbnail: {
      position: 1,
      url: `/api/files/generations/${id}/output-1.png`,
      mediaType: "image/png",
      width: 4,
      height: 3,
      byteSize: 10,
    },
    ...over,
  };
}

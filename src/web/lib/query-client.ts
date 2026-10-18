import { QueryClient } from "@tanstack/react-query";
import { ApiError } from "./api";

/** Client errors (4xx — «not found», validation, busy) are answers, not glitches: show them at once. */
export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: (failures, error) => !(error instanceof ApiError && error.status < 500) && failures < 3,
      },
    },
  });
}

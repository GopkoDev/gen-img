import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { ApiError, api } from "@/lib/api";
import { describeEstimate, describeUnitPrice, estimate } from "../../../shared/pricing";
import type { ProviderId } from "../../../shared/providers";

const TEN_MINUTES = 10 * 60 * 1000; // the server caches prices for as long (ADR-0020)

function usePrice(provider: ProviderId, model: string) {
  return useQuery({
    queryKey: ["price", provider, model],
    queryFn: () => api.price(provider, model),
    enabled: model !== "",
    staleTime: TEN_MINUTES,
  });
}

/** SCR-01: the selected model's published price, under the model picker. Never blocks generating. */
export function PriceLine({ provider, model }: { provider: ProviderId; model: string }) {
  const q = usePrice(provider, model);
  if (!model) return null;
  if (q.isPending) return <p className="text-muted-foreground text-sm">Price: loading…</p>;
  // A model the provider doesn't offer has no published price — that is «unknown», not a failed load.
  if (q.isError && q.error instanceof ApiError && q.error.status === 404)
    return <p className="text-muted-foreground text-sm">Price unknown</p>;
  if (q.isError) return <p className="text-muted-foreground text-sm">Price unknown — couldn't load</p>;
  const { price } = q.data;
  if (price.kind === "per-token")
    return (
      <p className="text-sm">
        <Badge variant="outline">{describeUnitPrice(price)}</Badge>
      </p>
    );
  return <p className="text-muted-foreground text-sm">{describeUnitPrice(price)}</p>;
}

/** SCR-01: the labelled estimate for this request, above Generate — computed here, never sent or stored (AC-08). */
export function EstimateLine({
  provider,
  model,
  images,
  inputs,
}: {
  provider: ProviderId;
  model: string;
  images: number;
  inputs: number;
}) {
  const q = usePrice(provider, model);
  const perToken = q.data?.price.kind === "per-token";
  const history = useQuery({
    queryKey: ["cost-history", provider, model],
    queryFn: () => api.costHistory(provider, model),
    enabled: perToken,
  });
  if (!q.data || (perToken && history.isPending)) return null;
  const text = describeEstimate(estimate(q.data.price, { images, inputs, history: history.data }), images, inputs);
  return text ? <p className="text-sm">{text}</p> : null;
}

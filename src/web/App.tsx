import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api";
import { Link, useRoute } from "@/lib/router";

export function App() {
  const health = useQuery({ queryKey: ["health"], queryFn: api.health });
  const label = health.isPending ? "checking…" : health.isSuccess ? "server ok" : "server unreachable";
  const route = useRoute();

  return (
    <div className="min-h-screen bg-background">
      <header className="flex items-center justify-between border-b px-6 py-4">
        <h1 className="font-semibold text-lg">
          <Link to="/">gen-img</Link>
        </h1>
        <Badge variant={health.isError ? "destructive" : "secondary"}>{label}</Badge>
      </header>
      {route.name === "detail" ? (
        <main className="p-6" data-testid="detail-page" />
      ) : (
        <main className="grid gap-6 p-6 lg:grid-cols-[380px_1fr]">
          <section aria-label="Generate" />
          <section aria-label="Gallery" />
        </main>
      )}
    </div>
  );
}

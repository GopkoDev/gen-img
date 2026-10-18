import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api";

export function App() {
  const health = useQuery({ queryKey: ["health"], queryFn: api.health });
  const label = health.isPending ? "checking…" : health.isSuccess ? "server ok" : "server unreachable";

  return (
    <div className="min-h-screen">
      <header className="flex items-center justify-between border-b px-6 py-4">
        <h1 className="font-semibold text-lg">gen-img</h1>
        <Badge variant={health.isError ? "destructive" : "secondary"}>{label}</Badge>
      </header>
      <main className="p-6 text-muted-foreground">Nothing here yet.</main>
    </div>
  );
}

import { Button } from "@/components/ui/button";
import { Link } from "@/lib/router";

/** SCR-05 — an address inside the app that is neither a section nor a generation. */
export function NotFound() {
  return (
    <div className="flex flex-col items-start gap-3">
      <h2 className="font-semibold text-lg">Page not found.</h2>
      <p className="text-muted-foreground">This address isn't part of Ukiyo.</p>
      <Button asChild>
        <Link to="/">Go to Generate</Link>
      </Button>
    </div>
  );
}

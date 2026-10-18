import { useEffect } from "react";
import { NavBar } from "@/components/NavBar";
import { NotFound } from "@/components/NotFound";
import { GenerationDetail } from "@/features/gallery/GenerationDetail";
import { useRoute } from "@/lib/router";
import { SECTIONS, sectionFor } from "@/sections";

/** The app frame: navigation bar + the current page (ADR-0022). Kept-mounted sections stay rendered, hidden (ADR-0023). */
export function App() {
  const route = useRoute();
  const current = sectionFor(route);

  useEffect(() => {
    document.title = current ? `${current.label} · Ukiyo` : "Page not found · Ukiyo";
  }, [current]);

  return (
    <div className="flex min-h-screen flex-col bg-background md:flex-row">
      <NavBar sections={SECTIONS} current={current} />
      <main className="min-w-0 flex-1 p-6">
        {/* Kept-mounted pages sit at a fixed place in the tree, so showing or hiding them never remounts them. */}
        {SECTIONS.filter((s) => s.keepMounted).map((s) => (
          <div key={s.id} hidden={s !== current || route.name === "detail"}>
            <s.page />
          </div>
        ))}
        {route.name === "detail" ? (
          <GenerationDetail id={route.id} />
        ) : !current ? (
          <NotFound />
        ) : (
          !current.keepMounted && <current.page />
        )}
      </main>
    </div>
  );
}

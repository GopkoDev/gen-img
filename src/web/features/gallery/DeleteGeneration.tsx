import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Trash2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { GALLERY_QUERY_KEY } from "@/features/gallery/Gallery";
import { ApiError, api } from "@/lib/api";
import { navigate } from "@/lib/router";
import type { Generation } from "../../../shared/generations";

const excerpt = (prompt: string) => (prompt.length > 80 ? `${prompt.slice(0, 80)}…` : prompt);

/** SCR-03 — Delete action + confirmation dialog. Failures are reported through `onFailed` (shown on SCR-02). */
export function DeleteGeneration({ g, onFailed }: { g: Generation; onFailed: (message: string | null) => void }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const del = useMutation({
    mutationFn: () => api.deleteGeneration(g.id),
    onMutate: () => onFailed(null),
    onSuccess: () => {
      qc.removeQueries({ queryKey: ["generation", g.id] });
      qc.invalidateQueries({ queryKey: GALLERY_QUERY_KEY });
      qc.invalidateQueries({ queryKey: ["generation-job"] }); // the panel's latest result may be this one
      setOpen(false);
      navigate("/?deleted=1");
    },
    onError: (err) => {
      setOpen(false);
      if (err instanceof ApiError && err.code === "NOT_FOUND") qc.invalidateQueries({ queryKey: ["generation", g.id] });
      else onFailed(err instanceof Error ? err.message : String(err));
    },
  });

  return (
    <Dialog open={open} onOpenChange={(next) => !del.isPending && setOpen(next)}>
      <Button variant="outline" className="text-destructive" onClick={() => setOpen(true)}>
        <Trash2 aria-hidden /> Delete
      </Button>
      <DialogContent showCloseButton={!del.isPending}>
        <DialogHeader>
          <DialogTitle>Delete this generation?</DialogTitle>
          <DialogDescription>
            <q className="block break-words">{excerpt(g.prompt)}</q>
            Its images and input copies will be removed from this machine. This can't be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={del.isPending}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            aria-label="Delete generation"
            onClick={() => del.mutate()}
            disabled={del.isPending}
          >
            {del.isPending && <Loader2 className="animate-spin" />}
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

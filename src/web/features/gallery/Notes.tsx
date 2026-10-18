import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, X } from "lucide-react";
import { type KeyboardEvent, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { GALLERY_QUERY_KEY } from "@/features/gallery/Gallery";
import { ApiError, api } from "@/lib/api";
import { checkComment, MAX_COMMENT_CHARS, normalizeTag } from "../../../shared/curation";
import type { Generation } from "../../../shared/generations";

/** A field error from the server, or the generic message; NOT_FOUND is handled by the caller. */
function fieldMessage(err: unknown, field: string): string {
  if (err instanceof ApiError) {
    const fields = err.details?.fields as Record<string, string> | undefined;
    return fields?.[field] ?? err.message;
  }
  return err instanceof Error ? err.message : String(err);
}

/** SCR-02 Notes card — one comment (explicit Save) and tags (saved per change), shown as plain text. */
export function Notes({ g }: { g: Generation }) {
  const qc = useQueryClient();
  const key = ["generation", g.id];
  const patch = (fields: Partial<Generation>) => {
    qc.setQueryData<Generation>(key, (old) => (old ? { ...old, ...fields } : old));
    qc.invalidateQueries({ queryKey: GALLERY_QUERY_KEY });
  };
  // A curation action on a generation deleted elsewhere: refetch the detail, which then says it no longer exists.
  const onGone = (err: unknown) => {
    if (err instanceof ApiError && err.code === "NOT_FOUND") {
      qc.invalidateQueries({ queryKey: key });
      return true;
    }
    return false;
  };

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [commentError, setCommentError] = useState<string | null>(null);
  const saveComment = useMutation({
    mutationFn: (body: string) => api.setComment(g.id, body),
    onSuccess: (res) => {
      patch({ comment: res.comment });
      setEditing(false);
    },
    onError: (err) => {
      if (!onGone(err)) setCommentError(fieldMessage(err, "body"));
    },
  });

  const [tagText, setTagText] = useState("");
  const [tagError, setTagError] = useState<string | null>(null);
  const addTag = useMutation({
    mutationFn: (raw: string) => api.addTag(g.id, raw),
    onSuccess: (res) => {
      patch({ tags: res.tags });
      setTagText("");
    },
    onError: (err) => {
      if (!onGone(err)) setTagError(fieldMessage(err, "tag"));
    },
  });
  const removeTag = useMutation({
    mutationFn: (tag: string) => api.removeTag(g.id, tag),
    onSuccess: (res) => patch({ tags: res.tags }),
    onError: (err) => {
      if (!onGone(err)) setTagError(fieldMessage(err, "tag"));
    },
  });

  function startEdit() {
    setDraft(g.comment?.body ?? "");
    setCommentError(null);
    setEditing(true);
  }

  function save() {
    const checked = checkComment(draft);
    if (!checked.ok) return setCommentError(checked.message);
    setCommentError(null);
    saveComment.mutate(draft);
  }

  function onTagKey(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key !== "Enter") return;
    e.preventDefault();
    const normalized = normalizeTag(tagText);
    if (!normalized.ok) return setTagError(normalized.message);
    setTagError(null);
    addTag.mutate(tagText);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Notes</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4 text-sm">
        {editing ? (
          <div className="flex flex-col gap-2">
            <label htmlFor="comment" className="sr-only">
              Comment
            </label>
            <Textarea
              id="comment"
              rows={5}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              disabled={saveComment.isPending}
              aria-invalid={commentError ? true : undefined}
              aria-describedby={commentError ? "comment-error" : undefined}
            />
            <div className="flex items-center justify-between gap-2">
              <span className="text-muted-foreground text-xs">
                {[...draft].length} / {MAX_COMMENT_CHARS}
              </span>
              <span className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={() => setEditing(false)} disabled={saveComment.isPending}>
                  Cancel
                </Button>
                <Button size="sm" onClick={save} disabled={saveComment.isPending}>
                  {saveComment.isPending && <Loader2 className="animate-spin" />}
                  Save
                </Button>
              </span>
            </div>
            {commentError && (
              <p id="comment-error" className="text-destructive">
                {commentError}
              </p>
            )}
          </div>
        ) : g.comment ? (
          <div className="flex items-start justify-between gap-4">
            <p data-testid="comment-text" className="min-w-0 whitespace-pre-wrap break-words">
              {g.comment.body}
            </p>
            <Button variant="outline" size="sm" onClick={startEdit}>
              Edit
            </Button>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-4">
            <p className="text-muted-foreground">No comment yet</p>
            <Button variant="outline" size="sm" onClick={startEdit}>
              Add comment
            </Button>
          </div>
        )}

        <div className="flex flex-col gap-2">
          {g.tags.length > 0 && (
            <ul className="flex flex-wrap gap-1" aria-label="Tags">
              {g.tags.map((tag) => (
                <li key={tag}>
                  <Badge variant="secondary" className="gap-1 pr-1">
                    {tag}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-4"
                      aria-label={`Remove tag ${tag}`}
                      disabled={removeTag.isPending}
                      onClick={() => removeTag.mutate(tag)}
                    >
                      <X />
                    </Button>
                  </Badge>
                </li>
              ))}
            </ul>
          )}
          <label htmlFor="add-tag" className="sr-only">
            Add a tag
          </label>
          <Input
            id="add-tag"
            placeholder="Add a tag…"
            value={tagText}
            onChange={(e) => setTagText(e.target.value)}
            onKeyDown={onTagKey}
            disabled={addTag.isPending}
            aria-invalid={tagError ? true : undefined}
            aria-describedby={tagError ? "tag-error" : undefined}
          />
          {tagError && (
            <p id="tag-error" className="text-destructive">
              {tagError}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

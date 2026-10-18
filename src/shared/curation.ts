import { z } from "zod";

// Curation rules shared by the generate form and the server (sad.md §4, spec AC-06…AC-08).
export const MAX_TAGS = 10;
export const MAX_TAG_CHARS = 32;
export const MAX_COMMENT_CHARS = 2000;

const TAG_RULE = `Tags may contain letters, digits, spaces, - and _ (1–${MAX_TAG_CHARS} characters)`;
const TAG_CHARS = /^[\p{L}\p{N} _-]+$/u;

/** Characters as the Owner sees them (code points), not UTF-16 units — matches SQLite `length()`. */
const charCount = (s: string) => [...s].length;

/** Trim, collapse inner whitespace, lower-case (any alphabet); refuse anything outside the rule. */
export function normalizeTag(raw: string): { ok: true; tag: string } | { ok: false; message: string } {
  const tag = raw.trim().replace(/\s+/g, " ").toLowerCase();
  if (tag.length === 0 || charCount(tag) > MAX_TAG_CHARS || !TAG_CHARS.test(tag))
    return { ok: false, message: TAG_RULE };
  return { ok: true, tag };
}

/** The comment is kept exactly as written; blank text means «remove the comment». */
export function checkComment(raw: string): { ok: true; body: string | null } | { ok: false; message: string } {
  if (raw.trim().length === 0) return { ok: true, body: null };
  if (charCount(raw) > MAX_COMMENT_CHARS) return { ok: false, message: "Comment must be at most 2 000 characters" };
  return { ok: true, body: raw };
}

export const Tag = z
  .string()
  .min(1)
  .max(MAX_TAG_CHARS * 2); // normalized server-side; ×2 bounds UTF-16 units
export const Comment = z.object({ body: z.string(), updatedAt: z.string() });
export type Comment = z.infer<typeof Comment>;

export const SetCommentRequest = z.object({ body: z.string({ error: "Comment must be text" }) });
export const AddTagRequest = z.object({
  tag: z.string({ error: "Tag must be text" }).max(200, { error: TAG_RULE }),
});
export const CommentResponse = z.object({ comment: Comment.nullable() });
export type CommentResponse = z.infer<typeof CommentResponse>;
export const TagsResponse = z.object({ tags: z.array(Tag).max(MAX_TAGS) });
export type TagsResponse = z.infer<typeof TagsResponse>;

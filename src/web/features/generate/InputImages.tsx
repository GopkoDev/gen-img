import { ImagePlus, X } from "lucide-react";
import { type DragEvent, useRef } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type Attachment = { id: string; file: File; url: string };

type Props = {
  attachments: Attachment[];
  /** The chosen model's input range; `undefined` = it takes no input images. */
  range: { min: number; max: number } | undefined;
  refused: string[];
  error?: string;
  disabled: boolean;
  onAdd: (files: File[]) => void;
  onRemove: (id: string) => void;
};

const FORMATS = "PNG, JPEG, WebP, GIF · max 10 MB each";

/** SCR-01 input-images area: picker + drop zone, thumbnails in attach order, refused files, over-limit marks. */
export function InputImages({ attachments, range, refused, error, disabled, onAdd, onRemove }: Props) {
  const fileInput = useRef<HTMLInputElement>(null);
  const max = range?.max ?? 0;
  const extra = Math.max(0, attachments.length - max);
  const plural = (k: number) => `${k} input image${k === 1 ? "" : "s"}`;
  const overMessage =
    extra === 0
      ? null
      : range
        ? `This model takes at most ${plural(max)} — remove ${extra}`
        : `This model does not accept input images — remove ${extra}`;

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    if (!disabled) onAdd([...e.dataTransfer.files]);
  };

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <span className="font-medium text-sm">Input images</span>
        {range && (
          <span className="text-muted-foreground text-xs">
            {attachments.length} / {max}
          </span>
        )}
      </div>
      {attachments.length > 0 && (
        <ul className="flex flex-wrap gap-2" aria-label="Attached input images">
          {attachments.map((a, i) => {
            const notSent = i >= max;
            return (
              <li key={a.id} aria-label={a.file.name} className="relative flex flex-col items-center gap-1">
                <img
                  src={a.url}
                  alt=""
                  className={cn("h-16 w-16 rounded-md border object-cover", notSent && "ring-2 ring-destructive")}
                />
                {notSent && <Badge variant="destructive">not sent</Badge>}
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute -top-2 -right-2 size-6 rounded-full bg-background"
                  aria-label={`Remove ${a.file.name}`}
                  disabled={disabled}
                  onClick={() => onRemove(a.id)}
                >
                  <X />
                </Button>
              </li>
            );
          })}
        </ul>
      )}
      {range && (
        <section
          aria-label="Drop input images"
          onDragOver={(e) => e.preventDefault()}
          onDrop={onDrop}
          className="flex flex-col items-center gap-2 rounded-lg border border-dashed p-4 text-center text-sm"
        >
          <span className="text-muted-foreground">Drop images here or</span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={disabled}
            onClick={() => fileInput.current?.click()}
          >
            <ImagePlus /> Choose files
          </Button>
          <input
            ref={fileInput}
            type="file"
            multiple
            accept="image/png,image/jpeg,image/webp,image/gif"
            aria-label="Choose files"
            className="sr-only"
            tabIndex={-1}
            disabled={disabled}
            onChange={(e) => {
              onAdd([...(e.target.files ?? [])]);
              e.target.value = "";
            }}
          />
          <span className="text-muted-foreground text-xs">
            {range.min >= 1 ? `${range.min} to ${range.max}` : `Up to ${range.max}`} images · {FORMATS}
          </span>
        </section>
      )}
      {refused.map((r, i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: the same refusal can repeat (the same file dropped twice)
        <p key={`${i}-${r}`} className="text-destructive text-sm">
          {r}
        </p>
      ))}
      {overMessage && <p className="text-destructive text-sm">{overMessage}</p>}
      {error && !overMessage && (
        <p id="inputs-error" className="text-destructive text-sm">
          {error}
        </p>
      )}
    </div>
  );
}

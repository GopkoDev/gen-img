import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ChevronDownIcon, StarIcon } from "lucide-react";
import { type ButtonHTMLAttributes, type KeyboardEvent, useEffect, useLayoutEffect, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { arrangeModels } from "../../../shared/model-groups";
import type { ModelPreference } from "../../../shared/models";
import type { ImageModel, ProviderId } from "../../../shared/providers";
import { useShortPrice } from "./PricePreview";
import { modelPreferencesKey, useModelPreferences } from "./useModelPreferences";

type Props = {
  provider: ProviderId;
  models: ImageModel[];
  value: string;
  onChange: (id: string) => void;
  disabled?: boolean;
  /** Extra attributes for the trigger button (the panel's label link and validation state). */
  triggerProps?: ButtonHTMLAttributes<HTMLButtonElement>;
};

type Prefs = { preferences: ModelPreference[] };

function Row({
  provider,
  model,
  selected,
  favorite,
  hidden,
  starDisabled,
  onChoose,
  onToggle,
}: {
  provider: ProviderId;
  model: ImageModel;
  selected: boolean;
  favorite: boolean;
  hidden: boolean;
  starDisabled: boolean;
  onChoose: () => void;
  onToggle: () => void;
}) {
  const price = useShortPrice(provider, model.id, true);
  return (
    <div className="flex items-center gap-1 rounded-md hover:bg-accent">
      <button
        type="button"
        data-choose=""
        data-selected={selected || undefined}
        onClick={onChoose}
        className="flex min-w-0 flex-1 flex-col items-start rounded-md px-2 py-1.5 text-left text-sm outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
      >
        <span className={cn("truncate font-medium", selected && "underline")}>{model.name}</span>
        <span className="truncate text-muted-foreground text-xs">{model.id}</span>
        <span className="min-w-24 text-muted-foreground text-xs">
          {price?.perToken ? <Badge variant="outline">{price.text}</Badge> : (price?.text ?? "…")}
        </span>
      </button>
      {hidden && <span className="text-muted-foreground text-xs">hidden</span>}
      <button
        type="button"
        data-star={model.id}
        aria-label={`Favorite ${model.name}`}
        aria-pressed={favorite}
        disabled={starDisabled}
        onClick={onToggle}
        className="rounded-md p-1.5 outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:opacity-50"
      >
        <StarIcon className={cn("size-4", favorite && "fill-current")} aria-hidden />
      </button>
    </div>
  );
}

/** SCR-07: the model picker — a popover list with groups, short prices and a ★ toggle per row (ADR-0028). */
export function ModelPicker({ provider, models, value, onChange, disabled, triggerProps }: Props) {
  const [open, setOpen] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const client = useQueryClient();
  const key = modelPreferencesKey(provider);

  const prefsQuery = useModelPreferences(provider, open);
  const unreadable = prefsQuery.isError;
  const prefs = prefsQuery.data?.preferences ?? null;
  const ready = open && (unreadable || prefs !== null);

  const toggle = useMutation({
    mutationFn: (v: { model: string; favorite: boolean }) => api.setModelPreference({ provider, ...v }),
    onMutate: async ({ model, favorite }) => {
      setSaveError(false);
      await client.cancelQueries({ queryKey: key });
      // Remember only this model's flag, so a rollback never touches another model's concurrent toggle.
      const was = client.getQueryData<Prefs>(key)?.preferences.find((p) => p.model === model);
      client.setQueryData<Prefs>(key, (old) => upsert(old, provider, model, { favorite }));
      return { model, was };
    },
    onError: (_e, _v, ctx) => {
      if (ctx)
        client.setQueryData<Prefs>(key, (old) =>
          upsert(old, provider, ctx.model, { favorite: ctx.was?.favorite ?? false }),
        );
      setSaveError(true);
    },
    onSuccess: (saved) => client.setQueryData<Prefs>(key, (old) => upsert(old, provider, saved.model, saved)),
    // cancelQueries above may have cancelled the on-open refetch: settle on the server's truth.
    onSettled: () => client.invalidateQueries({ queryKey: key }),
  });

  // A ★ toggle can move its row to the other group; keep the keyboard on that ★ (SCR-07).
  const toggled = useRef<string | null>(null);
  useLayoutEffect(() => {
    const id = toggled.current;
    if (!id || !listRef.current || (document.activeElement && document.activeElement !== document.body)) return;
    listRef.current.querySelector<HTMLElement>(`[data-star="${CSS.escape(id)}"]`)?.focus();
  });

  // Focus the selected row (else the first) once the list is there, unless the Owner is already in it.
  useEffect(() => {
    const list = listRef.current;
    if (!ready || !list || list.contains(document.activeElement)) return;
    (list.querySelector<HTMLElement>("[data-selected]") ?? list.querySelector<HTMLElement>("[data-choose]"))?.focus();
  }, [ready]);

  const arranged = arrangeModels(models, unreadable ? null : prefs, value);
  const flagsOf = new Map((prefs ?? []).map((p) => [p.model, p]));
  const selectedFavorite = flagsOf.get(value)?.favorite === true && !flagsOf.get(value)?.hidden;
  const selectedName = models.find((m) => m.id === value)?.name ?? (value || "Choose a model");

  const row = (model: ImageModel) => (
    <Row
      key={model.id}
      provider={provider}
      model={model}
      selected={model.id === value}
      favorite={flagsOf.get(model.id)?.favorite ?? false}
      hidden={model === arranged.hiddenSelected}
      starDisabled={unreadable}
      onChoose={() => {
        onChange(model.id);
        setOpen(false);
      }}
      onToggle={() => {
        toggled.current = model.id;
        toggle.mutate({ model: model.id, favorite: !(flagsOf.get(model.id)?.favorite ?? false) });
      }}
    />
  );

  const onListKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
    const buttons = [...(listRef.current?.querySelectorAll<HTMLElement>("[data-choose]") ?? [])];
    const at = buttons.indexOf(document.activeElement as HTMLElement);
    if (at < 0) return;
    e.preventDefault();
    buttons[Math.min(buttons.length - 1, Math.max(0, at + (e.key === "ArrowDown" ? 1 : -1)))]?.focus();
  };

  const grouped = arranged.favorites.length > 0;
  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) setSaveError(false);
      }}
    >
      <PopoverTrigger asChild>
        <Button
          {...triggerProps}
          type="button"
          variant="outline"
          disabled={disabled}
          className="w-full justify-between font-normal"
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setOpen(true);
            }
          }}
        >
          {selectedFavorite && (
            <StarIcon data-testid="trigger-favorite" className="size-4 shrink-0 fill-current" aria-hidden />
          )}
          <span className="min-w-0 flex-1 truncate text-left">{selectedName}</span>
          {arranged.hiddenSelected && <span className="text-muted-foreground text-xs">hidden</span>}
          <ChevronDownIcon className="size-4 opacity-50" aria-hidden />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-(--radix-popover-trigger-width) min-w-80 p-2">
        {/* biome-ignore lint/a11y/noStaticElementInteractions: arrow keys bubble up from the rows' buttons */}
        <div ref={listRef} onKeyDown={onListKey} className="flex max-h-96 flex-col gap-0.5 overflow-y-auto">
          {unreadable && <p className="px-2 py-1 text-muted-foreground text-xs">Favorites couldn't be loaded.</p>}
          {saveError && (
            <p role="alert" className="px-2 py-1 text-destructive text-xs">
              Couldn't save the favorite — try again.
            </p>
          )}
          {!ready && <p className="px-2 py-1 text-muted-foreground text-sm">Loading…</p>}
          {/* One flat keyed list: a row keeps its DOM node (focus, price query) when a ★ moves it between groups. */}
          {ready && [
            grouped && (
              <p key="group-favorites" className="px-2 pt-1 font-medium text-muted-foreground text-xs">
                Favorites
              </p>
            ),
            ...arranged.favorites.map(row),
            grouped && (
              <p key="group-others" className="px-2 pt-2 font-medium text-muted-foreground text-xs">
                All models
              </p>
            ),
            ...arranged.others.map(row),
          ]}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function upsert(old: Prefs | undefined, provider: ProviderId, model: string, change: Partial<ModelPreference>): Prefs {
  const list = old?.preferences ?? [];
  const current = list.find((p) => p.model === model);
  const next: ModelPreference = {
    provider,
    model,
    favorite: false,
    hidden: false,
    updatedAt: null,
    ...current,
    ...change,
  };
  return { preferences: current ? list.map((p) => (p.model === model ? next : p)) : [...list, next] };
}

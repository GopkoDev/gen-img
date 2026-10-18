---
status: approved         # draft | approved
feature_size: "M"
tool: "code"
updated_at: "2026-10-18"
---

# Screens — vercel-ai-gateway

> The canonical **screen manifest** — every screen in every state — produced by `screens` (between
> `api` and `tasks`) and read by `tasks`, `implement` and `review`. Deltas over the shipped
> [text-to-image-openrouter](../text-to-image-openrouter/screens.md) and
> [image-inputs-openrouter](../image-inputs-openrouter/screens.md) manifests; unchanged states are not repeated.

## Source

- **Tool:** code (from `docs/design-system.md`)
- **File:** inline wireframes below

## Screens

### SCR-01 — Generate panel: provider selector

| State | Trigger / condition | Components (from the inventory) | Source-ref |
|---|---|---|---|
| default | ≥ 1 provider configured; first configured one preselected (OpenRouter when both) | Select «Provider» (first field) listing «OpenRouter», «Vercel AI Gateway»; an unconfigured provider stays selectable and is suffixed «— not configured» | wireframe A |
| provider not configured | the selected provider has `configured: false` (AC-10) | replaces the form below the selector: «Vercel AI Gateway is not configured.» + «Add AI_GATEWAY_API_KEY to .env.local and restart gen-img. Your gallery is still available.» (OpenRouter: existing text) | wireframe B |
| switching provider | Owner picks the other provider | model list reloads («Loading models…»), first model preselected; prompt and attachments kept; attachments the new model can't take are marked per step-3 «over limit» | — |
| Vercel model selected | provider `vercel` | Aspect ratio and Seed fields absent; «Images» max 4 (image-only) or 1 (multimodal language model); input area per catalog | wireframe A |
| in progress | job running on any provider (AC-11) | provider and model selects disabled with the rest of the form; existing «Generating…» state | — |
| model list error / validation / failure / success | unchanged step-2/3 states, message names the selected provider | — | — |

```text
A — Vercel selected (image-only model)        B — Vercel selected, not configured
+-----------------------------------+         +-----------------------------------+
| Generate                          |         | Generate                          |
| Provider [ Vercel AI Gateway   v ]|         | Provider [ Vercel AI Gateway —    |
| Model    [ FLUX.2 [pro]        v ]|         |            not configured      v ]|
|           bfl/flux-2-pro          |         | Vercel AI Gateway is not          |
| Prompt   [                       ]|         | configured. Add AI_GATEWAY_API_KEY|
| Input images (if the model takes  |         | to .env.local and restart gen-img.|
|   images)                         |         | Your gallery is still available.  |
| Images   [ 1 ]  (max 4)           |         +-----------------------------------+
|                     [ Generate ]  |
+-----------------------------------+
```

### SCR-02 — Gallery: pending cost

| State | Trigger / condition | Components (from the inventory) | Source-ref |
|---|---|---|---|
| tile with pending cost | `costStatus = pending` (AC-05) | Badge outline «cost pending» next to the provider badge | wireframe C |
| auto-refresh | any loaded tile pending | gallery re-reads every 10 s until none pending; no visual spinner | — |
| mixed providers | both providers present (AC-12) | provider badge `openrouter · model` / `vercel · model` (existing tile) | wireframe C |

```text
C
+---------+ +---------+
|  img    | |  img    |
| A cat … | | Neon …  |
| [vercel · bfl/flux-2-pro] [cost pending] |
| [openrouter · qwen/…]                     |
+---------+ +---------+
```

### SCR-03 — Generation detail: pending cost + provider name

| State | Trigger / condition | Components (from the inventory) | Source-ref |
|---|---|---|---|
| cost pending | `costStatus = pending` (AC-05) | Cost row «pending» + Badge outline «pending» + muted «updates automatically»; never «$0» | wireframe D |
| cost resolved | re-read returns `known` / `unavailable` | existing known / unavailable rows | — |
| provider name | always (AC-12) | Provider row «Vercel AI Gateway» / «OpenRouter» | wireframe D |

```text
D
| Provider  Vercel AI Gateway             |
| Cost      pending [pending]             |
|           updates automatically         |
```

## New components

None — Select, Badge and the existing panels cover every state.

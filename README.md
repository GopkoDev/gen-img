# gen-img

Local image-generation workbench (OpenRouter + Vercel AI Gateway) with a gallery of every generation.

```sh
nvm use                          # Node 26
pnpm install
cp .env.example .env.local       # add OPENROUTER_API_KEY / AI_GATEWAY_API_KEY
pnpm dev                         # http://127.0.0.1:5173  (or: pnpm build && pnpm start → :8787)
```

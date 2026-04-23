# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Docker (both services together)
docker compose up --build

# UI (Vite dev server on :9000)
cd miraprompt-ui && npm run dev

# Server (Node --watch on :3001, exposed externally as :3011 via Docker)
cd miraprompt-server && npm run dev
```

No test suite or linter is configured. There is no build step needed for the server.

## Architecture

This is a monorepo with two packages: `miraprompt-ui` (Vue 3 + Quasar SPA) and `miraprompt-server` (Express, Node ESM).

### Server

- **Entry**: `src/index.js` — mounts CORS, static `/data`, and two API routers
- **Routes**: `src/routes/jobs.js` (jobs CRUD, prompt generation, run control) and `src/routes/saved-styles.js`
- **Persistence**: JSON files on disk under `MIRAPROMPT_DATA_DIR` (default `./data`). Jobs at `data/jobs/<slug>.json`, saved styles at `data/saved-styles.json`, generated images at `data/generated/`
- **Model catalog**: `src/assets/model-settings.json` — imported by `src/models.js` which re-exports it as `MODEL_CATALOG` alongside `getModelById`, `defaultExecutionConfig`, and `validateExecutionConfig`
- **Generation**: `src/providers/fal-ai.js` talks to the fal.ai API. The server downloads generated images locally and serves them via the `/data` static mount
- **Prompt transform**: `src/prompt-transform.js` converts a prompt payload (styles object + description) into a flat string for the AI provider

### UI

- **Entry**: `src/main.js` bootstraps Quasar, `src/App.vue` is the root component
- **All API calls**: `src/api/jobs.js` — a thin fetch wrapper; `resolveApiAssetUrl()` handles both absolute URLs and server-relative paths
- **Style data**: `src/assets/custom-styles.json` — global/category/subcategory style definitions. `src/utils/style-data.js` merges them and assigns scopes (`global`, `category`, `subcategory`)

### Model specificOptions and `mode`

Each model in `model-settings.json` has a `specificOptions` array. The `mode` field on an option drives UI behaviour:

| mode | behaviour |
|---|---|
| `'image'` | shows single-image upload/picker UI |
| `'images'` | shows multi-image upload/picker UI |
| `'character-chain-image'` | shows the Character Reference section; its presence makes the model "chain-compatible" |
| absent | option is a silent default passed to the API (no UI control rendered) |

The UI computes `inputImageKeys`, `inputImageMultiple`, and `isChainCompatibleModel` entirely from `specificOptions[].mode` — no model IDs are hardcoded for these behaviours.

### Prompt composition flow

1. User picks styles in the **Custom Styles** tab → stored in `selectedMap` (checkbox state) and `selectedPayload` (computed)
2. "Add to Prompt" copies the current selection into `promptDraft` (persistent across tab switches)
3. Saved styles added via **Saved Styles** tab → appended to `promptDraft.savedStyles`
4. **Prompt** tab shows `fullPromptPreview` and lets user add a description, then "Add to Job"
5. `AddToJobDialog` calls `POST /api/jobs/:slug/prompts` with the full payload
6. On success, `App.vue` clears `selectedMap`, `description`, and `promptDraft`

### Job execution flow

Jobs hold an array of prompts and an `execution` config (model, settings). Running a job (`POST /api/jobs/:slug/start`) iterates prompts sequentially, calling `transformPromptForFal` then the fal.ai provider. The server polls fal.ai, downloads the image, and streams progress back via `GET /api/jobs/:slug/progress` (polled by `JobDetail.vue`).

## Key files by concern

| Concern | File(s) |
|---|---|
| Model catalog & validation | `miraprompt-server/src/models.js`, `src/assets/model-settings.json` |
| Job storage helpers | `miraprompt-server/src/jobs.js` |
| Job/generation routes | `miraprompt-server/src/routes/jobs.js` |
| All server→UI API calls | `miraprompt-ui/src/api/jobs.js` |
| Style merging & scopes | `miraprompt-ui/src/utils/style-data.js` |
| Model settings UI | `miraprompt-ui/src/components/ModelsView.vue` |
| Job list & run control | `miraprompt-ui/src/components/JobsView.vue`, `JobDetail.vue` |
| Root app state & prompt flow | `miraprompt-ui/src/App.vue` |

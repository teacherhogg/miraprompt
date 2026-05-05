# obsidian-watcher — What It Does

## On startup — backfill

Before the live watcher fires, it walks the entire vault recursively and finds every `.md` file that doesn't already have a `![[...]]` wikilink pointing to a file inside `_generated/`. Those files are queued and processed with concurrency=2. This catches up on any notes added while the service was offline.

## Live watching — `add` events only

The watcher only listens to chokidar's `'add'` event — **not `'change'` and not `'unlink'`**:

- **File changed**: ignored completely. Once a file has been processed, editing it does nothing.
- **File deleted**: ignored completely. The manifest and Showcase Summary are never cleaned up when a file disappears.

## Processing pipeline (for each new/unprocessed `.md` file)

1. **2-second debounce** to let the file finish writing.
2. **Claude analysis** (`src/analyzer.js`): fetches your saved styles and available models from miraprompt-server, then calls Claude (Haiku by default) to produce:
   - An `imagePrompt` — a concrete visual description of the note's theme
   - Up to 5 `selectedStylePrompts` chosen from your saved styles
   - A `modelId` from the available text-to-image models
   - A `jobName` slug
3. **Image generation** (`src/generator.js`): creates a temporary job in miraprompt-server, applies the model/settings, adds the prompt and styles, starts the job, and polls until done (up to 5 minutes). Retrieves the `localFilePath` of the generated image.
4. **Write to vault** (`src/vault.js`):
   - Copies the image into `<vault>/_generated/<jobname>.png`
   - Inserts `![[jobname.png]]` into the markdown file — after the first H1 heading if one exists, otherwise prepended to the top
   - Updates `_generated/.manifest.json` with the image→markdown mapping plus category/subcategory derived from folder depth
   - Rebuilds `Showcase Summary.md`

## Showcase Summary.md (`src/index-builder.js`)

- Reads `.manifest.json` and skips any entries whose image file no longer exists on disk
- Groups entries by **category** (top-level subfolder) and **subcategory** (second-level subfolder); root-level files go into "(Uncategorized)"
- Renders an HTML `<div>` grid (Obsidian renders it in reading view) with thumbnail, title link, and breadcrumb metadata
- Written atomically via a `.tmp` file then renamed

## What is NOT handled

| Event | Behaviour |
|---|---|
| File edited (`change`) | Ignored — no re-generation triggered |
| File deleted (`unlink`) | Ignored — manifest entry and Showcase Summary entry persist until the image file itself is manually deleted |
| Stale manifest entries | Skipped silently when rebuilding Showcase Summary if the image file is missing, but never removed from `.manifest.json` |

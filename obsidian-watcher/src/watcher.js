import chokidar from 'chokidar';
import path from 'path';
import { promises as fs } from 'fs';
import { analyzeMarkdown } from './analyzer.js';
import { generateImage } from './generator.js';
import { writeImageToVault } from './vault.js';

const DEBOUNCE_MS = 2000;
const BACKFILL_CONCURRENCY = 2;

export function startWatcher(config) {
  const pendingTimers = new Map();
  const processing = new Set();
  let imagesGenerated = 0;

  const onSuccess = () => { imagesGenerated++; };
  const limitReached = () => config.testingMaxImages > 0 && imagesGenerated >= config.testingMaxImages;

  const ignored = [
    path.join(config.vaultPath, config.attachmentsDir, '**'),
    /(^|[/\\])\../,  // dotfiles
  ];

  const watcher = chokidar.watch(config.vaultPath, {
    ignored,
    ignoreInitial: true,
    persistent: true,
    awaitWriteFinish: { stabilityThreshold: 500, pollInterval: 100 },
  });

  if (config.testingMaxImages > 0) {
    console.log(`  Testing mode: will stop after ${config.testingMaxImages} image(s)`);
  }

  watcher.on('add', (filePath) => {
    if (!filePath.endsWith('.md')) return;
    if (limitReached()) return;
    scheduleProcess(filePath, config, pendingTimers, processing, onSuccess, limitReached);
  });

  watcher.on('error', (err) => console.error('Watcher error:', err));

  console.log(`Watching for new markdown files in: ${config.vaultPath}`);

  // Fire-and-forget: backfill runs concurrently with the live watcher
  backfillVault(config, processing, onSuccess, limitReached).catch((err) =>
    console.error('Backfill error:', err.message)
  );

  return watcher;
}

function scheduleProcess(filePath, config, pendingTimers, processing, onSuccess, limitReached) {
  if (pendingTimers.has(filePath)) {
    clearTimeout(pendingTimers.get(filePath));
  }
  const timer = setTimeout(() => {
    pendingTimers.delete(filePath);
    processFile(filePath, config, processing, onSuccess, limitReached);
  }, DEBOUNCE_MS);
  pendingTimers.set(filePath, timer);
}

async function processFile(filePath, config, processing, onSuccess, limitReached) {
  if (processing.has(filePath)) return;
  if (limitReached()) return;
  processing.add(filePath);

  const rel = path.relative(config.vaultPath, filePath);
  console.log(`[${new Date().toISOString()}] Processing: ${rel}`);

  try {
    const analysis = await analyzeMarkdown(filePath, config);
    console.log(`  → Job: "${analysis.jobName}" | Model: ${analysis.modelId}`);
    console.log(`  → Prompt: ${analysis.imagePrompt.slice(0, 80)}...`);

    const localFilePath = await generateImage(analysis, config);
    console.log(`  → Generated: ${localFilePath}`);

    await writeImageToVault(localFilePath, filePath, analysis.jobName, config);
    console.log(`  → Image written to vault`);
    onSuccess();
  } catch (err) {
    console.error(`  ✗ Failed to process ${rel}:`, err.message);
  } finally {
    processing.delete(filePath);
  }
}

async function backfillVault(config, processing, onSuccess, limitReached) {
  const files = await collectUnprocessedFiles(config);
  if (files.length === 0) {
    console.log(`[backfill] No unprocessed markdown files found.`);
    return;
  }
  console.log(`[backfill] Found ${files.length} unprocessed file(s). Processing with concurrency=${BACKFILL_CONCURRENCY}.`);

  let index = 0;
  let active = 0;

  await new Promise((resolve) => {
    function next() {
      while (active < BACKFILL_CONCURRENCY && index < files.length && !limitReached()) {
        const filePath = files[index++];
        active++;
        processFile(filePath, config, processing, onSuccess, limitReached).finally(() => {
          active--;
          if (active === 0 && (index >= files.length || limitReached())) {
            resolve();
          } else {
            next();
          }
        });
      }
      if (active === 0) resolve();
    }
    next();
  });

  console.log(`[backfill] Complete.`);
}

async function collectUnprocessedFiles(config) {
  const results = [];
  await walkDir(config.vaultPath, config, results);
  return results;
}

async function walkDir(dir, config, results) {
  const attachmentsAbs = path.join(config.vaultPath, config.attachmentsDir);
  let entries;
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    if (entry.name.startsWith('.')) continue;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (fullPath === attachmentsAbs) continue;
      await walkDir(fullPath, config, results);
    } else if (entry.isFile() && entry.name.endsWith('.md')) {
      const hasImage = await hasGeneratedImage(fullPath, config);
      if (!hasImage) {
        results.push(fullPath);
      } else {
        const rel = path.relative(config.vaultPath, fullPath);
        console.log(`[backfill] Skipping (already has image): ${rel}`);
      }
    }
  }
}

async function hasGeneratedImage(filePath, config) {
  const attachmentsAbs = path.join(config.vaultPath, config.attachmentsDir);
  let content;
  try {
    content = await fs.readFile(filePath, 'utf-8');
  } catch {
    return false;
  }
  const linkRe = /!\[\[([^\]|#]+)/g;
  for (const [, name] of content.matchAll(linkRe)) {
    try {
      await fs.access(path.join(attachmentsAbs, name.trim()));
      return true;
    } catch {}
  }
  return false;
}

import { promises as fs } from 'fs';
import path from 'path';

function manifestPath(config) {
  return path.join(config.vaultPath, config.attachmentsDir, '.manifest.json');
}

export async function updateManifest(imageFilename, markdownFilePath, config) {
  const mPath = manifestPath(config);
  let manifest = {};
  try {
    manifest = JSON.parse(await fs.readFile(mPath, 'utf-8'));
  } catch {}

  const rel = path.relative(config.vaultPath, markdownFilePath);
  const parts = rel.split(path.sep);
  const basename = path.basename(rel, path.extname(rel));
  const title = basename.replace(/[-_]+/g, ' ').toLowerCase();
  const category = parts.length > 1 ? parts[0] : null;
  const subcategory = parts.length > 2 ? parts[1] : null;

  manifest[imageFilename] = { markdownPath: rel, title, category, subcategory };

  const tmp = mPath + '.tmp';
  await fs.writeFile(tmp, JSON.stringify(manifest, null, 2), 'utf-8');
  await fs.rename(tmp, mPath);
}

export async function buildShowcaseMd(config) {
  const mPath = manifestPath(config);
  let manifest = {};
  try {
    manifest = JSON.parse(await fs.readFile(mPath, 'utf-8'));
  } catch {
    return;
  }

  const attachmentsDir = path.join(config.vaultPath, config.attachmentsDir);

  const groups = new Map();
  for (const [imageFile, entry] of Object.entries(manifest)) {
    try {
      await fs.access(path.join(attachmentsDir, imageFile));
    } catch {
      continue;
    }
    const cat = entry.category || '(Uncategorized)';
    const sub = entry.subcategory || '';
    if (!groups.has(cat)) groups.set(cat, new Map());
    const subs = groups.get(cat);
    if (!subs.has(sub)) subs.set(sub, []);
    subs.get(sub).push({ imageFile, ...entry });
  }

  if (groups.size === 0) return;

  const sortedCats = [...groups.keys()].sort((a, b) => a.localeCompare(b));
  const totalCount = [...groups.values()].flatMap((s) => [...s.values()]).flat().length;

  const lines = [
    `# Showcase`,
    ``,
    `_${totalCount} article${totalCount !== 1 ? 's' : ''}_`,
    ``,
  ];

  for (const cat of sortedCats) {
    lines.push(`## ${cat}`, ``);
    const subs = groups.get(cat);
    const sortedSubs = [...subs.keys()].sort((a, b) => a.localeCompare(b));

    for (const sub of sortedSubs) {
      if (sub) lines.push(`### ${sub}`, ``);
      const entries = subs.get(sub).sort((a, b) => a.title.localeCompare(b.title));

      // HTML grid — Obsidian renders HTML in markdown reading view
      lines.push(`<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:1rem;margin-bottom:1.5rem">`);
      for (const { imageFile, markdownPath, title, category, subcategory } of entries) {
        const mdLink = markdownPath.replace(/\\/g, '/');
        const metaText = [category, subcategory].filter(Boolean).join(' › ');
        const displayTitle = title.replace(/\b\w/g, c => c.toUpperCase());
        lines.push(
          `<div style="background:#1a1d27;border:1px solid #2a2e42;border-radius:8px;overflow:hidden;padding:0.5rem">`,
          ``,
          `![[${imageFile}]]`,
          ``,
          `**[${escHtml(displayTitle)}](${mdLink})**`,
          ``,
          `<span style="font-size:0.8em;color:#8b90a8">${escHtml(metaText)}</span>`,
          ``,
          `</div>`,
        );
      }
      lines.push(`</div>`, ``);
    }
  }

  const mdPath = path.join(config.vaultPath, 'Showcase Summary.md');
  const tmp = mdPath + '.tmp';
  await fs.writeFile(tmp, lines.join('\n'), 'utf-8');
  await fs.rename(tmp, mdPath);
}

function escHtml(str) {
  return (str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
